"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { Plus, Loader2, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function InstitutionForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState("ShiftSync College");
    const [activeDays, setActiveDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    const [startHour, setStartHour] = useState(8);
    const [endHour, setEndHour] = useState(16);
    const [lunchMap, setLunchMap] = useState<Record<string, number>>({ "Mon": 13, "Tue": 13, "Wed": 13, "Thu": 13, "Fri": 13 });
    const [maxContinuous, setMaxContinuous] = useState<number | "">(2);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    const fetchConfig = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
        if (profile?.institution_id) {
            const { data } = await supabase.from("institutions").select("*").eq("id", profile.institution_id).single();
            if (data) {
                setName(data.name || "ShiftSync College");
                setActiveDays(data.days_active);
                if (data.time_slots && data.time_slots.length > 0) {
                    setStartHour(Math.min(...data.time_slots));
                    setEndHour(Math.max(...data.time_slots) + 1); // +1 because end is boundary
                }
                
                // Handle legacy integer vs new object map
                if (typeof data.lunch_slot === 'number') {
                    const newMap: Record<string, number> = {};
                    data.days_active.forEach((d: string) => newMap[d] = data.lunch_slot);
                    setLunchMap(newMap);
                } else if (data.lunch_slot) {
                    setLunchMap(data.lunch_slot);
                }
                
                setMaxContinuous(data.max_continuous_lectures);
            }
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const toggleDay = (day: string) => {
        if (activeDays.includes(day)) {
            setActiveDays(activeDays.filter(d => d !== day));
            // Optional: clean up lunchMap, but keeping it is harmless
        } else {
            setActiveDays([...activeDays, day]);
            setLunchMap(prev => ({ ...prev, [day]: 13 })); // Default to 1PM
        }
    };

    const updateLunchForDay = (day: string, slot: number) => {
        setLunchMap(prev => ({ ...prev, [day]: slot }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");

            let { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();

            // Build Time Slots array (e.g., 8 to 16 creates [8, 9, 10, 11, 12, 13, 14, 15])
            const slots = [];
            for (let i = startHour; i < endHour; i++) {
                slots.push(i);
            }

            const payload = {
                name: name,
                days_active: activeDays,
                time_slots: slots,
                lunch_slot: lunchMap, // Now sending the dictionary!
                max_continuous_lectures: maxContinuous === "" ? 2 : maxContinuous
            };

            let instId = profile?.institution_id;

            if (instId) {
                // Update existing
                const { error } = await supabase.from("institutions").update(payload).eq("id", instId);
                if (error) throw error;
            } else {
                // Insert new and link profile
                const { data: newInst, error: iErr } = await supabase.from("institutions").insert(payload).select().single();
                if (iErr) throw iErr;
                instId = newInst.id;
                const { data: hasProfile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
                if (!hasProfile) {
                    await supabase.from("profiles").insert({
                        id: user.id,
                        full_name: user.email || "ShiftSync Admin",
                        role: "admin",
                        institution_id: instId
                    });
                } else {
                    await supabase.from("profiles").update({ institution_id: instId }).eq("id", user.id);
                }
            }

            toast.success("Global settings saved");
            onSuccess();
        } catch (err: any) {
            toast.error("Save failed", { description: err.message });
        }
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto border border-slate-200 dark:border-slate-800 p-6 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            {/* IN-APP USER GUIDE */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-200">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                    <strong>Global Settings Guide:</strong> Define the foundational rules of your college here. These settings dictate the bounds of the generated timetable (e.g., if you set Active Days to Mon-Fri, the AI will never schedule classes on Saturday).
                </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 pt-2 border-t border-slate-200 dark:border-slate-800">
                Foundational Constraints
            </h3>

            <div className="space-y-3">
                <Label>Institution / College Name</Label>
                <Input required placeholder="e.g. Oxford University" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-3 pt-2">
                <Label>Active Working Days</Label>
                <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                        <button
                            type="button"
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${activeDays.includes(day)
                                ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-900"
                                }`}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Shift Start Hour (24h)</Label>
                    <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:ring-slate-300"
                        value={startHour} onChange={e => setStartHour(parseInt(e.target.value))}
                    >
                        {[6, 7, 8, 9, 10, 11].map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label>Shift End Hour (24h)</Label>
                    <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:ring-slate-300"
                        value={endHour} onChange={e => setEndHour(parseInt(e.target.value))}
                    >
                        {[13, 14, 15, 16, 17, 18, 19, 20].map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 col-span-2 border border-slate-200 dark:border-slate-800 p-4 rounded-lg bg-white dark:bg-slate-950">
                    <Label className="text-base font-semibold">Dynamic Daily Lunch Blocks</Label>
                    <p className="text-xs text-slate-500 mb-2">Assign different lunch times for each active day to accommodate variable lab schedules or half-days.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {activeDays.map(day => (
                            <div key={day} className="space-y-1.5 p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{day}</Label>
                                <select
                                    className="flex h-8 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1 text-xs ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
                                    value={lunchMap[day] || 13} 
                                    onChange={e => updateLunchForDay(day, parseInt(e.target.value))}
                                >
                                    {[11, 12, 13, 14, 15].map(h => <option key={h} value={h}>{h}:00 - {h+1}:00</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label>Max Continuous Lectures (Fatigue Limit)</Label>
                    <Input required type="number" min="1" max="5" value={maxContinuous} onChange={e => setMaxContinuous(e.target.value ? parseInt(e.target.value) : "")} />
                </div>
            </div>

            <Button disabled={isSubmitting} type="submit" className="w-full mt-4">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save College Settings
            </Button>
        </form>
    );
}
