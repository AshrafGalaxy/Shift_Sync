"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar, MapPin, Clock, Search, Send, UserX, AlertTriangle,
    CheckCircle2, Loader2, Wifi, BookOpen, Bell, ThumbsUp, ThumbsDown,
    RefreshCw, Users, ChevronRight, CalendarDays, Briefcase, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────
interface TimetableSlot {
    faculty_id: string;
    workload_id: string;
    subject: string;
    room: string;
    type: string;
    day: string;
    time_slot: number;
    target_groups: string[];
    division?: string;
    is_online: boolean;
}

interface SubstituteCandidate {
    faculty_id: string;
    name: string;
    email: string;
    current_load: number;
    status: string;
}

interface Notification {
    id: string;
    type: string;
    message: string;
    metadata: any;
    is_read: boolean;
    created_at: string;
    sender_id: string;
}

interface SubRequest {
    id: string;
    subject_code: string;
    room: string;
    day: string;
    time_slot: number;
    status: string;
    created_at: string;
    requester: { full_name: string };
}

interface FacultyRecord {
    id: string;
    profile_id: string;
    shift_hours: number[];
    max_load_hrs: number;
    class_teacher_for: string | null;
    profiles: { full_name: string; id: string } | null;
    workload_count: number;
}

interface GenerationRecord {
    id: string;
    created_at: string;
    status: string;
    is_active: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const ALL_SLOTS = Array.from({ length: 10 }, (_, i) => i + 8); // 8–17

function formatTime(slot: number) {
    const h = slot % 12 === 0 ? 12 : slot % 12;
    const ampm = slot < 12 ? "AM" : "PM";
    return `${h}:00 ${ampm}`;
}

function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function shiftRange(hours: number[]) {
    if (!hours?.length) return "No shift";
    return `${formatTime(hours[0])} – ${formatTime(hours[hours.length - 1] + 1)}`;
}

function extractSlots(matrixData: any): TimetableSlot[] {
    if (!matrixData) return [];
    const raw = Array.isArray(matrixData) ? matrixData : (matrixData?.schedule ?? Object.values(matrixData ?? {}));
    return Array.isArray(raw) ? raw : [];
}

// ── Slot type colour ────────────────────────────────────────────────────
function slotColor(slot: TimetableSlot) {
    if (slot.is_online) return "bg-indigo-500";
    if (slot.type === "Practical") return "bg-teal-500";
    if (slot.type === "Tutorial") return "bg-purple-500";
    return "bg-blue-500";
}

function slotBadgeClass(slot: TimetableSlot) {
    if (slot.is_online) return "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200";
    if (slot.type === "Practical") return "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200";
    return "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200";
}

// ══════════════════════════════════════════════════════════════════════════
// ── Admin: Faculty Directory ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
function AdminFacultyDirectory() {
    const supabase = createClient();
    const [faculty, setFaculty] = useState<FacultyRecord[]>([]);
    const [generations, setGenerations] = useState<GenerationRecord[]>([]);
    const [selectedGenId, setSelectedGenId] = useState<string>("");
    const [allSlots, setAllSlots] = useState<TimetableSlot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewingFaculty, setViewingFaculty] = useState<FacultyRecord | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
            if (!profile?.institution_id) return;

            // Fetch all faculty with their profile names
            const { data: facData } = await supabase
                .from("faculty_settings")
                .select("id, profile_id, shift_hours, max_load_hrs, class_teacher_for, profiles(id, full_name)")
                .eq("profile_id", user.id) // scoped to institution via profile
                ;

            // Fetch workload counts
            const { data: workloadData } = await supabase
                .from("workloads")
                .select("faculty_id");

            // Fetch all faculty for this institution by matching profiles
            const { data: institutionProfiles } = await supabase
                .from("profiles")
                .select("id")
                .eq("institution_id", profile.institution_id);

            const profileIds = (institutionProfiles ?? []).map((p: any) => p.id);

