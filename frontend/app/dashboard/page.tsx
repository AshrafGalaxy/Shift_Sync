"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, FileText, CheckCircle2, Clock, Users, Building, GraduationCap, Database, Loader2, RefreshCcw, AlertOctagon, Download, Settings, UploadCloud, FlaskConical, BookOpen, ChevronRight, BarChart3, AlertCircle, ScrollText, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/utils/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SolverLoadingGear } from "@/components/ui/svg-illustrations";

import RoomForm from "@/components/forms/RoomForm";
import FacultyForm from "@/components/forms/FacultyForm";
import InstitutionForm from "@/components/forms/InstitutionForm";
import WorkloadForm from "@/components/forms/WorkloadForm";
import CsvUploadManager from "@/components/forms/CsvUploadManager";
import SpreadsheetEditor from "@/components/SpreadsheetEditor";
import TemplateManager from "@/components/TemplateManager";
import { ConflictRefinerModal } from "@/components/ConflictRefinerModal";
import SolverConsoleModal from "@/components/SolverConsoleModal";

export default function DashboardOverview() {
    const [isMounted, setIsMounted] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSolverModalOpen, setIsSolverModalOpen] = useState(false);
    const [readiness, setReadiness] = useState<{ready: boolean, score: number, critical: any[], warnings: any[], total_issues: number} | null>(null);
    const [currentPayload, setCurrentPayload] = useState<any>(null);
    const [generationStep, setGenerationStep] = useState(0);
    const [isDbReady, setIsDbReady] = useState<boolean>(false);
    const [lastRunLogs, setLastRunLogs] = useState<string[]>([]);
    const [lastRunScore, setLastRunScore] = useState<number | null>(null);
    const [showAllLogs, setShowAllLogs] = useState(false);
    const [liveLogs, setLiveLogs] = useState<string[]>([]);
    const [isLiveStreaming, setIsLiveStreaming] = useState(false);
    const liveLogsEndRef = useRef<HTMLDivElement | null>(null);

    const [stats, setStats] = useState<{ name: string; value: number | string; icon: any; color: string; bg: string; sub?: string }[]>([
        { name: "Total Faculty", value: 0 as number | string, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
        { name: "Available Rooms", value: 0 as number | string, icon: Building, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
        { name: "Total Workloads", value: 0 as number | string, icon: GraduationCap, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-500/10" },
        { name: "Grid Heatmap (Load)", value: "0%", icon: Database, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    ]);
    const [lastGenerationDate, setLastGenerationDate] = useState<string | null>(null);
    const [lastGenSummary, setLastGenSummary] = useState<{score:number|null; slots:number; status:string; date:string} | null>(null);
    const [conflictDiagnosis, setConflictDiagnosis] = useState<any>(null);
    const [instId, setInstId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("global");

    const router = useRouter();

    const supabase = createClient();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    
    const buildDynamicPayload = async (instId: string) => {
        const { data: inst } = await supabase.from("institutions").select("*").eq("id", instId).single();
        const { data: rooms } = await supabase.from("rooms").select("*").eq("institution_id", instId).eq("is_archived", false);
        const { data: facSettings } = await supabase.from("faculty_settings").select("*").eq("institution_id", instId).eq("is_archived", false);
        
        if (!facSettings || facSettings.length === 0) return null;

        const mappedFaculties = await Promise.all(facSettings.map(async (facSetting) => {
            const { data: workloads } = await supabase.from("workloads").select("*").eq("faculty_id", facSetting.id);
            const realName = facSetting.name || facSetting.faculty_csv_id || `Faculty ${facSetting.id.slice(0, 8)}`;
            return {
                id: facSetting.id,
                name: realName,
                shift: (!facSetting.shift_hours || facSetting.shift_hours.length === 0) ? (inst?.time_slots || []) : facSetting.shift_hours,
                max_load_hrs: facSetting.max_load_hrs,
                max_continuous_hrs: facSetting.max_continuous_hrs || 3,
                blocked_slots: (facSetting.blocked_slots || []).filter((s: any) => s.day && s.time !== undefined),
                class_teacher_for: facSetting.class_teacher_for,
                workload: (workloads || []).map(w => ({
                    id: w.id,
                    type: w.type || "Theory",
                    subject: w.subject_code || "Unknown Subject",
                    target_groups: Array.isArray(w.target_groups) ? w.target_groups : [],
                    hours: w.weekly_hours || 1,
                    consecutive_hours: w.consecutive_hours || 1,
                    required_tags: Array.isArray(w.required_tags) ? w.required_tags : [],
                    is_online: w.is_online || false
                }))
            };
        }));

        let customRules: any[] = [];
        const storedPins = localStorage.getItem(`pinned_classes_${instId}`);
        if (storedPins) {
            try {
                const pins = JSON.parse(storedPins);
                customRules = pins.map((pin: string, index: number) => {
                    const parts = pin.split("|");
                    const w_id = parts[0];
                    return {
                        id: `PIN_${index}`,
                        condition_field: "workload_id",
                        condition_operator: "EQUALS",
                        condition_value: w_id,
                        action_type: "FORCE_PIN",
                        action_value: `${parts[1]}|${parts[2]}|${parts[3]}`
                    };
                });
            } catch (e) {}
        }

        const lunchMap: Record<string, number> = {};
        const rawLunch = inst?.lunch_slot;
        if (rawLunch && typeof rawLunch === 'object' && !Array.isArray(rawLunch)) {
            Object.assign(lunchMap, rawLunch);
        } else {
            const lunchHour = typeof rawLunch === 'number' ? rawLunch : 13;
            (inst?.days_active || []).forEach((day: string) => { lunchMap[day] = lunchHour; });
        }
        (inst?.days_active || []).forEach((day: string) => {
            if (!(day in lunchMap)) lunchMap[day] = 13;
        });

        return {
            college_settings: {
                days_active: inst?.days_active || [],
                time_slots: inst?.time_slots || [],
                lunch_slot: lunchMap,
                custom_rules: customRules
            },
            rooms_config: {
                rooms: rooms?.map(r => ({ id: r.name, type: r.type, capacity: r.capacity, tags: r.tags })) || []
            },
            faculty: mappedFaculties
        };
    };

    const fetchReadiness = async (instId: string) => {
        try {
            const payload = await buildDynamicPayload(instId);
            if (!payload) return;
            setCurrentPayload(payload);
            const res = await fetch("/api/readiness", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                setReadiness(data);
            }
        } catch (e) {
            console.error("Failed to fetch readiness", e);
        }
    };

    const fetchDashboardStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
            if (!profile?.institution_id) return;

            const instId = profile.institution_id;
            if (profile?.institution_id) setInstId(profile.institution_id);

            // Fetch data for capacity heatmap density calculation
            const { data: inst } = await supabase.from("institutions").select("days_active, time_slots").eq("id", instId).single();
            const { count: facultyCount } = await supabase.from("faculty_settings").select("*", { count: "exact", head: true }).eq("institution_id", instId);
            const { data: rooms } = await supabase.from("rooms").select("id").eq("institution_id", instId);
            const { data: workloads } = await supabase.from("workloads").select("weekly_hours").eq("institution_id", instId);

            const roomCount = rooms?.length || 0;
            const workloadsCount = workloads?.length || 0;

            const totalCapacity = (inst?.days_active?.length || 0) * (inst?.time_slots?.length || 0) * roomCount;
            const totalDemand = workloads?.reduce((acc, w) => acc + (w.weekly_hours || 0), 0) || 0;
            const densityRatio = totalCapacity > 0 ? Math.round((totalDemand / totalCapacity) * 100) : 0;

            // Determine density card color
            let densityColor = "text-emerald-500";
            let densityBg = "bg-emerald-50 dark:bg-emerald-500/10";
            let densityAlert = "";
            if (densityRatio > 85) { densityColor = "text-amber-500"; densityBg = "bg-amber-50 dark:bg-amber-500/10"; }
            if (densityRatio > 100) { densityColor = "text-red-500"; densityBg = "bg-red-50 dark:bg-red-500/10"; densityAlert = " âš ï¸"; }

            // Get last generation metadata
            const { data: latestTs } = await supabase
                .from("generated_timetables")
                .select("created_at, status, matrix_data")
                .eq("institution_id", instId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (latestTs) {
                const schedule = Array.isArray(latestTs.matrix_data)
                    ? latestTs.matrix_data
                    : (latestTs.matrix_data?.schedule ?? []);
                setLastGenSummary({
                    score: latestTs.matrix_data?.optimality_score ?? null,
                    slots: schedule.length,
                    status: latestTs.status,
                    date: new Date(latestTs.created_at).toLocaleString(),
                });
            }

            setIsDbReady((facultyCount ?? 0) > 0 && roomCount > 0);
            if ((facultyCount ?? 0) > 0 && roomCount > 0) fetchReadiness(instId);

            setStats([
                { name: "Total Faculty", value: facultyCount || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                { name: "Available Rooms", value: roomCount || 0, icon: Building, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
                { name: "Weekly Demand", value: `${totalDemand} hrs`, sub: `${workloadsCount} workload${workloadsCount !== 1 ? 's' : ''} configured`, icon: GraduationCap, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-500/10" },
                { name: "Grid Heatmap (Load)", value: `${densityRatio}%${densityAlert}`, icon: Database, color: densityColor, bg: densityBg },
            ]);

            if (latestTs) {
                const date = new Date(latestTs.created_at);
                setLastGenerationDate(date.toLocaleString());
            }

        } catch (err) {
            console.error("Failed to load stats", err);
        }
    };

    useEffect(() => {
        fetchDashboardStats();
    }, []);


    // ── Demo Presets ──────────────────────────────────────────────────────────
    const DEMO_PRESETS = [
        {
            label: "[A] Perfect Fit — CS Dept, 100% solvable",
            description: "5 faculty · 5 rooms · 2 divisions · all constraints satisfiable. Generates a clean timetable with optimality score ≥ 85. Use to demo the full timetable grid, Google Calendar export, and faculty substitution flow.",
            json: {
                college_settings: { days_active: ["Mon","Tue","Wed","Thu","Fri"], time_slots: [8,9,10,11,12,13,14,15,16], lunch_slot: {"Mon":13,"Tue":13,"Wed":13,"Thu":13,"Fri":13}, max_continuous_lectures: 3, custom_rules: [] },
                rooms_config: { rooms: [
                    {id:"D201",type:"theory",capacity:80,tags:[]},
                    {id:"D205",type:"theory",capacity:80,tags:[]},
                    {id:"D207",type:"theory",capacity:80,tags:[]},
                    {id:"Lab1",type:"practical",capacity:40,tags:["Computer_Lab"]},
                    {id:"Lab2",type:"practical",capacity:40,tags:["Computer_Lab"]}
                ]},
                faculty: [
                    { id:"F001", name:"Dr. Mehra", shift:[8,9,10,11,12,13,14,15,16], max_load_hrs:14, max_continuous_hrs:3, blocked_slots:[], class_teacher_for:"SY-A",
                      workload:[ {id:"W1",type:"Theory",subject:"Data Structures",target_groups:["SY-A"],hours:4,consecutive_hours:1,required_tags:[],is_online:false}, {id:"W2",type:"Theory",subject:"Data Structures",target_groups:["SY-B"],hours:4,consecutive_hours:1,required_tags:[],is_online:false} ] },
                    { id:"F002", name:"Prof. Khan", shift:[8,9,10,11,12,13,14,15,16], max_load_hrs:16, max_continuous_hrs:3, blocked_slots:[], class_teacher_for:"SY-B",
                      workload:[ {id:"W3",type:"Theory",subject:"DBMS",target_groups:["SY-A"],hours:3,consecutive_hours:1,required_tags:[],is_online:false}, {id:"W4",type:"Theory",subject:"DBMS",target_groups:["SY-B"],hours:3,consecutive_hours:1,required_tags:[],is_online:false} ] },
                    { id:"F003", name:"Dr. Patel", shift:[8,9,10,11,12,13,14,15,16], max_load_hrs:14, max_continuous_hrs:3, blocked_slots:[], class_teacher_for:"",
                      workload:[ {id:"W5",type:"Practical",subject:"CS Lab",target_groups:["SY-A"],hours:4,consecutive_hours:2,required_tags:["Computer_Lab"],is_online:false}, {id:"W6",type:"Practical",subject:"CS Lab",target_groups:["SY-B"],hours:4,consecutive_hours:2,required_tags:["Computer_Lab"],is_online:false} ] },
                    { id:"F004", name:"Dr. Sharma", shift:[9,10,11,12,13,14,15,16], max_load_hrs:12, max_continuous_hrs:2, blocked_slots:[{day:"Wed",time:9},{day:"Wed",time:10}], class_teacher_for:"",
                      workload:[ {id:"W7",type:"Theory",subject:"OS Concepts",target_groups:["SY-A"],hours:3,consecutive_hours:1,required_tags:[],is_online:false}, {id:"W8",type:"Theory",subject:"OS Concepts",target_groups:["SY-B"],hours:3,consecutive_hours:1,required_tags:[],is_online:false} ] },
                    { id:"F005", name:"Ms. Verma", shift:[8,9,10,11,12,13,14], max_load_hrs:10, max_continuous_hrs:2, blocked_slots:[], class_teacher_for:"",
                       workload:[ {id:"W9",type:"Theory",subject:"Math-III",target_groups:["SY-A"],hours:3,consecutive_hours:1,required_tags:[],is_online:false}, {id:"W10",type:"Theory",subject:"Math-III",target_groups:["SY-B"],hours:3,consecutive_hours:1,required_tags:[],is_online:false} ] }
                ]
            }
        },
        {
            label: "[B] Overflow — Ghost-Room, missing lab type",
            description: "5 faculty · 3 lab workloads require 'Dual_Screen' tag · NO room has that tag → solver assigns them to GHOST_ROOM (TBD) → 'success_with_overflow'. Yellow overflow banner appears on the timetable showing slots needing manual room assignment.",
            json: {
                college_settings: { days_active: ["Mon","Tue","Wed","Thu","Fri"], time_slots: [8,9,10,11,12,13,14,15,16], lunch_slot: {"Mon":13,"Tue":13,"Wed":13,"Thu":13,"Fri":13}, max_continuous_lectures: 3, custom_rules: [] },
                rooms_config: { rooms: [
                    {id:"A101",type:"theory",capacity:80,tags:[]},
                    {id:"A102",type:"theory",capacity:80,tags:[]},
                    {id:"LabX",type:"practical",capacity:30,tags:["Computer_Lab"]}
                ]},
                faculty: [
                    { id:"F001", name:"Dr. Mehra", shift:[8,9,10,11,12,13,14,15,16], max_load_hrs:16, max_continuous_hrs:3, blocked_slots:[], class_teacher_for:"TY-A",
                      workload:[
                        {id:"W1",type:"Theory",subject:"Networks",target_groups:["TY-A"],hours:4,consecutive_hours:1,required_tags:[],is_online:false},
                        {id:"W2",type:"Theory",subject:"Networks",target_groups:["TY-B"],hours:4,consecutive_hours:1,required_tags:[],is_online:false},
                        {id:"W3",type:"Practical",subject:"Networks Lab (Overflow)",target_groups:["TY-A"],hours:4,consecutive_hours:2,required_tags:["Dual_Screen"],is_online:false}
                      ] },
                    { id:"F002", name:"Prof. Khan", shift:[8,9,10,11,12,13,14,15,16], max_load_hrs:16, max_continuous_hrs:3, blocked_slots:[], class_teacher_for:"TY-B",
                      workload:[
                        {id:"W4",type:"Theory",subject:"Algorithms",target_groups:["TY-A"],hours:3,consecutive_hours:1,required_tags:[],is_online:false},
                        {id:"W5",type:"Theory",subject:"Algorithms",target_groups:["TY-B"],hours:3,consecutive_hours:1,required_tags:[],is_online:false},
                        {id:"W6",type:"Practical",subject:"Algo Lab (Overflow)",target_groups:["TY-B"],hours:4,consecutive_hours:2,required_tags:["Dual_Screen"],is_online:false}
                      ] },
                    { id:"F003", name:"Dr. Patel", shift:[8,9,10,11,12,13,14,15,16], max_load_hrs:14, max_continuous_hrs:3, blocked_slots:[], class_teacher_for:"",
                      workload:[
                        {id:"W7",type:"Practical",subject:"CS Lab",target_groups:["TY-A"],hours:4,consecutive_hours:2,required_tags:["Computer_Lab"],is_online:false},
                        {id:"W8",type:"Practical",subject:"Project Lab (Overflow)",target_groups:["TY-B"],hours:4,consecutive_hours:2,required_tags:["Dual_Screen"],is_online:false}
                      ] },
                    { id:"F004", name:"Dr. Sharma", shift:[8,9,10,11,12,13,14,15,16], max_load_hrs:12, max_continuous_hrs:2, blocked_slots:[], class_teacher_for:"",
                      workload:[{id:"W9",type:"Theory",subject:"OS Concepts",target_groups:["TY-A","TY-B"],hours:3,consecutive_hours:1,required_tags:[],is_online:false}] },
                    { id:"F005", name:"Ms. Verma", shift:[8,9,10,11,12,13,14], max_load_hrs:10, max_continuous_hrs:2, blocked_slots:[], class_teacher_for:"",
                      workload:[{id:"W10",type:"Theory",subject:"Math-III",target_groups:["TY-A","TY-B"],hours:3,consecutive_hours:1,required_tags:[],is_online:false}] }
                ]
            }
        },

        {
            label: "[C] Infeasible — Conflict Diagnosis Demo",
            description: "1 faculty · 16 hours of workload · only 20 available slots · mathematically impossible. Solver returns INFEASIBLE → ConflictRefinerModal opens with human-readable bottleneck analysis.",
            json: {
                college_settings: { days_active: ["Mon","Tue","Wed","Thu","Fri"], time_slots: [8,9,10,11,12], lunch_slot: {"Mon":12,"Tue":12,"Wed":12,"Thu":12,"Fri":12}, max_continuous_lectures: 2, custom_rules: [] },
                rooms_config: { rooms: [
                    {id:"R1",type:"theory",capacity:60,tags:[]}
                ]},
                faculty: [
                    { id:"F001", name:"Dr. Overloaded", shift:[8,9,10,11], max_load_hrs:8, max_continuous_hrs:2, blocked_slots:[{day:"Mon",time:8},{day:"Mon",time:9},{day:"Tue",time:8},{day:"Tue",time:9},{day:"Wed",time:8}], class_teacher_for:"FY-A",
                      workload:[
                        {id:"W1",type:"Theory",subject:"Subject-A",target_groups:["FY-A"],hours:4,consecutive_hours:1,required_tags:[],is_online:false},
                        {id:"W2",type:"Theory",subject:"Subject-B",target_groups:["FY-A"],hours:4,consecutive_hours:1,required_tags:[],is_online:false},
                        {id:"W3",type:"Theory",subject:"Subject-C",target_groups:["FY-A"],hours:4,consecutive_hours:1,required_tags:[],is_online:false},
                        {id:"W4",type:"Theory",subject:"Subject-D",target_groups:["FY-A"],hours:4,consecutive_hours:1,required_tags:[],is_online:false}
                      ] }
                ]
            }
        }
    ];
    const [selectedPreset, setSelectedPreset] = useState(0);
    const [jsonPayload, setJsonPayload] = useState(JSON.stringify(DEMO_PRESETS[0].json, null, 2));


    // JSON parsing bypass code left unchanged below 
    const [isSeeding, setIsSeeding] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const exportTemplate = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
            const exportInstId = profile?.institution_id;
            if (!exportInstId) throw new Error("No institution found.");
            const { data: inst } = await supabase.from("institutions").select("*").eq("id", exportInstId).single();
            const { data: rooms } = await supabase.from("rooms").select("*").eq("institution_id", exportInstId);
            const lunchMap: Record<string, number> = {};
            (inst?.days_active || []).forEach((d: string) => { lunchMap[d] = inst?.lunch_slot ?? 13; });
            const dynamicPayload = {
                college_settings: { days_active: inst?.days_active, time_slots: inst?.time_slots, lunch_slot: lunchMap, custom_rules: [] },
                rooms_config: { rooms: rooms?.map(r => ({ id: r.name, type: r.type, capacity: r.capacity, tags: r.tags })) || [] },
                faculty: []
            };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dynamicPayload, null, 2));
            const a = document.createElement('a');
            a.setAttribute("href", dataStr);
            a.setAttribute("download", `ShiftSync_Template_${new Date().toISOString().split('T')[0]}.json`);
            a.click();
        } catch (error: any) {
            toast.error(error.message || "Export failed.");
        }
    };

    const clearDatabase = async () => {
        setIsClearing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Authentication missing. Please log in.");

            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
            const instId = profile?.institution_id;

            if (instId) {
                // Delete all rooms for this institution
                await supabase.from("rooms").delete().eq("institution_id", instId);
                // Delete all workloads for this institution
                await supabase.from("workloads").delete().eq("institution_id", instId);
                // Delete all faculty for this institution (covers CSV-imported faculty with no profile_id)
                await supabase.from("faculty_settings").delete().eq("institution_id", instId);
            }

            toast.success("Database cleared successfully", { description: "All testing records have been erased." });
            fetchDashboardStats(); // Soft refresh instead of hard reload
        } catch (err: any) {
            console.error("Clearing Error:", err);
            toast.error("Clearing failed", { description: err.message || "Unknown error" });
        }
        setIsClearing(false);
    };

    const seedDatabase = async () => {
        setIsSeeding(true);
        try {
            const payload = JSON.parse(jsonPayload);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Authentication missing. Please log in.");

            const profileId = user.id;
            const { data: profile } = await supabase.from("profiles").select("id, institution_id").eq("id", profileId).maybeSingle();
            let instId = profile?.institution_id;

            // 1. Institutions (Upsert)
            if (instId) {
                await supabase.from("institutions").update({
                    name: "ShiftSync Demo College",
                    days_active: payload.college_settings.days_active,
                    time_slots: payload.college_settings.time_slots,
                    lunch_slot: payload.college_settings.lunch_slot,
                    max_continuous_lectures: payload.college_settings.max_continuous_lectures
                }).eq("id", instId);
            } else {
                const { data: instData, error: instErr } = await supabase
                    .from("institutions")
                    .insert({
                        name: "ShiftSync Demo College",
                        days_active: payload.college_settings.days_active,
                        time_slots: payload.college_settings.time_slots,
                        lunch_slot: payload.college_settings.lunch_slot,
                        max_continuous_lectures: payload.college_settings.max_continuous_lectures
                    })
                    .select().single();
                if (instErr) throw instErr;
                instId = instData.id;
            }

            // Heal missing profile
            if (!profile) {
                await supabase.from("profiles").insert({
                    id: profileId,
                    full_name: "ShiftSync Admin",
                    role: "admin",
                    institution_id: instId
                });
            } else if (profile.institution_id !== instId) {
                await supabase.from("profiles").update({ institution_id: instId }).eq("id", profileId);
            }

            // 2. Rooms
            for (const r of payload.rooms_config.rooms) {
                await supabase.from("rooms").insert({
                    institution_id: instId,
                    name: r.id,
                    type: r.type,
                    capacity: r.capacity,
                    tags: r.tags
                });
            }

            // 3. Faculty Settings
            for (const f of payload.faculty) {
                const { data: facData, error: facErr } = await supabase
                    .from("faculty_settings")
                    .insert({
                        institution_id: instId,
                        profile_id: profileId,
                        name: f.name || `Faculty ${f.id}`,
                        max_load_hrs: f.max_load_hrs,
                        max_continuous_hrs: f.max_continuous_hrs || 3,
                        shift_hours: f.shift,
                        blocked_slots: f.blocked_slots,
                        class_teacher_for: f.class_teacher_for
                    })
                    .select().single();
                if (facErr) throw facErr;
                const facId = facData.id;

                // 4. Workloads
                for (const w of f.workload) {
                    await supabase.from("workloads").insert({
                        institution_id: instId,
                        faculty_id: facId,
                        subject_code: w.subject,
                        type: w.type,
                        target_groups: w.target_groups,
                        weekly_hours: w.hours,
                        consecutive_hours: w.consecutive_hours,
                        required_tags: w.required_tags,
                        is_online: w.is_online || false
                    });
                }
            }



            toast.success("Data seeded successfully", { description: "The SQL tables are now populated." });
            fetchDashboardStats();

        } catch (err: any) {
            console.error("Seeding Error:", err);
            toast.error("Seeding failed", { description: err.message || "Unknown error" });
        }
        setIsSeeding(false);
    };

    const startGeneration = async () => {
        if (!isDbReady) {
            toast.error("Cannot generate timetable", { description: "Your database is empty! Add at least 1 Room and 1 Faculty member to continue." });
            return;
        }
        // Warn but do NOT block â€” ghost-room layer will handle overflows
        if (readiness && !readiness.ready && readiness.critical?.length > 0) {
            toast.warning("Generating with issues detected", {
                description: `${readiness.critical.length} critical constraint(s) found. Ghost-room fallback will handle unresolvable slots. Review after generation.`,
                duration: 6000,
            });
        }
        setLiveLogs([]);
        setIsLiveStreaming(true);
        setIsSolverModalOpen(true);
    };

    if (!isMounted) {
        return (
            <div className="w-full h-[60vh] flex items-center justify-center">
                <div className="text-slate-400 font-medium">Checking live Database state...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Overview</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage institutional data and trigger timetable generation.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={exportTemplate}
                        variant="outline"
                        size="sm"
                        className="h-9 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border-slate-200 dark:border-slate-800"
                    >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Export JSON
                    </Button>
                    <Button
                        onClick={clearDatabase}
                        disabled={isSeeding || isClearing}
                        variant="outline"
                        size="sm"
                        className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/30"
                    >
                        {isClearing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <AlertOctagon className="w-3.5 h-3.5 mr-1.5" />}
                        {isClearing ? "Clearing..." : "Nuke Database"}
                    </Button>
                </div>
            </div>

            {/* â”€â”€ Last-Generation Summary Strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {lastGenSummary && (
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    {/* Status badge */}
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                        lastGenSummary.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : lastGenSummary.status === 'success_with_overflow' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                        <span className="flex items-center gap-1">
                            {lastGenSummary.status === 'success'
                                ? <><CheckCircle2 className="w-3 h-3" /> Success</>
                                : lastGenSummary.status === 'success_with_overflow'
                                ? <><AlertTriangle className="w-3 h-3" /> Overflow</>
                                : <><XCircle className="w-3 h-3" /> Failed</>}
                        </span>
                    </span>
                    {/* Score mini-bar */}
                    {lastGenSummary.score != null && (
                        <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${
                                        lastGenSummary.score >= 90 ? 'bg-emerald-500' : lastGenSummary.score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${lastGenSummary.score}%` }}
                                />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{lastGenSummary.score}/100</span>
                        </div>
                    )}
                    <span className="text-xs text-slate-500">{lastGenSummary.slots} slots scheduled</span>
                    <span className="text-xs text-slate-400 ml-auto">{lastGenSummary.date}</span>
                    <button onClick={() => router.push('/dashboard/history')} className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline shrink-0">View History â†’</button>
                </div>
            )}

            {/* â”€â”€ AI Solver Engine Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800/40">
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/6 to-transparent blur-[80px] rounded-full pointer-events-none" />

                <CardHeader className="pb-4">
                    {/* Title row with inline refresh */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-500/30">
                                    <BarChart3 className="w-4 h-4 text-white" />
                                </div>
                                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-pulse" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold leading-tight">AI Solver Engine</CardTitle>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Generate a collision-free timetable conforming to all constraints</p>
                            </div>
                        </div>
                        {/* Small icon-only refresh button */}
                        <button
                            onClick={fetchDashboardStats}
                            title="Re-run pre-flight checks"
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-sm shrink-0"
                        >
                            <RefreshCcw className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Pre-flight readiness panel */}
                    <div className="mt-4">
                        {readiness ? (
                            <div className={`rounded-xl border p-3.5 ${
                                readiness.ready
                                    ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/40'
                                    : 'bg-red-50/80 border-red-200 dark:bg-red-900/10 dark:border-red-800/40'
                            }`}>
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                        readiness.ready
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                    }`}>
                                        {readiness.ready
                                            ? <CheckCircle2 className="w-4 h-4" />
                                            : <AlertCircle className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${
                                            readiness.ready ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'
                                        }`}>
                                            {readiness.ready ? 'Pre-Flight Checks Passed' : `${readiness.total_issues} issue(s) detected`}
                                        </p>
                                        {/* Score bar */}
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${
                                                        readiness.score >= 90 ? 'bg-emerald-500' :
                                                        readiness.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${readiness.score}%` }}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-bold shrink-0 ${
                                                readiness.score >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                                                readiness.score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                                            }`}>{readiness.score}/100</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Issues list â€” wraps on mobile */}
                                {!readiness.ready && readiness.critical && readiness.critical.length > 0 && (
                                    <div className="mt-3 space-y-1.5">
                                        {readiness.critical.map((iss: any, i: number) => (
                                            <div key={i} className="bg-white dark:bg-slate-800/80 rounded-lg border border-red-100 dark:border-red-900/30 p-2.5">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 flex-1 min-w-0">
                                                        <span className="font-bold text-red-600 dark:text-red-400 mr-1">[{iss.constraint}]</span>
                                                        {iss.message}
                                                    </p>
                                                    {iss.tab_hint && (
                                                        <button
                                                            className="shrink-0 text-[11px] font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md px-2 py-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1"
                                                            onClick={() => {
                                                                const m: Record<string, string> = { rooms: "rooms", faculty: "faculty", workloads: "workloads", global: "global" };
                                                                if (m[iss.tab_hint]) {
                                                                    setActiveTab(m[iss.tab_hint]);
                                                                    document.getElementById("data-ingestion-card")?.scrollIntoView({ behavior: "smooth" });
                                                                } else router.push("/dashboard/manage");
                                                            }}
                                                        >
                                                            Fix <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800/50 flex items-center gap-2.5">
                                <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin shrink-0" />
                                <span className="text-sm text-slate-500">Running pre-flight diagnostics...</span>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="pt-0 pb-5 px-6">
                    <AnimatePresence mode="wait">
                        {!isGenerating ? (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="space-y-3"
                            >
                                {/* Premium centered CTA â€” not full-width */}
                                <div className="flex justify-center py-1">
                                    <Button
                                        onClick={startGeneration}
                                        className={`relative h-11 px-8 rounded-full text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] overflow-hidden ${
                                            isDbReady
                                                ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/40 hover:shadow-violet-500/60 hover:shadow-xl"
                                                : "bg-slate-400 dark:bg-slate-700 shadow-none cursor-not-allowed"
                                        }`}
                                    >
                                        {isDbReady && (
                                            <>
                                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer pointer-events-none" />
                                                <span className="absolute inset-0 rounded-full ring-1 ring-white/20 pointer-events-none" />
                                            </>
                                        )}
                                        <Play className={`w-4 h-4 mr-2 shrink-0 relative z-10 ${isDbReady ? "fill-white/30" : "fill-white/10"}`} />
                                        <span className="relative z-10 tracking-wide">{isDbReady ? "Generate Timetable" : "Setup Required"}</span>
                                    </Button>
                                </div>

                                {/* Smart Suggestions â€” from readiness data */}
                                {readiness && readiness.warnings && readiness.warnings.length > 0 && (
                                    <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/10 overflow-hidden">
                                        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-amber-200/60 dark:border-amber-800/30">
                                            <span>ðŸ’¡</span>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Smart Suggestions</p>
                                            <span className="ml-auto text-[10px] font-semibold text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full">{readiness.warnings.length}</span>
                                        </div>
                                        <div className="divide-y divide-amber-100 dark:divide-amber-800/20">
                                            {readiness.warnings.slice(0, 4).map((w: any, i: number) => (
                                                <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                                                    <span className="shrink-0 mt-0.5 text-amber-500">â€º</span>
                                                    <span className="flex-1">{w.message ?? JSON.stringify(w)}</span>
                                                    {w.tab_hint && (
                                                        <button
                                                            onClick={() => {
                                                                const m: Record<string,string> = { rooms: "rooms", faculty: "faculty", workloads: "workloads", global: "global" };
                                                                if (m[w.tab_hint]) { setActiveTab(m[w.tab_hint]); document.getElementById("data-ingestion-card")?.scrollIntoView({ behavior: "smooth" }); }
                                                                else router.push("/dashboard/manage");
                                                            }}
                                                            className="shrink-0 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded px-1.5 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-0.5"
                                                        >
                                                            Fix <ChevronRight className="w-2.5 h-2.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-amber-600 dark:text-amber-500 px-3 py-1.5 border-t border-amber-200/60 dark:border-amber-800/30">Ghost-room fallback handles unresolvable slots automatically.</p>
                                    </div>
                                )}

                                {/* Compact hint row */}
                                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 px-0.5">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        Solving time varies with dataset size
                                    </span>
                                    <span className="text-blue-500 dark:text-blue-400 font-medium">Pinned slots stay fixed on shuffle</span>
                                </div>

                                {/* â”€â”€ Inline Live / Last Log Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                                {(isLiveStreaming || lastRunLogs.length > 0) && (
                                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                                        {/* panel header */}
                                        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-red-500/70" />
                                                    <div className="w-2 h-2 rounded-full bg-amber-500/70" />
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                                                    {isLiveStreaming ? "Live Engine Feed" : "Last Engine Trace"}
                                                </span>
                                                {isLiveStreaming && (
                                                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        SOLVING
                                                    </span>
                                                )}
                                                {!isLiveStreaming && lastRunScore !== null && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                        lastRunScore >= 90 ? 'bg-emerald-900/50 text-emerald-400' :
                                                        lastRunScore >= 70 ? 'bg-amber-900/50 text-amber-400' :
                                                        'bg-red-900/50 text-red-400'
                                                    }`}>Score {lastRunScore}/100</span>
                                                )}
                                            </div>
                                            {!isLiveStreaming && (
                                                <span className="text-[10px] text-slate-600 font-mono">{lastGenerationDate}</span>
                                            )}
                                        </div>

                                        {/* log lines */}
                                        <div className="p-3 font-mono text-[11px] text-slate-400 space-y-0.5 max-h-36 overflow-y-auto custom-scrollbar">
                                            {(isLiveStreaming ? liveLogs : (showAllLogs ? lastRunLogs : lastRunLogs.slice(-5))).map((line, i) => (
                                                <div key={i} className={`leading-relaxed ${
                                                    line.includes('[ERROR]') || line.includes('FATAL') ? 'text-red-400' :
                                                    line.includes('[SUCCESS]') || line.includes('OPTIMAL') ? 'text-emerald-400' :
                                                    line.includes('[STEP') ? 'text-violet-400 font-semibold' :
                                                    'text-slate-400'
                                                }`}>{line}</div>
                                            ))}
                                            <div ref={liveLogsEndRef} />
                                        </div>

                                        {/* show-all toggle (only for last run, not live) */}
                                        {!isLiveStreaming && lastRunLogs.length > 5 && (
                                            <button
                                                onClick={() => setShowAllLogs(p => !p)}
                                                className="w-full py-1.5 text-[10px] font-mono text-slate-600 hover:text-slate-400 hover:bg-slate-900/60 transition-colors border-t border-slate-800"
                                            >
                                                {showAllLogs ? 'â–² Collapse' : `â–¼ Show all ${lastRunLogs.length} lines`}
                                            </button>
                                        )}

                                        {/* View in History shortcut */}
                                        {!isLiveStreaming && lastRunLogs.length > 0 && (
                                            <button
                                                onClick={() => router.push('/dashboard/history')}
                                                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-mono text-violet-500 hover:text-violet-400 hover:bg-violet-950/30 transition-colors border-t border-slate-800"
                                            >
                                                <ScrollText className="w-3 h-3" />
                                                View Full Logs in Generation History
                                                <ChevronRight className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="generating"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-5 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30"
                            >
                                <div className="relative w-16 h-16 flex justify-center items-center shrink-0">
                                    {generationStep < 3 ? (
                                        <SolverLoadingGear className="w-full h-full drop-shadow-lg" />
                                    ) : (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="w-14 h-14 bg-teal-500 rounded-full flex justify-center items-center shadow-lg shadow-teal-500/30"
                                        >
                                            <CheckCircle2 className="w-7 h-7 text-white" />
                                        </motion.div>
                                    )}
                                </div>
                                <div className="space-y-2 flex-1 min-w-0">
                                    <h3 className="font-semibold text-base text-slate-900 dark:text-slate-50">
                                        {generationStep === 0 && "Validating Geometry..."}
                                        {generationStep === 1 && "Booting Engine..."}
                                        {generationStep === 2 && "Synthesizing Timetable..."}
                                        {generationStep === 3 && "Finalizing Matrix..."}
                                        {generationStep === 4 && "Synchronization Complete!"}
                                    </h3>
                                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                        <motion.div
                                            className={`h-full ${generationStep >= 3 ? "bg-teal-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`}
                                            initial={{ width: "0%" }}
                                            animate={{ width: ["10%","40%","70%","90%","100%"][generationStep] ?? "100%" }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono truncate">
                                        {generationStep === 0 && "> Validating workloads & constraints..."}
                                        {generationStep === 1 && "> Initializing CP-SAT Solver..."}
                                        {generationStep === 2 && "> Resolving room/teacher conflicts..."}
                                        {generationStep === 3 && "> Distributing lunch breaks & gaps..."}
                                        {generationStep >= 4 && "> Saving to database..."}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>

            </Card>

            {/* â”€â”€ KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => {
                    const numVal = typeof stat.value === 'number' ? stat.value : parseFloat(String(stat.value));
                    const isPercent = String(stat.value).includes('%');
                    const status: { label: string; color: string } =
                        isPercent
                            ? numVal > 100
                                ? { label: "Over capacity", color: "text-red-500" }
                                : numVal > 85
                                    ? { label: "High load", color: "text-amber-500" }
                                    : { label: "Healthy", color: "text-emerald-500" }
                            : numVal === 0
                                ? { label: "Not configured", color: "text-amber-500" }
                                : { label: "Configured", color: "text-emerald-500" };

                    // left-border color per card
                    const borderColor =
                        stat.color.includes('blue') ? 'border-l-blue-500'
                        : stat.color.includes('purple') ? 'border-l-purple-500'
                        : stat.color.includes('teal') ? 'border-l-teal-500'
                        : stat.color.includes('emerald') ? 'border-l-emerald-500'
                        : stat.color.includes('amber') ? 'border-l-amber-500'
                        : 'border-l-red-500';

                    const gradientFrom =
                        stat.color.includes('blue') ? 'from-blue-50/70 dark:from-blue-900/10'
                        : stat.color.includes('purple') ? 'from-purple-50/70 dark:from-purple-900/10'
                        : stat.color.includes('teal') ? 'from-teal-50/70 dark:from-teal-900/10'
                        : stat.color.includes('emerald') ? 'from-emerald-50/70 dark:from-emerald-900/10'
                        : stat.color.includes('amber') ? 'from-amber-50/70 dark:from-amber-900/10'
                        : 'from-red-50/70 dark:from-red-900/10';

                    return (
                        <Card
                            key={stat.name}
                            className={`border-l-4 ${borderColor} bg-white dark:bg-slate-900 bg-gradient-to-br ${gradientFrom} dark:to-slate-900 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-default overflow-hidden`}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{stat.name}</p>
                                        <h3 className={`text-3xl font-black mt-1.5 leading-none ${stat.color}`}>{stat.value}</h3>
                                        {stat.sub && (
                                            <p className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</p>
                                        )}
                                        <p className={`text-[11px] font-medium mt-1.5 flex items-center gap-1 ${status.color}`}>
                                            {numVal === 0
                                                ? <><AlertCircle className="w-3 h-3" />{status.label}</>
                                                : <><CheckCircle2 className="w-3 h-3" />{status.label}</>}
                                        </p>
                                        {/* Completion bar for Weekly Demand card */}
                                        {stat.name === "Weekly Demand" && lastGenSummary && lastGenSummary.slots > 0 && numVal > 0 && (
                                            <div className="mt-2">
                                                <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                                                    <span>Scheduled</span>
                                                    <span>{Math.min(100, Math.round((lastGenSummary.slots / numVal) * 100))}%</span>
                                                </div>
                                                <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                    <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${Math.min(100, Math.round((lastGenSummary.slots / numVal) * 100))}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`w-11 h-11 rounded-2xl ${stat.bg} flex items-center justify-center shadow-inner shrink-0`}>
                                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Constraint Templates â€” Phase 31 */}
            {instId && (
                <TemplateManager
                    institutionId={instId}
                    onTemplateLoaded={() => fetchDashboardStats()}
                />
            )}


            <div className="w-full space-y-4 pb-8">
                {/* Main Data Ingestion (Full Width) */}
                <div className="w-full space-y-4">
                    <Card id="data-ingestion-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-full">
                        <CardHeader>
                            <CardTitle>Master Data Ingestion</CardTitle>
                            <CardDescription>Upload or modify institutional constraints and capacities.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                {/* â”€â”€ Startup-grade tab navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                                <TabsList className="w-full h-auto p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto flex-nowrap whitespace-nowrap flex gap-0.5 mb-5">
                                    {[
                                        { value: "global", icon: <Settings className="w-3.5 h-3.5" />, label: "Global Settings", activeClass: "data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600" },
                                        { value: "csv", icon: <UploadCloud className="w-3.5 h-3.5" />, label: "Upload CSV", activeClass: "data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600" },
                                        { value: "rooms", icon: <Building className="w-3.5 h-3.5" />, label: "Rooms", activeClass: "data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600" },
                                        { value: "faculty", icon: <Users className="w-3.5 h-3.5" />, label: "Faculty", activeClass: "data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600" },
                                        { value: "workloads", icon: <BookOpen className="w-3.5 h-3.5" />, label: "Workloads", activeClass: "data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600" },
                                        { value: "demo_data", icon: <FlaskConical className="w-3.5 h-3.5" />, label: "Demo Environment", activeClass: "data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600" },
                                    ].map(tab => (
                                        <TabsTrigger
                                            key={tab.value}
                                            value={tab.value}
                                            className={`
                                                flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0
                                                text-slate-500 dark:text-slate-400
                                                hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60
                                                data-[state=active]:bg-gradient-to-r ${tab.activeClass}
                                                data-[state=active]:text-white
                                                data-[state=active]:shadow-md
                                            `}
                                        >
                                            {tab.icon}
                                            <span>{tab.label}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {/* â”€â”€ Form content areas â€” consistent min-height prevents layout jump â”€â”€ */}
                                <TabsContent value="global" className="mt-0">
                                    <div className="min-h-[420px]">
                                        <InstitutionForm onSuccess={() => { toast.success("Global constraints saved!"); fetchDashboardStats(); }} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="csv" className="mt-0">
                                    <div className="min-h-[420px]">
                                        <CsvUploadManager onSuccess={() => fetchDashboardStats()} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="rooms" className="mt-0">
                                    <div className="min-h-[420px]">
                                        <SpreadsheetEditor type="rooms" onSuccess={() => { toast.success("Room added!"); fetchDashboardStats(); }}>
                                            <RoomForm onSuccess={() => { toast.success("Room added!"); fetchDashboardStats(); }} />
                                        </SpreadsheetEditor>
                                    </div>
                                </TabsContent>

                                <TabsContent value="faculty" className="mt-0">
                                    <div className="min-h-[420px]">
                                        <SpreadsheetEditor type="faculty" onSuccess={() => { toast.success("Faculty saved!"); fetchDashboardStats(); }}>
                                            <FacultyForm onSuccess={() => { toast.success("Faculty settings saved!"); fetchDashboardStats(); }} />
                                        </SpreadsheetEditor>
                                    </div>
                                </TabsContent>

                                <TabsContent value="workloads" className="mt-0">
                                    <div className="min-h-[420px]">
                                        <SpreadsheetEditor type="workloads" onSuccess={() => { toast.success("Workload saved!"); fetchDashboardStats(); }}>
                                            <WorkloadForm onSuccess={() => { toast.success("Workload mapped successfully!"); fetchDashboardStats(); }} />
                                        </SpreadsheetEditor>
                                    </div>
                                </TabsContent>

                                <TabsContent value="demo_data" className="mt-0">
                                    <div className="min-h-[420px] rounded-xl border border-teal-200 dark:border-teal-800/40 bg-teal-50/30 dark:bg-teal-900/5 p-5 flex flex-col gap-4">
                                        {/* Header */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                                <FlaskConical className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                                                    Demo Environment
                                                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Select a preset scenario, click <span className="font-semibold text-teal-600 dark:text-teal-400">Save to Database</span>, then <span className="font-semibold text-teal-600 dark:text-teal-400">Generate Timetable</span> above.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Preset selector */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {DEMO_PRESETS.map((p, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { setSelectedPreset(i); setJsonPayload(JSON.stringify(p.json, null, 2)); }}
                                                    className={`text-left p-3 rounded-xl border-2 transition-all text-xs font-semibold ${selectedPreset === i ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 shadow-md shadow-teal-500/10" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300"}`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Description */}
                                        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                                            {DEMO_PRESETS[selectedPreset].description}
                                        </div>

                                        {/* JSON editor */}
                                        <textarea
                                            value={jsonPayload}
                                            onChange={(e) => setJsonPayload(e.target.value)}
                                            className="flex-1 w-full min-h-[200px] p-4 font-mono text-xs rounded-xl border-2 border-teal-200 dark:border-teal-800/50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner resize-y"
                                            spellCheck="false"
                                        />

                                        {/* Actions */}
                                        <div className="flex gap-3">
                                            <Button
                                                onClick={seedDatabase}
                                                disabled={isSeeding || isClearing}
                                                className="flex-1 h-10 bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-500/20 rounded-xl text-sm font-semibold"
                                            >
                                                {isSeeding
                                                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                                                    : <><Database className="w-4 h-4 mr-2" />Save to Database</>}
                                            </Button>
                                            <Button
                                                onClick={clearDatabase}
                                                disabled={isSeeding || isClearing}
                                                variant="outline"
                                                className="h-10 px-4 border-red-200 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-sm"
                                            >
                                                {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertOctagon className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* Conflict Refiner Modal â€” Phase 34 */}
            <ConflictRefinerModal
                open={!!conflictDiagnosis}
                diagnosis={conflictDiagnosis}
                onClose={() => setConflictDiagnosis(null)}
                onNavigate={(tab) => {
                    setConflictDiagnosis(null);
                    // Map tab hints to actual ingestion tabs or navigate to manage page
                    const tabMap: Record<string, string> = {
                        rooms: "rooms",
                        faculty: "faculty",
                        workloads: "workloads",
                        global: "global",
                    };
                    const mapped = tabMap[tab.toLowerCase()];
                    if (mapped) {
                        setActiveTab(mapped);
                        document.getElementById("data-ingestion-card")?.scrollIntoView({ behavior: "smooth" });
                    } else {
                        router.push("/dashboard/manage");
                    }
                }}
            />


            <SolverConsoleModal 
                isOpen={isSolverModalOpen} 
                onClose={() => { setIsSolverModalOpen(false); setIsLiveStreaming(false); fetchDashboardStats(); }} 
                payload={currentPayload} 
                onRoutingRequest={(tab) => {
                    setIsSolverModalOpen(false);
                    const tabMap: Record<string, string> = {
                        rooms: "rooms",
                        faculty: "faculty",
                        workloads: "workloads",
                        global: "global",
                    };
                    const mapped = tabMap[tab.toLowerCase()];
                    if (mapped) {
                        setActiveTab(mapped);
                        document.getElementById("data-ingestion-card")?.scrollIntoView({ behavior: "smooth" });
                    } else {
                        router.push("/dashboard/manage");
                    }
                }}
                onLiveLog={(line) => {
                    setLiveLogs(prev => [...prev, line]);
                    // Auto-scroll inline panel
                    setTimeout(() => liveLogsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
                }}
                onLogsComplete={(logs, score) => {
                    setLastRunLogs(logs);
                    setLastRunScore(score);
                    setShowAllLogs(false);
                    setIsLiveStreaming(false); // switch panel from live â†’ last trace
                    setLastGenerationDate(new Date().toLocaleString());
                }}
                onSuccess={() => { fetchDashboardStats(); router.push('/dashboard/timetable'); }}
            />
        </div>
    );
}

