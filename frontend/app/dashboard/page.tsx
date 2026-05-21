"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, FileText, CheckCircle2, Clock, Upload, Users, Building, GraduationCap, Database, Loader2, RefreshCcw, AlertOctagon, Download } from "lucide-react";

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
import TemplateManager from "@/components/TemplateManager";
import { ConflictRefinerModal } from "@/components/ConflictRefinerModal";

export default function DashboardOverview() {
    const [isMounted, setIsMounted] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState(0);
    const [isDbReady, setIsDbReady] = useState<boolean>(false);

    const [stats, setStats] = useState([
        { name: "Total Faculty", value: 0 as number | string, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
        { name: "Available Rooms", value: 0 as number | string, icon: Building, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
        { name: "Active Batches", value: 0 as number | string, icon: GraduationCap, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-500/10" },
    ]);
    const [lastGenerationDate, setLastGenerationDate] = useState<string | null>(null);
    const [instId, setInstId] = useState<string | null>(null);
    const [conflictDiagnosis, setConflictDiagnosis] = useState<any>(null);

    const supabase = createClient();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
            if (!profile?.institution_id) return;

            const instId = profile.institution_id;
            setInstId(instId);

            // Fetch actual data for capacity heatmap
            const { data: inst } = await supabase.from("institutions").select("days_active, time_slots").eq("id", instId).single();
            const { count: facultyCount } = await supabase.from("faculty_settings").select("*", { count: "exact", head: true });
            const { data: rooms } = await supabase.from("rooms").select("id").eq("institution_id", instId);
            const { data: workloads } = await supabase.from("workloads").select("weekly_hours");

            const roomCount = rooms?.length || 0;
            const workloadsCount = workloads?.length || 0;

            const totalCapacity = (inst?.days_active?.length || 0) * (inst?.time_slots?.length || 0) * roomCount;
            const totalDemand = workloads?.reduce((acc, w) => acc + (w.weekly_hours || 0), 0) || 0;
            const densityRatio = totalCapacity > 0 ? Math.round((totalDemand / totalCapacity) * 100) : 0;

            // Get last generation time
            const { data: latestTs } = await supabase
                .from("generated_timetables")
                .select("created_at")
                .eq("institution_id", instId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            setIsDbReady((facultyCount ?? 0) > 0 && roomCount > 0);

            let densityColor = "text-emerald-500";
            let densityBg = "bg-emerald-50 dark:bg-emerald-500/10";
            let densityAlert = "";
            if (densityRatio > 85) { densityColor = "text-amber-500"; densityBg = "bg-amber-50 dark:bg-amber-500/10"; }
            if (densityRatio > 100) { densityColor = "text-red-500"; densityBg = "bg-red-50 dark:bg-red-500/10"; densityAlert = " ⚠️"; }

            setStats([
                { name: "Total Faculty", value: facultyCount || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                { name: "Available Rooms", value: roomCount || 0, icon: Building, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
                { name: "Total Workloads", value: workloadsCount || 0, icon: GraduationCap, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-500/10" },
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

    const [jsonPayload, setJsonPayload] = useState(JSON.stringify({
        "college_settings": {
            "days_active": [
                "Mon", "Tue", "Wed", "Thu", "Fri"
            ],
            "time_slots": [
                8, 9, 10, 11, 12, 13, 14, 15
            ],
            "lunch_slot": {
                "Mon": 13, "Tue": 13, "Wed": 13, "Thu": 13, "Fri": 13
            },
            "max_continuous_lectures": 2,
            "custom_rules": []
        },
        "rooms_config": {
            "rooms": [
                {
                    "id": "D201",
                    "type": "Classroom",
                    "capacity": 80,
                    "tags": ["Theory_Room"]
                },
                {
                    "id": "D205",
                    "type": "Laboratory",
                    "capacity": 30,
                    "tags": ["Computer_Lab"]
                },
                {
                    "id": "D207",
                    "type": "Laboratory",
                    "capacity": 30,
                    "tags": ["Computer_Lab"]
                },
                {
                    "id": "D313",
                    "type": "Tutorial_Room",
                    "capacity": 30,
                    "tags": ["Tutorial_Room"]
                }
            ]
        },
        "faculty": [
            {
                "id": "F_RNB",
                "name": "Dr. Ratnmala Nivrutti B.",
                "shift": [8, 9, 10, 11, 12, 13, 14, 15],
                "max_load_hrs": 12,
                "blocked_slots": [],
                "class_teacher_for": "SY-CSDS-A",
                "workload": [
                    {
                        "id": "EVT_RNB_TH",
                        "type": "Theory",
                        "subject": "DS2009_DMS",
                        "target_groups": ["SY-CSDS-A"],
                        "hours": 3,
                        "consecutive_hours": 1,
                        "required_tags": ["Theory_Room"]
                    },
                    {
                        "id": "EVT_RNB_PR_B1",
                        "type": "Practical",
                        "subject": "DS2009_DMS_LAB",
                        "target_groups": ["B1"],
                        "hours": 2,
                        "consecutive_hours": 2,
                        "required_tags": ["Computer_Lab"]
                    },
                    {
                        "id": "EVT_RNB_PR_B2",
                        "type": "Practical",
                        "subject": "DS2009_DMS_LAB",
                        "target_groups": ["B2"],
                        "hours": 2,
                        "consecutive_hours": 2,
                        "required_tags": ["Computer_Lab"]
                    },
                    {
                        "id": "EVT_RNB_PR_B3",
                        "type": "Practical",
                        "subject": "DS2009_DMS_LAB",
                        "target_groups": ["B3"],
                        "hours": 2,
                        "consecutive_hours": 2,
                        "required_tags": ["Computer_Lab"]
                    },
                    {
                        "id": "EVT_RNB_TUT_B1",
                        "type": "Tutorial",
                        "subject": "DS2009_DMS_TUT",
                        "target_groups": ["B1"],
                        "hours": 1,
                        "consecutive_hours": 1,
                        "required_tags": ["Tutorial_Room"]
                    },
                    {
                        "id": "EVT_RNB_TUT_B2",
                        "type": "Tutorial",
                        "subject": "DS2009_DMS_TUT",
                        "target_groups": ["B2"],
                        "hours": 1,
                        "consecutive_hours": 1,
                        "required_tags": ["Tutorial_Room"]
                    },
                    {
                        "id": "EVT_RNB_TUT_B3",
                        "type": "Tutorial",
                        "subject": "DS2009_DMS_TUT",
                        "target_groups": ["B3"],
                        "hours": 1,
                        "consecutive_hours": 1,
                        "required_tags": ["Tutorial_Room"]
                    }
                ]
            },
            {
                "id": "F_KGT",
                "name": "Mr. Keshav Gopinath T.",
                "shift": [8, 9, 10, 11, 12, 13, 14, 15],
                "max_load_hrs": 9,
                "blocked_slots": [],
                "class_teacher_for": null,
                "workload": [
                    {
                        "id": "EVT_KGT_TH",
                        "type": "Theory",
                        "subject": "DS2010_DAA",
                        "target_groups": ["SY-CSDS-A"],
                        "hours": 3,
                        "consecutive_hours": 1,
                        "required_tags": ["Theory_Room"]
                    },
                    {
                        "id": "EVT_KGT_PR_B1",
                        "type": "Practical",
                        "subject": "DS2010_DAA_LAB",
                        "target_groups": ["B1"],
                        "hours": 2,
                        "consecutive_hours": 2,
                        "required_tags": ["Computer_Lab"]
                    },
                    {
                        "id": "EVT_KGT_PR_B2",
                        "type": "Practical",
                        "subject": "DS2010_DAA_LAB",
                        "target_groups": ["B2"],
                        "hours": 2,
                        "consecutive_hours": 2,
                        "required_tags": ["Computer_Lab"]
                    },
                    {
                        "id": "EVT_KGT_PR_B3",
                        "type": "Practical",
                        "subject": "DS2010_DAA_LAB",
                        "target_groups": ["B3"],
                        "hours": 2,
                        "consecutive_hours": 2,
                        "required_tags": ["Computer_Lab"]
                    }
                ]
            },
            {
                "id": "F_NRT",
                "name": "Ms. Nilam Rajendra T.",
                "shift": [8, 9, 10, 11, 12, 13, 14, 15],
                "max_load_hrs": 7,
                "blocked_slots": [],
                "class_teacher_for": null,
                "workload": [
                    {
                        "id": "EVT_NRT_TH",
                        "type": "Theory",
                        "subject": "MM0402_PAS",
                        "target_groups": ["SY-CSDS-A"],
                        "hours": 2,
                        "consecutive_hours": 1,
                        "required_tags": ["Theory_Room"]
                    },
                    {
                        "id": "EVT_NRT_PR_B2",
                        "type": "Practical",
                        "subject": "DS2012_ML_LAB",
                        "target_groups": ["B2"],
                        "hours": 2,
                        "consecutive_hours": 2,
                        "required_tags": ["Computer_Lab"]
                    },
                    {
                        "id": "EVT_NRT_TUT_B1",
                        "type": "Tutorial",
                        "subject": "DS2013_DT2_TUT",
                        "target_groups": ["B1"],
                        "hours": 1,
                        "consecutive_hours": 1,
                        "required_tags": ["Tutorial_Room"]
                    },
                    {
                        "id": "EVT_NRT_TUT_B2",
                        "type": "Tutorial",
                        "subject": "DS2013_DT2_TUT",
                        "target_groups": ["B2"],
                        "hours": 1,
                        "consecutive_hours": 1,
                        "required_tags": ["Tutorial_Room"]
                    },
                    {
                        "id": "EVT_NRT_TUT_B3",
                        "type": "Tutorial",
                        "subject": "DS2013_DT2_TUT",
                        "target_groups": ["B3"],
                        "hours": 1,
                        "consecutive_hours": 1,
                        "required_tags": ["Tutorial_Room"]
                    }
                ]
            },
            {
                "id": "F_PSS",
                "name": "Ms. Punam Sanjay S.",
                "shift": [8, 9, 10, 11, 12, 13, 14, 15],
                "max_load_hrs": 9,
                "blocked_slots": [],
                "class_teacher_for": null,
                "workload": [
                    {
                        "id": "EVT_PSS_TH",
                        "type": "Theory",
                        "subject": "DS2011_SPOS",
                        "target_groups": ["SY-CSDS-A"],
                        "hours": 3,
                        "consecutive_hours": 1,
                        "required_tags": ["Theory_Room"]
                    },
                    {
                        "id": "EVT_PSS_PR_B1",
                        "type": "Practical",
                        "subject": "DS2011_SPOS_LAB",
                        "target_groups": ["B1"],
                        "hours": 2,
                        "consecutive_hours": 2,
                        "required_tags": ["Computer_Lab"]
                    },
                    {
                        "id": "EVT_PSS_PR_B2",
                        "type": "Practical",
                        "subject": "DS2011_SPOS_LAB",
                        "target_groups": ["B2"],
                        "hours": 2,
                        "consecutive_hours": 2,
                        "required_tags": ["Computer_Lab"]
                    },
                    {
                        "id": "EVT_PSS_PR_B3",
                        "type": "Practical",
                        "subject": "DS2011_SPOS_LAB",
                        "target_groups": ["B3"],
                        "hours": 2,
                        "consecutive_hours": 2,
                        "required_tags": ["Computer_Lab"]
                    }
                ]
            }
        ]
    }, null, 4));

    // JSON parsing bypass code left unchanged below 
    const [isSeeding, setIsSeeding] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const clearDatabase = async () => {
        setIsClearing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Authentication missing. Please log in.");

            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
            const instId = profile?.institution_id;

            if (instId) {
                await supabase.from("rooms").delete().eq("institution_id", instId);
            }

            const { data: faculties } = await supabase.from("faculty_settings").select("id").eq("profile_id", user.id);
            if (faculties && faculties.length > 0) {
                for (const f of faculties) {
                    await supabase.from("workloads").delete().eq("faculty_id", f.id);
                }
                await supabase.from("faculty_settings").delete().eq("profile_id", user.id);
            }

            alert("Database Nuked Successfully! All testing records have been erased.");
            fetchDashboardStats(); // Soft refresh instead of hard reload
        } catch (err: any) {
            console.error("Clearing Error:", err);
            alert("Clearing failed: " + (err.message || "Unknown error"));
        }
        setIsClearing(false);
    };

    const exportTemplate = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
            const instId = profile?.institution_id;
            if (!instId) throw new Error("No institution data to export.");

            const { data: inst } = await supabase.from("institutions").select("*").eq("id", instId).single();
            const { data: rooms } = await supabase.from("rooms").select("*").eq("institution_id", instId);
            const { data: facSettings } = await supabase.from("faculty_settings").select("*").eq("profile_id", user.id);

            let lunchMap: Record<string, number> = {};
            if (inst && typeof inst.lunch_slot === 'object' && inst.lunch_slot !== null) {
                lunchMap = inst.lunch_slot;
            } else if (inst) {
                inst.days_active.forEach((day: string) => {
                    lunchMap[day] = parseInt(inst.lunch_slot as string) || 13;
                });
            }

            const mappedFaculties = facSettings ? await Promise.all(facSettings.map(async (facSetting) => {
                const { data: workloads } = await supabase.from("workloads").select("*").eq("faculty_id", facSetting.id);
                let realFacultyName = `Faculty ${facSetting.id.slice(0, 4).toUpperCase()}`;
                if (facSetting.blocked_slots && facSetting.blocked_slots.length > 0 && facSetting.blocked_slots[0]._csv_id) {
                    realFacultyName = facSetting.blocked_slots[0]._csv_id;
                }
                return {
                    id: facSetting.id.slice(0, 8),
                    name: realFacultyName,
                    shift: (!facSetting.shift_hours || facSetting.shift_hours.length === 0) ? inst?.time_slots : facSetting.shift_hours,
                    max_load_hrs: facSetting.max_load_hrs,
                    max_continuous_hrs: facSetting.max_continuous_hrs || 3,
                    blocked_slots: (facSetting.blocked_slots || []).filter((s: any) => s.day && s.time !== undefined),
                    class_teacher_for: facSetting.class_teacher_for,
                    workload: workloads?.map(w => ({
                        id: w.id.slice(0, 8),
                        type: w.type,
                        subject: w.subject_code,
                        target_groups: w.target_groups,
                        hours: w.weekly_hours,
                        consecutive_hours: w.consecutive_hours,
                        required_tags: w.required_tags,
                        is_online: w.is_online || false
                    })) || []
                };
            })) : [];

            const dynamicPayload = {
                college_settings: {
                    days_active: inst?.days_active || [],
                    time_slots: inst?.time_slots || [],
                    lunch_slot: lunchMap,
                    custom_rules: []
                },
                rooms_config: {
                    rooms: rooms?.map(r => ({ id: r.name, type: r.type, capacity: r.capacity, tags: r.tags })) || []
                },
                faculty: mappedFaculties
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dynamicPayload, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", `ShiftSync_Template_${new Date().toISOString().split('T')[0]}.json`);
            dlAnchorElem.click();
        } catch (error: any) {
            alert(error.message || "Export failed.");
        }
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
                        profile_id: profileId,
                        max_load_hrs: f.max_load_hrs,
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
                        faculty_id: facId,
                        subject_code: w.subject,
                        type: w.type,
                        target_groups: w.target_groups,
                        weekly_hours: w.hours,
                        consecutive_hours: w.consecutive_hours,
                        required_tags: w.required_tags
                    });
                }
            }



            alert("Data Seeded Successfully! The SQL Tables are now populated.");
        } catch (err: any) {
            console.error("Seeding Error:", err);
            alert("Seeding failed: " + (err.message || "Unknown error"));
        }
        setIsSeeding(false);
    };

    const startGeneration = async () => {
        if (!isDbReady) {
            alert("⚠️ Cannot Generate: Your database is empty! You must use the Data Ingestion tabs to add at least 1 Room and 1 Faculty member before the AI can run.");
            return;
        }

        setIsGenerating(true);
        setGenerationStep(0); // Initialize

        try {
            // STEP 1: Fetching dynamically from Supabase Pipeline
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
            const instId = profile?.institution_id;
            if (!instId) throw new Error("No institution data seeded yet! Run Seed Database first.");

            const { data: inst } = await supabase.from("institutions").select("*").eq("id", instId).single();
            const { data: rooms } = await supabase.from("rooms").select("*").eq("institution_id", instId);

            // Fetch ALL faculty linked to this user's simulated environment
            const { data: facSettings } = await supabase.from("faculty_settings").select("*").eq("profile_id", user.id);
            if (!facSettings || facSettings.length === 0) throw new Error("No Faculty Configuration found! Please complete the 'Faculty' tab setup before generating.");

            // Dynamically build the new map-based lunch dictionary
            // Dynamically build or parse the new map-based lunch dictionary
            let lunchMap: Record<string, number> = {};
            if (typeof inst.lunch_slot === 'object' && inst.lunch_slot !== null) {
                lunchMap = inst.lunch_slot;
            } else {
                inst.days_active.forEach((day: string) => {
                    lunchMap[day] = parseInt(inst.lunch_slot as string) || 13;
                });
            }

            // Build dynamic payload mapping all faculties
            const mappedFaculties = await Promise.all(facSettings.map(async (facSetting) => {
                const { data: workloads } = await supabase.from("workloads").select("*").eq("faculty_id", facSetting.id);
                
                // Extract real faculty name/identifier from the _csv_id metadata injected during upload/creation if it exists
                let realFacultyName = `Faculty ${facSetting.id.slice(0, 4).toUpperCase()}`;
                if (facSetting.blocked_slots && facSetting.blocked_slots.length > 0 && facSetting.blocked_slots[0]._csv_id) {
                    realFacultyName = facSetting.blocked_slots[0]._csv_id;
                }

                return {
                    id: facSetting.id.slice(0, 8),
                    name: realFacultyName,
                    shift: (!facSetting.shift_hours || facSetting.shift_hours.length === 0) ? inst.time_slots : facSetting.shift_hours,
                    max_load_hrs: facSetting.max_load_hrs,
                    max_continuous_hrs: facSetting.max_continuous_hrs || 3, // Safely fallback if not mapped in UI yet
                    blocked_slots: (facSetting.blocked_slots || []).filter((s: any) => s.day && s.time !== undefined),
                    class_teacher_for: facSetting.class_teacher_for,
                    workload: workloads?.map(w => ({
                        id: w.id.slice(0, 8),
                        type: w.type,
                        subject: w.subject_code,
                        target_groups: w.target_groups,
                        hours: w.weekly_hours,
                        consecutive_hours: w.consecutive_hours,
                        required_tags: w.required_tags,
                        is_online: w.is_online || false
                    })) || []
                };
            }));

            // Retrieve pinned classes to send back as FORCE_PIN rules
            let customRules: any[] = [];
            const storedPins = localStorage.getItem(`pinned_classes_${instId}`);
            if (storedPins) {
                try {
                    const pins = JSON.parse(storedPins);
                    customRules = pins.map((pin: string, index: number) => {
                        const parts = pin.split("|"); // w_id|room|day|time
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
                } catch (e) {
                    console.warn("Could not parse pinned class preferences:", e);
                }
            }

            // Construct the Python Engine Payload dynamically from SQL Result!
            const dynamicPayload = {
                college_settings: {
                    days_active: inst.days_active,
                    time_slots: inst.time_slots,
                    lunch_slot: lunchMap,
                    custom_rules: customRules
                },
                rooms_config: {
                    rooms: rooms?.map(r => ({ id: r.name, type: r.type, capacity: r.capacity, tags: r.tags }))
                },
                faculty: mappedFaculties
            };

            setGenerationStep(1); // Calling API

            // ----------------------------------------------------
            // PHASE 3: REAL-TIME HEALTH CHECKER
            // Catch basic mathematical impossibilities BEFORE hitting the cloud CP-SAT solver.
            // ----------------------------------------------------
            for (const fac of mappedFaculties) {
                let totalAssignedHours = 0;
                fac.workload.forEach((w: any) => totalAssignedHours += w.hours);
                
                if (totalAssignedHours > fac.max_load_hrs) {
                    setIsGenerating(false);
                    setGenerationStep(0);
                    alert(`❌ Mathematical Impossibility detected: ${fac.name} has been assigned ${totalAssignedHours} hours of workloads, but their personal Max Fatigue Limit is ${fac.max_load_hrs} hrs. Please decrease their workload or increase their limit in Faculty Settings.`);
                    return;
                }
            }

            // Quick check: Are there ANY physical rooms if we have offline classes?
            const requiresRooms = dynamicPayload.faculty.some((f: any) => f.workload.some((w: any) => !w.is_online));
            if (requiresRooms && (!dynamicPayload.rooms_config.rooms || dynamicPayload.rooms_config.rooms.length === 0)) {
                 setIsGenerating(false);
                 setGenerationStep(0);
                 alert(`❌ Impossible Geometry: You have scheduled standard physical classes, but have 0 Rooms configured in Step 2.`);
                 return;
            }
            // ----------------------------------------------------

            const response = await fetch(`${process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:8000'}/api/v1/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dynamicPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();

                // Track failure asynchronously
                supabase.from("generated_timetables").insert({
                    institution_id: instId,
                    is_active: false,
                    matrix_data: {},
                    status: 'failed',
                    error_message: JSON.stringify(errorData.detail || errorData)
                }).then();

                // 422 with a structured diagnosis → open Conflict Refiner Modal
                if (response.status === 422 && errorData?.detail?.diagnosis) {
                    setConflictDiagnosis(errorData.detail.diagnosis);
                    setIsGenerating(false);
                    setGenerationStep(0);
                    return;
                }

                // All other errors → plain alert
                const errorMsg = errorData?.detail?.message ?? JSON.stringify(errorData.detail ?? errorData);
                alert("Generation Failed: " + errorMsg);
                setIsGenerating(false);
                return;
            }

            const data = await response.json();
            console.log("Optimal Timetable Matrix (Remote):", data);

            setGenerationStep(3); // Optimizing database

            // STEP 2: Save the generated matrix to Supabase `generated_timetables`
            // Persist real status — 'success' or 'success_with_overflow'
            const { error: insertErr } = await supabase.from("generated_timetables").insert({
                institution_id: instId,
                is_active: true,
                matrix_data: data,
                status: data.status ?? 'success'   // carries 'success_with_overflow' when ghost room fired
            });

            if (insertErr) {
                console.error("Supabase Insert Error:", insertErr);
                alert("Database Error! Did you run the SQL Migration to add 'status' column? " + insertErr.message);
                setIsGenerating(false);
                return;
            }

            const isOverflow = data.status === 'success_with_overflow';
            const overflowMsg = isOverflow
                ? `\n\n⚠️ ${data.overflow_count} class slot(s) have no matching room and were assigned to overflow. Open the Timetable view to see them highlighted in amber.`
                : "";

            setTimeout(() => {
                setGenerationStep(4); // Complete
                setTimeout(() => {
                    localStorage.setItem('force_tt_refresh', 'true');
                    setIsGenerating(false);
                    fetchDashboardStats();
                    alert(`✅ Timetable generated and saved to PostgreSQL!${overflowMsg}`);
                }, 1500);
            }, 1000);

        } catch (error: any) {
            console.warn("Pipeline Validation:", error.message);
            // Try to parse a structured 422 diagnosis from the backend
            try {
                const parsed = JSON.parse(error.message);
                if (parsed?.detail?.diagnosis) {
                    setConflictDiagnosis(parsed.detail.diagnosis);
                    setIsGenerating(false);
                    setGenerationStep(0);
                    return;
                }
            } catch (_) { /* not a JSON error — fall through */ }
            alert(error.message || "Failed to connect to Python Backend Engine.");
            setIsGenerating(false);
            setGenerationStep(0);
        }
    };

    if (!isMounted) {
        return (
            <div className="w-full h-[60vh] flex items-center justify-center">
                <div className="text-slate-400 font-medium">Checking live Database state...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Overview</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage master data and trigger timetable generation.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={exportTemplate}
                        variant="outline"
                        className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border-slate-200 dark:border-slate-800"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Save Template JSON
                    </Button>
                    <Button
                        onClick={clearDatabase}
                        disabled={isSeeding || isClearing}
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/30"
                    >
                        {isClearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertOctagon className="w-4 h-4 mr-2" />}
                        {isClearing ? "Nuking Database..." : "Danger: Nuke Database"}
                    </Button>
                </div>
            </div>

            {/* Top Full-Width Hero: AI Generation Trigger */}
            <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-blue-500/5 dark:shadow-blue-500/10 relative overflow-hidden flex flex-col transition-all duration-500 hover:shadow-blue-500/20 hover:border-blue-300 dark:hover:border-blue-700/50">
                {/* Background glowing orb */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-600/20 blur-[80px] rounded-full pointer-events-none transition-transform duration-700 hover:scale-150" />

                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <div className="w-3 h-3 rounded-full bg-teal-500 animate-pulse" />
                        AI Solver Engine
                    </CardTitle>
                    <CardDescription className="text-base text-slate-500 dark:text-slate-400">Generate an optimal collision-free timetable conforming to all hard and soft constraints.</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col md:flex-row items-center justify-between gap-8 py-6">
                    <div className="w-full md:w-auto flex-1 flex flex-col justify-center items-start">
                        <AnimatePresence mode="wait">
                            {!isGenerating ? (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="w-full"
                                >
                                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                                        <Button
                                            size="lg"
                                            onClick={startGeneration}
                                            className={`flex-1 min-h-[4rem] h-auto py-3 px-6 text-sm sm:text-base lg:text-lg rounded-2xl text-white shadow-xl transition-all duration-300 group hover:scale-[1.02] active:scale-95 flex-col sm:flex-row items-center justify-center text-center whitespace-normal leading-tight ${isDbReady ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-blue-600/25 hover:shadow-blue-600/40" : "bg-slate-400 dark:bg-slate-800 hover:bg-slate-500 dark:hover:bg-slate-700 shadow-none"}`}
                                        >
                                            <Play className={`w-5 h-5 sm:mr-3 mb-1 sm:mb-0 shrink-0 transition-all ${isDbReady ? "fill-white/20 group-hover:fill-white/40" : "fill-white/10"}`} />
                                            <span>{isDbReady ? "Generate Timetable / Shuffle" : "Setup Required (Click for details)"}</span>
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            onClick={() => window.location.reload()}
                                            disabled={!isDbReady}
                                            className="min-h-[4rem] h-auto rounded-2xl border-slate-200 dark:border-slate-800 shrink-0 px-8"
                                        >
                                            <RefreshCcw className="w-5 h-5 mr-3 text-slate-500" />
                                            Refresh Sync
                                        </Button>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-4 flex items-center justify-between transition-opacity w-full">
                                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Estimated solving time: ~45s</span>
                                    </p>
                                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-2 font-medium bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg border border-purple-100 dark:border-purple-800/50">
                                        Don't like this layout? Click generate again to see alternative valid arrangements! Locked classes stay pinned.
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="generating"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full flex items-center gap-8 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30"
                                >
                                    <div className="relative w-24 h-24 flex justify-center items-center shrink-0">
                                        {generationStep < 3 ? (
                                            <SolverLoadingGear className="w-full h-full drop-shadow-lg" />
                                        ) : (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-20 h-20 bg-teal-500 rounded-full flex justify-center items-center shadow-lg shadow-teal-500/30"
                                            >
                                                <CheckCircle2 className="w-10 h-10 text-white" />
                                            </motion.div>
                                        )}
                                    </div>

                                    <div className="space-y-2 flex-1 w-full max-w-xl">
                                        <h3 className="font-semibold text-xl text-slate-900 dark:text-slate-50">
                                            {generationStep === 0 && "Validating Geometry..."}
                                            {generationStep === 1 && "Booting Engine..."}
                                            {generationStep === 2 && "Synthesizing Timetables..."}
                                            {generationStep === 3 && "Finalizing Matrix..."}
                                            {generationStep === 4 && "Synchronization Complete!"}
                                        </h3>

                                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
                                            <motion.div
                                                className={`h-full ${generationStep === 4 ? "bg-teal-500" : "bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-[length:200%_auto] animate-gradient"}`}
                                                initial={{ width: "0%" }}
                                                animate={{ width: generationStep === 0 ? "10%" : generationStep === 1 ? "40%" : generationStep === 2 ? "70%" : generationStep === 3 ? "90%" : "100%" }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>

                                        <div className="h-10 text-sm text-slate-500 dark:text-slate-400 font-mono mt-2 overflow-hidden relative">
                                            <AnimatePresence mode="wait">
                                                {generationStep === 0 && (
                                                    <motion.p key="v0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                                        &gt; Running Local Health Checks... <br/>&gt; Validating {stats[2].value} Master Workloads...
                                                    </motion.p>
                                                )}
                                                {generationStep === 1 && (
                                                    <motion.p key="v1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                                        &gt; Initializing Google OR-Tools CP-SAT Solver... <br/>&gt; Applying Hard Constraints (Rooms, Overlaps)...
                                                    </motion.p>
                                                )}
                                                {generationStep === 2 && (
                                                    <motion.p key="v2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                                        &gt; Calculating 89,012 Potential Multi-verse Combos...<br/>&gt; Resolving {stats[0].value} Faculty burnout limits...
                                                    </motion.p>
                                                )}
                                                {generationStep === 3 && (
                                                    <motion.p key="v3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                                        &gt; Optimizing Soft Constraints (Minimizing Day-Gaps)...<br/>&gt; Compiling Optimal 4D JSON Matrix Payload...
                                                    </motion.p>
                                                )}
                                                {generationStep === 4 && (
                                                    <motion.p key="v4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-teal-600 dark:text-teal-400">
                                                        &gt; Local Minimum Reached! <br/>&gt; Database Synchronization Successful.
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </CardContent>

                <CardFooter className="bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800/50 text-sm text-slate-600 dark:text-slate-400 p-4 font-medium flex gap-2 items-center">
                    <FileText className="w-4 h-4 ml-2" />
                    {lastGenerationDate ? `Last solved on ${lastGenerationDate} via Cloud Engine.` : "No timetable has been generated yet."}
                </CardFooter>
            </Card>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.name} className="border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-blue-200 dark:hover:border-blue-800/50 cursor-default">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</p>
                                <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-slate-50">{stat.value}</h3>
                            </div>
                            <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Constraint Templates — Phase 31 */}
            {instId && (
                <TemplateManager
                    institutionId={instId}
                    onTemplateLoaded={() => fetchDashboardStats()}
                />
            )}

            <div className="w-full space-y-4 pb-8">

                {/* Main Data Ingestion (Full Width) */}
                <div className="w-full space-y-4">
                    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm h-full">
                        <CardHeader>
                            <CardTitle>Master Data Ingestion</CardTitle>
                            <CardDescription>Upload or modify institutional constraints and capacities.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="global" className="w-full">
                                <TabsList className="w-full justify-start border-none bg-slate-100/50 dark:bg-slate-900/50 p-1.5 h-auto rounded-xl gap-2 overflow-x-auto no-scrollbar flex-nowrap shrink-0 whitespace-nowrap mb-4">
                                    <TabsTrigger value="global" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg px-5 py-2.5 text-sm font-semibold transition-all">
                                        1. Global Settings
                                    </TabsTrigger>
                                    <TabsTrigger value="csv" className="data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-all flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        Upload CSV
                                    </TabsTrigger>
                                    <TabsTrigger value="rooms" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg px-5 py-2.5 text-sm font-semibold transition-all">
                                        2. Rooms
                                    </TabsTrigger>
                                    <TabsTrigger value="faculty" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg px-5 py-2.5 text-sm font-semibold transition-all">
                                        3. Faculty
                                    </TabsTrigger>
                                    <TabsTrigger value="workloads" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg px-5 py-2.5 text-sm font-semibold transition-all">
                                        4. Workloads
                                    </TabsTrigger>
                                    <TabsTrigger value="demo_data" className="data-[state=active]:bg-teal-50 dark:data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-sm rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-teal-600 transition-all flex items-center gap-2">
                                        <AlertOctagon className="w-4 h-4" />
                                        Database Tools
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="global" className="pt-6">
                                    <InstitutionForm onSuccess={() => { alert("Global Constraints Set!"); fetchDashboardStats(); }} />
                                </TabsContent>

                                <TabsContent value="csv" className="pt-6">
                                    <CsvUploadManager onSuccess={() => fetchDashboardStats()} />
                                </TabsContent>

                                <TabsContent value="rooms" className="pt-6">
                                    <RoomForm onSuccess={() => { alert("Room Added! Check the top dashboard stats to verify."); fetchDashboardStats(); }} />
                                </TabsContent>

                                <TabsContent value="faculty" className="pt-6">
                                    <FacultyForm onSuccess={() => { alert("Faculty Settings Saved! Check the top dashboard stats to verify."); fetchDashboardStats(); }} />
                                </TabsContent>

                                <TabsContent value="workloads" className="pt-6">
                                    <WorkloadForm onSuccess={() => { alert("Workload Mapped Successfully!"); fetchDashboardStats(); }} />
                                </TabsContent>

                                <TabsContent value="demo_data" className="pt-6">
                                    <div className="flex flex-col space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                                            Import Pre-configured Demo Environment
                                        </label>
                                        <p className="text-xs text-slate-500 mb-2">
                                            To easily test the AI System, you can inject this pre-written block of constraints describing a complex &quot;Computer Science&quot; schedule directly into the blank Database.
                                            Press <strong className="text-teal-600">Step 1</strong> below, and then press the large <strong>Generate Smart Timetable</strong> button on the right!
                                        </p>
                                        <textarea
                                            value={jsonPayload}
                                            onChange={(e) => setJsonPayload(e.target.value)}
                                            className="w-full h-80 p-4 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
                                            spellCheck="false"
                                        />
                                        <Button
                                            onClick={seedDatabase}
                                            disabled={isSeeding || isClearing}
                                            className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white"
                                        >
                                            <Database className="w-4 h-4 mr-2" />
                                            {isSeeding ? "Importing to SQL..." : "Step 1: Save Demo Configuration to Database"}
                                        </Button>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* Conflict Refiner Modal */}
            <ConflictRefinerModal
                open={!!conflictDiagnosis}
                diagnosis={conflictDiagnosis}
                onClose={() => setConflictDiagnosis(null)}
            />

        </div>
    );
}