            const { data: allFacData } = await supabase
                .from("faculty_settings")
                .select("id, profile_id, shift_hours, max_load_hrs, class_teacher_for, profiles(id, full_name)")
                .in("profile_id", profileIds);

            const wMap: Record<string, number> = {};
            (workloadData ?? []).forEach((w: any) => { wMap[w.faculty_id] = (wMap[w.faculty_id] || 0) + 1; });

            const enriched: FacultyRecord[] = (allFacData ?? []).map((f: any) => ({
                ...f,
                workload_count: wMap[f.id] || 0,
            }));
            setFaculty(enriched);

            // Fetch generation history
            const { data: gens } = await supabase
                .from("generated_timetables")
                .select("id, created_at, status, is_active")
                .eq("institution_id", profile.institution_id)
                .in("status", ["success", "success_with_overflow"])
                .order("created_at", { ascending: false })
                .limit(10);
            setGenerations(gens ?? []);

            // Default to latest active
            const active = (gens ?? []).find((g: any) => g.is_active) ?? (gens ?? [])[0];
            if (active) {
                setSelectedGenId(active.id);
                await loadGeneration(active.id);
            }
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    const loadGeneration = async (genId: string) => {
        const { data } = await supabase
            .from("generated_timetables")
            .select("matrix_data")
            .eq("id", genId)
            .single();
        setAllSlots(extractSlots(data?.matrix_data));
    };

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleGenChange = async (genId: string) => {
        setSelectedGenId(genId);
        await loadGeneration(genId);
    };

    const filtered = faculty.filter(f => {
        const name = (f.profiles as any)?.full_name?.toLowerCase() ?? "";
        const div = f.class_teacher_for?.toLowerCase() ?? "";
        const q = searchQuery.toLowerCase();
        return name.includes(q) || div.includes(q);
    });

    const getFacultySlots = (facId: string): TimetableSlot[] =>
        allSlots.filter(s => s.faculty_id === facId);

