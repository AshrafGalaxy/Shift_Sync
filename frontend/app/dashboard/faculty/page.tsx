"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar, MapPin, Clock, Search, Send, UserX, AlertTriangle,
    CheckCircle2, Loader2, Wifi, BookOpen, Bell, ThumbsUp, ThumbsDown, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/utils/supabase/client";

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
    is_online: boolean;
}

interface SubstituteCandidate {
    faculty_id: string;
    name: string;
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

// ── Helpers ────────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TODAY_DAY = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] ?? "Mon";

function formatTime(slot: number) {
    const h = slot % 12 === 0 ? 12 : slot % 12;
    const ampm = slot < 12 ? "AM" : "PM";
    return `${h}:00 ${ampm}`;
}

function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Main Component ─────────────────────────────────────────────────────
export default function FacultyDashboard() {
    const supabase = createClient();

    // Profile & timetable state
    const [profile, setProfile] = useState<{ id: string; full_name: string; role: string } | null>(null);
    const [facultySetting, setFacultySetting] = useState<{ id: string; shift_hours: number[]; max_load_hrs: number } | null>(null);
    const [todaySlots, setTodaySlots] = useState<TimetableSlot[]>([]);
    const [institutionId, setInstitutionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Substitute search state
    const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
    const [isAbsentModalOpen, setIsAbsentModalOpen] = useState(false);
    const [isSearchingSub, setIsSearchingSub] = useState(false);
    const [substitutes, setSubstitutes] = useState<SubstituteCandidate[]>([]);
    const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

    // Notifications state
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [inboundRequests, setInboundRequests] = useState<SubRequest[]>([]);
    const [respondingTo, setRespondingTo] = useState<string | null>(null);

    // ── Data Fetch ──────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch profile
            const { data: prof } = await supabase
                .from("profiles")
                .select("id, full_name, role, institution_id")
                .eq("id", user.id)
                .single();
            if (!prof) return;
            setProfile(prof);
            setInstitutionId(prof.institution_id);

            // 2. Fetch faculty_settings for this profile
            const { data: fac } = await supabase
                .from("faculty_settings")
                .select("id, shift_hours, max_load_hrs")
                .eq("profile_id", user.id)
                .maybeSingle();
            setFacultySetting(fac ?? null);

            // 3. Fetch the latest active timetable and extract today's slots for this faculty
            const { data: tt } = await supabase
                .from("generated_timetables")
                .select("matrix_data")
                .eq("institution_id", prof.institution_id)
                .eq("status", "success")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (tt?.matrix_data && fac?.id) {
                const matrix: TimetableSlot[] = Array.isArray(tt.matrix_data) ? tt.matrix_data : Object.values(tt.matrix_data);
                const mySlots = matrix.filter((s) => s.faculty_id === fac.id && s.day === TODAY_DAY);
                setTodaySlots(mySlots.sort((a, b) => a.time_slot - b.time_slot));
            }

            // 4. Fetch inbound substitute requests (someone asked me to sub)
            const { data: inbound } = await supabase
                .from("substitute_requests")
                .select("id, subject_code, room, day, time_slot, status, created_at, requester:profiles!substitute_requests_requester_id_fkey(full_name)")
                .eq("substitute_id", user.id)
                .eq("status", "pending")
                .order("created_at", { ascending: false });
            setInboundRequests((inbound ?? []) as any);

            // 5. Fetch notifications for this user
            const { data: notifs } = await supabase
                .from("notifications")
                .select("*")
                .eq("recipient_id", user.id)
                .order("created_at", { ascending: false })
                .limit(10);
            setNotifications(notifs ?? []);

        } catch (err) {
            console.error("Faculty portal fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Real-time subscription for new notifications ────────────────────
    useEffect(() => {
        if (!profile?.id) return;
        const channel = supabase
            .channel(`notifications:${profile.id}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `recipient_id=eq.${profile.id}`,
            }, (payload) => {
                setNotifications((prev) => [payload.new as Notification, ...prev]);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [profile?.id, supabase]);

    // ── Substitute Search ───────────────────────────────────────────────
    const handleMarkAbsent = (slot: TimetableSlot) => {
        setSelectedSlot(slot);
        setIsAbsentModalOpen(true);
        setSubstitutes([]);
        setSentRequests(new Set());
    };

    const findSubstitutes = async () => {
        if (!selectedSlot || !institutionId) return;
        setIsSearchingSub(true);
        try {
            const res = await fetch(
                `http://127.0.0.1:8000/api/v1/substitute-search?time_index=${selectedSlot.time_slot}&day=${selectedSlot.day}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ institution_id: institutionId }),
                }
            );
            if (!res.ok) throw new Error("Search failed");
            const data = await res.json();
            setSubstitutes(data.available_substitutes ?? []);
        } catch {
            // Fallback: fetch any faculty from Supabase on the same shift slot
            const { data: allFaculty } = await supabase
                .from("faculty_settings")
                .select("id, shift_hours, profiles(id, full_name)")
                .neq("id", facultySetting?.id ?? "");

            const candidates = (allFaculty ?? [])
                .filter((f: any) => (f.shift_hours as number[]).includes(selectedSlot.time_slot))
                .map((f: any) => ({
                    faculty_id: f.id,
                    name: f.profiles?.full_name ?? "Unknown",
                    current_load: 0,
                    status: "Available & On Shift",
                }));
            setSubstitutes(candidates);
        } finally {
            setIsSearchingSub(false);
        }
    };

    const sendRequest = async (candidate: SubstituteCandidate) => {
        if (!profile || !selectedSlot || !institutionId) return;
        setSendingRequestTo(candidate.faculty_id);
        try {
            // 1. Insert substitute_request record
            const { data: reqRecord, error: reqErr } = await supabase
                .from("substitute_requests")
                .insert({
                    institution_id: institutionId,
                    requester_id: profile.id,
                    substitute_id: candidate.faculty_id,
                    subject_code: selectedSlot.subject,
                    room: selectedSlot.room,
                    day: selectedSlot.day,
                    time_slot: selectedSlot.time_slot,
                    status: "pending",
                })
                .select()
                .single();
            if (reqErr) throw reqErr;

            // 2. Insert notification for the substitute faculty
            // We need their profile_id — candidate.faculty_id is faculty_settings.id
            const { data: facData } = await supabase
                .from("faculty_settings")
                .select("profile_id")
                .eq("id", candidate.faculty_id)
                .single();

            if (facData?.profile_id) {
                await supabase.from("notifications").insert({
                    recipient_id: facData.profile_id,
                    sender_id: profile.id,
                    type: "substitute_request",
                    message: `${profile.full_name} is requesting you to substitute for "${selectedSlot.subject}" on ${selectedSlot.day} at ${formatTime(selectedSlot.time_slot)}.`,
                    metadata: {
                        request_id: reqRecord.id,
                        subject_code: selectedSlot.subject,
                        room: selectedSlot.room,
                        day: selectedSlot.day,
                        time_slot: selectedSlot.time_slot,
                    },
                    is_read: false,
                });
            }

            setSentRequests((prev) => new Set([...prev, candidate.faculty_id]));
        } catch (err: any) {
            alert("Failed to send request: " + err.message);
        } finally {
            setSendingRequestTo(null);
        }
    };

    // ── Respond to Inbound Requests ─────────────────────────────────────
    const respondToRequest = async (requestId: string, accept: boolean) => {
        setRespondingTo(requestId);
        try {
            const newStatus = accept ? "accepted" : "declined";
            await supabase
                .from("substitute_requests")
                .update({ status: newStatus })
                .eq("id", requestId);

            // Notify the requester
            const req = inboundRequests.find((r) => r.id === requestId);
            if (req) {
                // Get the requester's profile — from the nested join data
                const { data: reqRecord } = await supabase
                    .from("substitute_requests")
                    .select("requester_id")
                    .eq("id", requestId)
                    .single();

                if (reqRecord?.requester_id) {
                    await supabase.from("notifications").insert({
                        recipient_id: reqRecord.requester_id,
                        sender_id: profile!.id,
                        type: accept ? "substitute_accepted" : "substitute_declined",
                        message: `${profile!.full_name} has ${accept ? "accepted" : "declined"} your substitution request for "${req.subject_code}" on ${req.day} at ${formatTime(req.time_slot)}.`,
                        metadata: { request_id: requestId },
                        is_read: false,
                    });
                }
            }

            setInboundRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch (err: any) {
            alert("Response failed: " + err.message);
        } finally {
            setRespondingTo(null);
        }
    };

    const markAllRead = async () => {
        if (!profile) return;
        await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", profile.id).eq("is_read", false);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    };

    // ── Loading state ───────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm">Loading your schedule...</p>
            </div>
        );
    }

    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const shiftStart = facultySetting?.shift_hours?.[0] ?? 8;
    const shiftEnd = (facultySetting?.shift_hours?.[(facultySetting.shift_hours.length ?? 1) - 1] ?? 16) + 1;

    // ── Render ──────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">

            {/* ── Profile Hero ─────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-5 relative z-10">
                    <Avatar className="w-20 h-20 border-4 border-white dark:border-slate-950 shadow-md">
                        <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-2xl font-bold">
                            {getInitials(profile?.full_name ?? "FA")}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{profile?.full_name ?? "Faculty"}</h1>
                        <p className="text-slate-500 dark:text-slate-400 capitalize">{profile?.role ?? "Faculty"}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <Clock className="w-3 h-3 mr-1" />
                                Shift: {formatTime(shiftStart)} – {formatTime(shiftEnd)}
                            </Badge>
                            <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
                                {facultySetting?.max_load_hrs ?? "—"} hrs/wk max
                            </Badge>
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="relative z-10 text-slate-500 hover:text-slate-900"
                    onClick={fetchData}
                >
                    <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
                </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">

                {/* ── Today's Schedule ──────────────────────────────────── */}
                <div className="md:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Today's Schedule
                        <Badge variant="secondary" className="ml-1 text-xs font-normal">{TODAY_DAY}</Badge>
                    </h2>

                    {todaySlots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 bg-white dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                            <BookOpen className="w-10 h-10 mb-3 text-slate-300" />
                            <p className="font-medium text-slate-500">No classes scheduled for today</p>
                            <p className="text-sm mt-1">Generate a timetable or check another day.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {todaySlots.map((slot, idx) => (
                                <motion.div
                                    key={`${slot.workload_id}-${slot.time_slot}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.06 }}
                                >
                                    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${slot.is_online ? "bg-indigo-500" : slot.type === "Practical" ? "bg-teal-500" : slot.type === "Tutorial" ? "bg-purple-500" : "bg-blue-500"}`} />
                                        <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="flex gap-6 items-center w-full sm:w-auto">
                                                <div className="text-center w-24 shrink-0">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{formatTime(slot.time_slot)}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">1 hr block</p>
                                                </div>
                                                <div className="flex-1 border-l border-slate-100 dark:border-slate-800 pl-6 space-y-1 py-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <Badge variant="outline" className={`text-[10px] px-1.5 ${slot.is_online ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200" : slot.type === "Practical" ? "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200" : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200"}`}>
                                                            {slot.is_online ? "ONLINE" : slot.type.toUpperCase()}
                                                        </Badge>
                                                        {slot.target_groups.map((tg) => (
                                                            <span key={tg} className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{tg}</span>
                                                        ))}
                                                    </div>
                                                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">{slot.subject}</h3>
                                                    <div className="text-sm text-slate-500 flex items-center gap-1.5 pt-0.5">
                                                        {slot.is_online ? <Wifi className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                                        {slot.room}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full sm:w-auto flex justify-end shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                                                    onClick={() => handleMarkAbsent(slot)}
                                                >
                                                    <UserX className="w-4 h-4 mr-2" />
                                                    Mark Absent
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right Column ──────────────────────────────────────── */}
                <div className="space-y-4">

                    {/* Inbound Substitute Requests */}
                    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                Pending Requests
                                {inboundRequests.length > 0 && (
                                    <Badge className="ml-auto text-xs bg-orange-500 text-white">{inboundRequests.length}</Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {inboundRequests.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">No pending substitute requests.</p>
                            ) : (
                                inboundRequests.map((req) => (
                                    <div key={req.id} className="p-3 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-500/5 text-sm">
                                        <p className="font-medium text-slate-900 dark:text-slate-50 mb-0.5">{req.subject_code}</p>
                                        <p className="text-slate-500 text-xs mb-1">
                                            {(req.requester as any)?.full_name ?? "A colleague"} · {req.day} {formatTime(req.time_slot)} · {req.room}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <Button
                                                size="sm"
                                                className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                disabled={respondingTo === req.id}
                                                onClick={() => respondToRequest(req.id, true)}
                                            >
                                                {respondingTo === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3 mr-1" />}
                                                Accept
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                                disabled={respondingTo === req.id}
                                                onClick={() => respondToRequest(req.id, false)}
                                            >
                                                <ThumbsDown className="w-3 h-3 mr-1" />
                                                Decline
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Notification Feed */}
                    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-blue-500" />
                                    Notifications
                                    {unreadCount > 0 && (
                                        <Badge className="text-xs bg-blue-600 text-white">{unreadCount}</Badge>
                                    )}
                                </CardTitle>
                                {unreadCount > 0 && (
                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400 hover:text-slate-700" onClick={markAllRead}>
                                        Mark all read
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-4">No notifications yet.</p>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`p-2.5 rounded-lg text-xs transition-colors ${n.is_read ? "bg-transparent text-slate-500" : "bg-blue-50 dark:bg-blue-500/10 text-slate-700 dark:text-slate-300 border border-blue-100 dark:border-blue-500/20"}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${n.is_read ? "bg-slate-300" : "bg-blue-500"}`} />
                                            <p className="leading-relaxed">{n.message}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 pl-3.5">{new Date(n.created_at).toLocaleString()}</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Substitute Search Modal ───────────────────────────────── */}
            <Dialog open={isAbsentModalOpen} onOpenChange={(o) => { if (!o) setIsAbsentModalOpen(false); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserX className="w-5 h-5 text-red-500" />
                            Mark Absent & Find Substitute
                        </DialogTitle>
                        <DialogDescription>
                            {selectedSlot && `Marking absent for "${selectedSlot.subject}" — ${selectedSlot.day} at ${formatTime(selectedSlot.time_slot)}.`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {substitutes.length === 0 ? (
                            <div className="flex justify-center py-4">
                                <Button
                                    onClick={findSubstitutes}
                                    disabled={isSearchingSub}
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                                >
                                    {isSearchingSub ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching available faculty...</>
                                    ) : (
                                        <><Search className="w-4 h-4 mr-2" /> Search Available Substitutes</>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {substitutes.length} faculty on shift
                                </p>
                                <AnimatePresence>
                                    {substitutes.map((sub, i) => {
                                        const alreadySent = sentRequests.has(sub.faculty_id);
                                        const isSending = sendingRequestTo === sub.faculty_id;
                                        return (
                                            <motion.div
                                                key={sub.faculty_id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.07 }}
                                                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-9 h-9 border border-slate-200 dark:border-slate-700">
                                                        <AvatarFallback className="text-xs bg-gradient-to-tr from-teal-500 to-blue-500 text-white">
                                                            {getInitials(sub.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-50">{sub.name}</p>
                                                        <p className="text-[10px] text-slate-400">{sub.status}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    disabled={alreadySent || isSending}
                                                    onClick={() => sendRequest(sub)}
                                                    className={`text-xs ${alreadySent ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200" : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"}`}
                                                    variant={alreadySent ? "outline" : "default"}
                                                >
                                                    {isSending ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : alreadySent ? (
                                                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Sent</>
                                                    ) : (
                                                        <><Send className="w-3 h-3 mr-1" /> Request</>
                                                    )}
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
