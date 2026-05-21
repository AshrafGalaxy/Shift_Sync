"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Loader2, Server, Info, Sun, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function FacultyForm({ onSuccess }: { onSuccess: () => void }) {
    const [maxHours, setMaxHours] = useState("");
    const [maxContinuousHours, setMaxContinuousHours] = useState("3");
    const [classTeacher, setClassTeacher] = useState("");
    // Shift hours: set of active hour integers (blue = on-shift)
    const [shiftHours, setShiftHours] = useState<Set<number>>(new Set([8, 9, 10, 11, 12, 13, 14, 15]));
    // Blocked slots: {day, time} pairs (red = unavailable)
    const [blockedSlots, setBlockedSlots] = useState<{ day: string; time: number }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingFaculty, setExistingFaculty] = useState<any[]>([]);
    const [autoSaved, setAutoSaved] = useState(false);
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const supabase = createClient();

    const fetchFaculty = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
            .from("faculty_settings")
            .select("*")
            .eq("profile_id", user.id)
            .order("created_at", { ascending: false });
        if (data) setExistingFaculty(data);
    };

    useEffect(() => {
        fetchFaculty();
    }, []);

    // Auto-save blocked_slots to the most recent record for this user
    const autoSaveBlocked = async (newBlocked: { day: string; time: number }[]) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: latest } = await supabase
            .from("faculty_settings")
            .select("id")
            .eq("profile_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (!latest?.id) return;
        await supabase.from("faculty_settings").update({ blocked_slots: newBlocked }).eq("id", latest.id);
        setAutoSaved(true);
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => setAutoSaved(false), 1800);
    };

    const toggleShiftHour = (hour: number) => {
        setShiftHours(prev => {
            const next = new Set(prev);
            next.has(hour) ? next.delete(hour) : next.add(hour);
            return next;
        });
    };

    const toggleBlocked = (day: string, time: number) => {
        const isBlocked = blockedSlots.some(s => s.day === day && s.time === time);
        const newBlocked = isBlocked
            ? blockedSlots.filter(s => !(s.day === day && s.time === time))
            : [...blockedSlots, { day, time }];
        setBlockedSlots(newBlocked);
        autoSaveBlocked(newBlocked);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");
            const { data: profile } = await supabase
                .from("profiles")
                .select("institution_id")
                .eq("id", user.id)
                .single();
            if (!profile?.institution_id)
                throw new Error("⚠️ Missing Global Settings. Please complete Step 1 (Global Settings tab) first.");

            const { error } = await supabase.from("faculty_settings").insert({
                profile_id: user.id,
                max_load_hrs: parseInt(maxHours),
                max_continuous_hrs: parseInt(maxContinuousHours),
                shift_hours: Array.from(shiftHours).sort((a, b) => a - b),
                blocked_slots: blockedSlots,
                class_teacher_for: classTeacher || null,
            });
            if (error) throw error;

            alert("Faculty constraints saved!");
            setMaxHours("");
            setClassTeacher("");
            setBlockedSlots([]);
            setShiftHours(new Set([8, 9, 10, 11, 12, 13, 14, 15]));
            fetchFaculty();
            onSuccess();
        } catch (err: any) {
            alert(err.message || "Failed to save faculty settings");
        }
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 max-w-xl mx-auto border border-slate-200 dark:border-slate-800 p-6 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            {/* Guide */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-200">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                    <strong>Faculty Constraints Guide:</strong> Paint your shift hours in <span className="text-blue-600 font-semibold">blue</span> below, then mark unavailable slots in <span className="text-red-500 font-semibold">red</span>. Blocked slots auto-save after submission.
                </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Configure Faculty Rules</h3>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Maximum Weekly Load (hrs)</Label>
                    <Input required type="number" min="1" max="40" placeholder="16" value={maxHours} onChange={e => setMaxHours(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Consecutive Burnout Limit (hrs)</Label>
                    <Input required type="number" min="1" max="5" placeholder="3" value={maxContinuousHours} onChange={e => setMaxContinuousHours(e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Class Teacher For (Optional)</Label>
                <Input placeholder="e.g. SY-CSDS-A" value={classTeacher} onChange={e => setClassTeacher(e.target.value)} />
            </div>

            {/* ── Shift Grid ───────────────────────────────────────────── */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-blue-500" />
                    <span>Shift Hours</span>
                    <span className="text-xs text-slate-500 font-normal ml-auto">Click hours to mark as <span className="text-blue-600 font-semibold">On-Shift</span></span>
                </Label>
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 overflow-x-auto">
                    <div className="flex gap-1.5 min-w-max">
                        {HOURS.map(hour => {
                            const active = shiftHours.has(hour);
                            return (
                                <button
                                    type="button"
                                    key={hour}
                                    onClick={() => toggleShiftHour(hour)}
                                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-xs font-mono font-medium transition-all select-none ${active
                                        ? "bg-blue-500 border-blue-600 text-white shadow-inner shadow-blue-600/30"
                                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    <span>{hour}:00</span>
                                    <span className="text-[9px] font-normal opacity-70">{hour < 12 ? "AM" : "PM"}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                        {shiftHours.size === 0
                            ? "No shift hours selected — will inherit global time slots."
                            : `${shiftHours.size} hour${shiftHours.size !== 1 ? "s" : ""} selected (${Math.min(...shiftHours)}:00 – ${Math.max(...shiftHours) + 1}:00)`}
                    </p>
                </div>
            </div>

            {/* ── Blocked Slots Grid ───────────────────────────────────── */}
            <div className="space-y-2 relative">
                <Label className="flex items-center gap-2">
                    <Ban className="w-4 h-4 text-red-500" />
                    <span>Absence Map</span>
                    <span className="text-xs text-slate-500 font-normal ml-auto">Click to mark <span className="text-red-500 font-semibold">Unavailable</span></span>
                </Label>
                {/* Auto-save flash */}
                {autoSaved && (
                    <span className="absolute right-0 top-0 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded animate-in fade-in duration-200">
                        ✓ Auto-saved
                    </span>
                )}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 md:p-3 overflow-x-auto">
                    <div className="flex gap-1.5 w-[520px] md:w-full">
                        {/* Day labels */}
                        <div className="flex flex-col gap-1 w-10 shrink-0 pt-6">
                            {DAYS.map(d => (
                                <div key={d} className="h-8 flex items-center justify-center text-[10px] font-medium text-slate-500">{d}</div>
                            ))}
                        </div>
                        {/* Hour columns */}
                        <div className="flex-1 flex gap-1">
                            {HOURS.map(hour => (
                                <div key={hour} className="flex-1 flex flex-col gap-1 min-w-[30px]">
                                    <div className="h-5 flex items-center justify-center text-[10px] text-slate-400 font-mono mb-1">{hour}</div>
                                    {DAYS.map(day => {
                                        const isBlocked = blockedSlots.some(s => s.day === day && s.time === hour);
                                        const inShift = shiftHours.has(hour);
                                        return (
                                            <div
                                                key={`${day}-${hour}`}
                                                onClick={() => toggleBlocked(day, hour)}
                                                title={isBlocked ? `${day} ${hour}:00 — Blocked` : inShift ? `${day} ${hour}:00 — On Shift` : `${day} ${hour}:00 — Off Shift`}
                                                className={`h-8 rounded cursor-pointer transition-all border select-none ${
                                                    isBlocked
                                                        ? "bg-red-500 border-red-600 shadow-inner"
                                                        : inShift
                                                            ? "bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30 hover:bg-red-100 dark:hover:bg-red-500/20"
                                                            : "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-40"
                                                }`}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-300 inline-block" /> On Shift</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 border border-red-600 inline-block" /> Blocked / Absent</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-300 inline-block opacity-50" /> Off Shift</span>
                    </div>
                </div>
            </div>

            <Button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Save Faculty Constraints
            </Button>

            {existingFaculty.length > 0 && (
                <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Server className="w-4 h-4 text-emerald-500" />
                        Saved Configurations ({existingFaculty.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {existingFaculty.map((f, i) => (
                            <div key={i} className="flex flex-col bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Rule Set {existingFaculty.length - i}</span>
                                <div className="flex gap-3 text-slate-500 text-xs mt-1">
                                    <span>Max: {f.max_load_hrs} hrs/wk</span>
                                    <span>Shift: {!f.shift_hours || f.shift_hours.length === 0 ? "Global Default" : `${f.shift_hours[0]}:00–${f.shift_hours[f.shift_hours.length - 1] + 1}:00`}</span>
                                    <span>Blocked: {(f.blocked_slots || []).length} slots</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </form>
    );
}