    if (isLoading) return (
        <div className="h-[50vh] flex items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
            <span className="text-sm">Loading faculty directory...</span>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 flex-1 max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search by name or division..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-transparent text-sm outline-none w-full text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                </div>
                {generations.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        <select
                            className="text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300"
                            value={selectedGenId}
                            onChange={e => handleGenChange(e.target.value)}
                        >
                            {generations.map((g, i) => (
                                <option key={g.id} value={g.id}>
                                    {g.is_active ? "● " : ""}{format(new Date(g.created_at), "MMM d, yyyy · h:mm a")}
                                    {i === 0 ? " (Latest)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total Faculty", value: faculty.length, icon: Users, color: "text-violet-500" },
                    { label: "Active Generation", value: generations.find(g => g.is_active) ? "Yes" : "None", icon: CalendarDays, color: "text-emerald-500" },
                    { label: "Slots Assigned", value: allSlots.length, icon: Briefcase, color: "text-blue-500" },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                        <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{stat.value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Faculty cards grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No faculty found</p>
                    <p className="text-sm mt-1">Add faculty in Data Manager → Faculty tab</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((fac, idx) => {
                        const name = (fac.profiles as any)?.full_name ?? "Unknown Faculty";
                        const facSlots = getFacultySlots(fac.id);
                        const loadPct = Math.min(100, Math.round((facSlots.length / Math.max(fac.max_load_hrs, 1)) * 100));
                        return (
                            <motion.div
                                key={fac.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all hover:border-violet-200 dark:hover:border-violet-800 group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-11 h-11 border-2 border-slate-100 dark:border-slate-800">
                                            <AvatarFallback className="bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-sm font-bold">
                                                {getInitials(name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-sm text-slate-900 dark:text-slate-50 leading-tight">{name}</p>
                                            {fac.class_teacher_for && (
                                                <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
                                                    CT: {fac.class_teacher_for}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        facSlots.length > 0
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                            : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                                    }`}>
                                        {facSlots.length} slots
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs text-slate-500 mb-4">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        {shiftRange(fac.shift_hours)}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Briefcase className="w-3 h-3" />
                                        {fac.workload_count} workloads · Max {fac.max_load_hrs}h/wk
                                    </div>
                                </div>

                                {/* Load bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                        <span>Weekly load</span>
                                        <span>{facSlots.length}/{fac.max_load_hrs}h</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                loadPct >= 90 ? "bg-red-500" : loadPct >= 70 ? "bg-amber-500" : "bg-emerald-500"
                                            }`}
                                            style={{ width: `${loadPct}%` }}
                                        />
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-xs border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                                    onClick={() => setViewingFaculty(fac)}
                                    disabled={facSlots.length === 0}
                                >
                                    <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                                    {facSlots.length === 0 ? "No slots in this generation" : "View Timetable"}
                                    {facSlots.length > 0 && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                                </Button>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Faculty Timetable Modal */}
            <Dialog open={!!viewingFaculty} onOpenChange={o => !o && setViewingFaculty(null)}>
                <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <DialogTitle className="flex items-center gap-3">
                            {viewingFaculty && (
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-xs font-bold">
                                        {getInitials((viewingFaculty.profiles as any)?.full_name ?? "?")}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                            {(viewingFaculty?.profiles as any)?.full_name ?? "Faculty"} — Weekly Timetable
                        </DialogTitle>
                        <DialogDescription>
                            {viewingFaculty?.class_teacher_for && `Class Teacher: ${viewingFaculty.class_teacher_for} · `}
                            Shift: {viewingFaculty ? shiftRange(viewingFaculty.shift_hours) : "—"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto p-6">
                        {viewingFaculty && (() => {
                            const facSlots = getFacultySlots(viewingFaculty.id);
                            const slotMap: Record<string, Record<number, TimetableSlot>> = {};
                            DAYS.forEach(d => { slotMap[d] = {}; });
                            facSlots.forEach(s => { if (slotMap[s.day]) slotMap[s.day][s.time_slot] = s; });

                            return (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="w-20 py-2 text-left text-slate-400 font-medium">Time</th>
                                                {DAYS.map(d => (
                                                    <th key={d} className="py-2 px-1 text-center text-slate-600 dark:text-slate-400 font-semibold">{d}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ALL_SLOTS.map(slot => (
                                                <tr key={slot} className="border-t border-slate-100 dark:border-slate-800">
                                                    <td className="py-1.5 pr-3 text-slate-400 font-mono text-[10px] whitespace-nowrap">{formatTime(slot)}</td>
                                                    {DAYS.map(day => {
                                                        const s = slotMap[day]?.[slot];
                                                        return (
                                                            <td key={day} className="px-1 py-1 h-14">
                                                                {s ? (
                                                                    <div className={`h-full rounded-lg p-1.5 flex flex-col justify-between ${
                                                                        s.is_online ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800"
                                                                        : s.type === "Practical" ? "bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800"
                                                                        : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                                                    }`}>
                                                                        <p className="font-bold text-[10px] text-slate-800 dark:text-slate-100 truncate leading-tight">{s.subject}</p>
                                                                        <div className="flex items-center justify-between mt-0.5">
                                                                            <span className="text-[9px] text-slate-500 truncate">{s.room}</span>
                                                                            <span className="text-[9px] text-slate-400 shrink-0 ml-1">{s.target_groups[0]}</span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-full rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-100 dark:border-slate-800/50" />
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════
// ── Faculty: Personal Portal ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
function FacultyPersonalPortal({ profile }: { profile: { id: string; full_name: string; role: string } }) {
    const supabase = createClient();

    const [facultySetting, setFacultySetting] = useState<{ id: string; shift_hours: number[]; max_load_hrs: number } | null>(null);
    const [allSlots, setAllSlots] = useState<TimetableSlot[]>([]);
    const [todayDay, setTodayDay] = useState("Mon");
    const [activeTab, setActiveTab] = useState<"today" | "week">("today");
    const [institutionId, setInstitutionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Substitute
    const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
    const [isAbsentModalOpen, setIsAbsentModalOpen] = useState(false);
    const [isSearchingSub, setIsSearchingSub] = useState(false);
    const [substitutes, setSubstitutes] = useState<SubstituteCandidate[]>([]);
    const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

    // Notifications
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [inboundRequests, setInboundRequests] = useState<SubRequest[]>([]);
    const [respondingTo, setRespondingTo] = useState<string | null>(null);

    // Generation versions
    const [generations, setGenerations] = useState<GenerationRecord[]>([]);
    const [selectedGenId, setSelectedGenId] = useState<string>("");

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const resolvedDay = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] ?? "Mon";
            setTodayDay(resolvedDay);

            const { data: prof } = await supabase.from("profiles").select("institution_id").eq("id", profile.id).single();
            if (!prof?.institution_id) return;
            setInstitutionId(prof.institution_id);

            const { data: fac } = await supabase.from("faculty_settings").select("id, shift_hours, max_load_hrs").eq("profile_id", profile.id).maybeSingle();
            setFacultySetting(fac ?? null);

            // Fetch all generation versions
            const { data: gens } = await supabase
                .from("generated_timetables")
                .select("id, created_at, status, is_active")
                .eq("institution_id", prof.institution_id)
                .in("status", ["success", "success_with_overflow"])
                .order("created_at", { ascending: false })
                .limit(10);
            setGenerations(gens ?? []);

            const activeGen = (gens ?? []).find((g: any) => g.is_active) ?? (gens ?? [])[0];
            if (activeGen && fac?.id) {
                setSelectedGenId(activeGen.id);
                await loadSlots(activeGen.id, fac.id);
            }

            // Inbound substitute requests
            const { data: inbound } = await supabase
                .from("substitute_requests")
                .select("id, subject_code, room, day, time_slot, status, created_at, requester:profiles!substitute_requests_requester_id_fkey(full_name)")
                .eq("substitute_id", profile.id)
                .eq("status", "pending")
                .order("created_at", { ascending: false });
            setInboundRequests((inbound ?? []) as any);

            // Notifications
            const { data: notifs } = await supabase.from("notifications").select("*").eq("recipient_id", profile.id).order("created_at", { ascending: false }).limit(10);
            setNotifications(notifs ?? []);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, profile.id]);

    const loadSlots = async (genId: string, facId: string) => {
        const { data } = await supabase.from("generated_timetables").select("matrix_data").eq("id", genId).single();
        const slots = extractSlots(data?.matrix_data).filter(s => s.faculty_id === facId);
        setAllSlots(slots);
    };

    const handleGenChange = async (genId: string) => {
        setSelectedGenId(genId);
        if (facultySetting?.id) await loadSlots(genId, facultySetting.id);
    };

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const channel = supabase.channel(`notifs:${profile.id}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${profile.id}` }, payload => {
                setNotifications(prev => [payload.new as Notification, ...prev]);
            }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [profile.id, supabase]);

    const todaySlots = allSlots.filter(s => s.day === todayDay).sort((a, b) => a.time_slot - b.time_slot);

    const findSubstitutes = async () => {
        if (!selectedSlot) return;
        setIsSearchingSub(true);
        try {
            const { data: allFac } = await supabase.from("faculty_settings").select("id, shift_hours, max_load_hrs, profiles(id, full_name, email)").neq("id", facultySetting?.id ?? "");
            const candidates = (allFac ?? []).filter((f: any) => (f.shift_hours as number[]).includes(selectedSlot.time_slot)).map((f: any) => ({
                faculty_id: f.id, name: f.profiles?.full_name ?? "Unknown", email: f.profiles?.email ?? "", current_load: f.max_load_hrs ?? 0, status: "Available & On Shift",
            }));
            setSubstitutes(candidates);
        } catch (err: any) {
            toast.error("Could not load substitutes: " + err?.message);
        } finally {
            setIsSearchingSub(false);
        }
    };

    const sendRequest = async (candidate: SubstituteCandidate) => {
        if (!selectedSlot || !institutionId) return;
        setSendingRequestTo(candidate.faculty_id);
        try {
            const { data: reqRecord, error: reqErr } = await supabase.from("substitute_requests").insert({
                institution_id: institutionId, requester_id: profile.id, substitute_id: candidate.faculty_id,
                subject_code: selectedSlot.subject, room: selectedSlot.room, day: selectedSlot.day, time_slot: selectedSlot.time_slot, status: "pending",
            }).select().single();
            if (reqErr) throw reqErr;

            // In-app notification
            const { data: facData } = await supabase.from("faculty_settings").select("profile_id").eq("id", candidate.faculty_id).single();
            if (facData?.profile_id) {
                await supabase.from("notifications").insert({
                    recipient_id: facData.profile_id, sender_id: profile.id, type: "substitute_request",
                    message: `${profile.full_name} is requesting you to substitute for "${selectedSlot.subject}" on ${selectedSlot.day} at ${formatTime(selectedSlot.time_slot)}.`,
                    metadata: { request_id: reqRecord.id, subject_code: selectedSlot.subject, room: selectedSlot.room, day: selectedSlot.day, time_slot: selectedSlot.time_slot }, is_read: false,
                });
            }

            // Email notification to the substitute candidate
            if (candidate.email) {
                await fetch("/api/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: candidate.email,
                        subject: `Substitute Request — ${selectedSlot.subject} (${selectedSlot.day})`,
                        recipientName: candidate.name,
                        type: "substitute_request",
                        payload: {
                            requesterName: profile.full_name ?? "A colleague",
                            subject: selectedSlot.subject,
                            day: selectedSlot.day,
                            timeSlot: formatTime(selectedSlot.time_slot),
                            room: selectedSlot.room ?? "TBD",
                            division: (selectedSlot.division ?? selectedSlot.target_groups?.join(", ") ?? ""),
                        },
                    }),
                });
            }

            setSentRequests(prev => new Set([...prev, candidate.faculty_id]));
            toast.success(`Request sent to ${candidate.name}`);
        } catch (err: any) { toast.error("Failed to send request: " + err.message); }
        finally { setSendingRequestTo(null); }
    };

    const respondToRequest = async (requestId: string, accept: boolean) => {
        setRespondingTo(requestId);
        try {
            await supabase.from("substitute_requests").update({ status: accept ? "accepted" : "declined" }).eq("id", requestId);
            const req = inboundRequests.find(r => r.id === requestId);
            if (req) {
                const { data: reqRecord } = await supabase.from("substitute_requests").select("requester_id").eq("id", requestId).single();
                if (reqRecord?.requester_id) {
                    // In-app notification
                    await supabase.from("notifications").insert({
                        recipient_id: reqRecord.requester_id, sender_id: profile.id,
                        type: accept ? "substitute_accepted" : "substitute_declined",
                        message: `${profile.full_name} has ${accept ? "accepted" : "declined"} your substitution request for "${req.subject_code}" on ${req.day} at ${formatTime(req.time_slot)}.`,
                        metadata: { request_id: requestId }, is_read: false,
                    });

                    // Email notification to requester
                    const { data: requesterProfile } = await supabase.from("profiles").select("email, full_name").eq("id", reqRecord.requester_id).single();
                    if (requesterProfile?.email) {
                        await fetch("/api/email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: requesterProfile.email,
                                subject: `Substitute ${accept ? "Accepted" : "Declined"} — ${req.subject_code} (${req.day})`,
                                recipientName: requesterProfile.full_name ?? "Faculty",
                                type: accept ? "substitute_accepted" : "substitute_declined",
                                payload: {
                                    substituteName: profile.full_name ?? "Your substitute",
                                    subject: req.subject_code,
                                    day: req.day,
                                    timeSlot: formatTime(req.time_slot),
                                    room: req.room ?? "TBD",
                                },
                            }),
                        });
                    }
                }
            }
            // Insert substitution overlay row on accept
            if (accept && req && institutionId) {
                await supabase.from("substitutions").insert({
                    institution_id: institutionId,
                    day: req.day,
                    time_slot: String(req.time_slot),
                    room: req.room ?? "",
                    subject_code: req.subject_code,
                    original_faculty_name: req.requester?.full_name ?? "",
                    substitute_faculty_id: facultySetting?.id ?? null,
                    substitute_faculty_name: profile.full_name ?? "",
                    substitute_request_id: requestId,
                    status: "active",
                });
            }
            setInboundRequests(prev => prev.filter(r => r.id !== requestId));
            toast.success(accept ? "Request accepted" : "Request declined");
        } catch (err: any) { toast.error("Response failed: " + err.message); }
        finally { setRespondingTo(null); }
    };

    const markAllRead = async () => {
        await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", profile.id).eq("is_read", false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    if (isLoading) return (
        <div className="h-[50vh] flex items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
            <span className="text-sm">Loading your schedule...</span>
        </div>
    );

    const unreadCount = notifications.filter(n => !n.is_read).length;
    const shiftStart = facultySetting?.shift_hours?.[0] ?? 8;
    const shiftEnd = (facultySetting?.shift_hours?.[(facultySetting.shift_hours.length ?? 1) - 1] ?? 16) + 1;

    // Full week slot map
    const weekMap: Record<string, Record<number, TimetableSlot>> = {};
    DAYS.forEach(d => { weekMap[d] = {}; });
    allSlots.forEach(s => { if (weekMap[s.day]) weekMap[s.day][s.time_slot] = s; });

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
            {/* Profile hero */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-5 relative z-10">
                    <Avatar className="w-20 h-20 border-4 border-white dark:border-slate-950 shadow-md">
                        <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-2xl font-bold">
                            {getInitials(profile.full_name ?? "FA")}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{profile.full_name}</h1>
                        <p className="text-slate-500 dark:text-slate-400 capitalize">{profile.role}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <Clock className="w-3 h-3 mr-1" />
                                Shift: {formatTime(shiftStart)} – {formatTime(shiftEnd)}
                            </Badge>
                            <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
                                {facultySetting?.max_load_hrs ?? "—"} hrs/wk max
                            </Badge>
                            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900">
                                {allSlots.length} slots assigned
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 relative z-10 flex-wrap">
                    {generations.length > 0 && (
                        <select
                            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-slate-600 dark:text-slate-400"
                            value={selectedGenId}
                            onChange={e => handleGenChange(e.target.value)}
                        >
                            {generations.map((g, i) => (
                                <option key={g.id} value={g.id}>
                                    {g.is_active ? "● " : ""}{format(new Date(g.created_at), "MMM d · h:mm a")}
                                    {i === 0 ? " (Latest)" : ""}
                                </option>
                            ))}
                        </select>
                    )}
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900" onClick={fetchData}>
                        <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Schedule column */}
                <div className="md:col-span-2 space-y-4">
                    <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" /> Schedule
                            </h2>
                            <TabsList className="h-8">
                                <TabsTrigger value="today" className="text-xs h-7 px-3">Today ({todayDay})</TabsTrigger>
                                <TabsTrigger value="week" className="text-xs h-7 px-3">Full Week</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Today tab */}
                        <TabsContent value="today" className="mt-4">
                            {todaySlots.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 bg-white dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <BookOpen className="w-10 h-10 mb-3 text-slate-300" />
                                    <p className="font-medium text-slate-500">No classes today</p>
                                    <p className="text-sm mt-1">Generate a timetable or switch to Full Week view.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {todaySlots.map((slot, idx) => (
                                        <motion.div key={`${slot.workload_id}-${slot.time_slot}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}>
                                            <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${slotColor(slot)}`} />
                                                <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                    <div className="flex gap-6 items-center w-full sm:w-auto">
                                                        <div className="text-center w-24 shrink-0">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{formatTime(slot.time_slot)}</p>
                                                            <p className="text-xs text-slate-400 mt-0.5">1 hr block</p>
                                                        </div>
                                                        <div className="flex-1 border-l border-slate-100 dark:border-slate-800 pl-6 space-y-1 py-1">
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                <Badge variant="outline" className={`text-[10px] px-1.5 ${slotBadgeClass(slot)}`}>
                                                                    {slot.is_online ? "ONLINE" : slot.type.toUpperCase()}
                                                                </Badge>
                                                                {slot.target_groups.map(tg => (
                                                                    <span key={tg} className="text-[10px] font-semibold text-slate-500">{tg}</span>
                                                                ))}
                                                            </div>
                                                            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">{slot.subject}</h3>
                                                            <div className="text-sm text-slate-500 flex items-center gap-1.5 pt-0.5">
                                                                {slot.is_online ? <Wifi className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                                                {slot.room}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={() => { setSelectedSlot(slot); setIsAbsentModalOpen(true); setSubstitutes([]); setSentRequests(new Set()); }}>
                                                        <UserX className="w-4 h-4 mr-2" /> Mark Absent
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Full week tab */}
                        <TabsContent value="week" className="mt-4">
                            {allSlots.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">No schedule available for this generation</p>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                                <th className="w-20 py-3 px-4 text-left text-slate-400 font-medium">Time</th>
                                                {DAYS.map(d => (
                                                    <th key={d} className={`py-3 px-2 text-center font-semibold ${d === todayDay ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"}`}>
                                                        {d}{d === todayDay && <span className="ml-1 text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1 rounded">Today</span>}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ALL_SLOTS.map(slot => (
                                                <tr key={slot} className="border-t border-slate-100 dark:border-slate-800/50">
                                                    <td className="py-1.5 px-4 text-slate-400 font-mono text-[10px]">{formatTime(slot)}</td>
                                                    {DAYS.map(day => {
                                                        const s = weekMap[day]?.[slot];
                                                        return (
                                                            <td key={day} className="px-1 py-1 h-14">
                                                                {s ? (
                                                                    <div className={`h-full rounded-lg p-1.5 flex flex-col justify-between cursor-pointer hover:opacity-90 transition-opacity ${
                                                                        s.is_online ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800"
                                                                        : s.type === "Practical" ? "bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800"
                                                                        : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                                                    }`} onClick={() => { setSelectedSlot(s); setIsAbsentModalOpen(true); setSubstitutes([]); setSentRequests(new Set()); }}>
                                                                        <p className="font-bold text-[10px] text-slate-800 dark:text-slate-100 truncate leading-tight">{s.subject}</p>
                                                                        <span className="text-[9px] text-slate-500 truncate">{s.room}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-full rounded-lg bg-slate-50 dark:bg-slate-900/20 border border-dashed border-slate-100 dark:border-slate-800/30" />
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right column — requests + notifications */}
                <div className="space-y-4">
                    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                Pending Requests
                                {inboundRequests.length > 0 && <Badge className="ml-auto text-xs bg-orange-500 text-white">{inboundRequests.length}</Badge>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {inboundRequests.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">No pending substitute requests.</p>
                            ) : inboundRequests.map(req => (
                                <div key={req.id} className="p-3 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-500/5 text-sm">
                                    <p className="font-medium text-slate-900 dark:text-slate-50 mb-0.5">{req.subject_code}</p>
                                    <p className="text-slate-500 text-xs mb-1">{(req.requester as any)?.full_name ?? "A colleague"} · {req.day} {formatTime(req.time_slot)} · {req.room}</p>
                                    <div className="flex gap-2 mt-2">
                                        <Button size="sm" className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={respondingTo === req.id} onClick={() => respondToRequest(req.id, true)}>
                                            {respondingTo === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3 mr-1" />} Accept
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-red-600 border-red-200 hover:bg-red-50" disabled={respondingTo === req.id} onClick={() => respondToRequest(req.id, false)}>
                                            <ThumbsDown className="w-3 h-3 mr-1" /> Decline
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-blue-500" /> Notifications
                                    {unreadCount > 0 && <Badge className="text-xs bg-blue-600 text-white">{unreadCount}</Badge>}
                                </CardTitle>
                                {unreadCount > 0 && <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400 hover:text-slate-700" onClick={markAllRead}>Mark all read</Button>}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">No notifications yet.</p>
                            ) : notifications.map(n => (
                                <div key={n.id} className={`p-2.5 rounded-lg text-xs transition-colors ${n.is_read ? "bg-transparent text-slate-500" : "bg-blue-50 dark:bg-blue-500/10 text-slate-700 dark:text-slate-300 border border-blue-100 dark:border-blue-500/20"}`}>
                                    <div className="flex items-start gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${n.is_read ? "bg-slate-300" : "bg-blue-500"}`} />
                                        <p className="leading-relaxed">{n.message}</p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 pl-3.5">{new Date(n.created_at).toLocaleString()}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Substitute modal */}
            <Dialog open={isAbsentModalOpen} onOpenChange={o => { if (!o) setIsAbsentModalOpen(false); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><UserX className="w-5 h-5 text-red-500" />Mark Absent & Find Substitute</DialogTitle>
                        <DialogDescription>{selectedSlot && `Marking absent for "${selectedSlot.subject}" — ${selectedSlot.day} at ${formatTime(selectedSlot.time_slot)}.`}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {substitutes.length === 0 ? (
                            <div className="flex justify-center py-4">
                                <Button onClick={findSubstitutes} disabled={isSearchingSub} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                                    {isSearchingSub ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching available faculty...</> : <><Search className="w-4 h-4 mr-2" />Search Available Substitutes</>}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{substitutes.length} faculty on shift</p>
                                <AnimatePresence>
                                    {substitutes.map((sub, i) => {
                                        const alreadySent = sentRequests.has(sub.faculty_id);
                                        const isSending = sendingRequestTo === sub.faculty_id;
                                        return (
                                            <motion.div key={sub.faculty_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-9 h-9 border border-slate-200 dark:border-slate-700">
                                                        <AvatarFallback className="text-xs bg-gradient-to-tr from-teal-500 to-blue-500 text-white">{getInitials(sub.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-50">{sub.name}</p>
                                                        <p className="text-[10px] text-slate-400">{sub.status}</p>
                                                    </div>
                                                </div>
                                                <Button size="sm" disabled={alreadySent || isSending} onClick={() => sendRequest(sub)} className={`text-xs ${alreadySent ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200" : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"}`} variant={alreadySent ? "outline" : "default"}>
                                                    {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : alreadySent ? <><CheckCircle2 className="w-3 h-3 mr-1" />Sent</> : <><Send className="w-3 h-3 mr-1" />Request</>}
                                                </Button>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════
// ── Main: Role-Gated Entry Point ───────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
export default function FacultyPage() {
    const supabase = createClient();
    const [profile, setProfile] = useState<{ id: string; full_name: string; role: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) { setIsLoading(false); return; }
            supabase.from("profiles").select("id, full_name, role").eq("id", user.id).single().then(({ data }) => {
                setProfile(data ?? null);
                setIsLoading(false);
            });
        });
    }, [supabase]);

    if (isLoading) return (
        <div className="h-[60vh] flex items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
    );

    if (!profile) return <div className="text-center py-20 text-slate-400">Not authenticated.</div>;

    // Admin → Faculty Directory; everyone else → Personal Portal
    return profile.role === "admin"
        ? <AdminFacultyDirectory />
        : <FacultyPersonalPortal profile={profile} />;
}
