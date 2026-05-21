"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { Plus, Loader2, Server, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

export default function WorkloadForm({ onSuccess }: { onSuccess: () => void }) {
    const [facultyId, setFacultyId] = useState("");
    const [subjectCode, setSubjectCode] = useState("");
    const [type, setType] = useState("Theory");
    const [targetGroups, setTargetGroups] = useState("");
    const [weeklyHours, setWeeklyHours] = useState("");
    const [consecutiveHours, setConsecutiveHours] = useState("1");
    const [requiredTags, setRequiredTags] = useState("");
    const [isOnline, setIsOnline] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingFaculty, setExistingFaculty] = useState<any[]>([]);
    const [existingWorkloads, setExistingWorkloads] = useState<any[]>([]);
    const supabase = createClient();

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Faculty to assign workload to
        const { data: fData } = await supabase.from("faculty_settings").select("*").eq("profile_id", user.id);
        if (fData) {
            setExistingFaculty(fData);
            if (fData.length > 0 && !facultyId) {
                setFacultyId(fData[0].id);
            }
        }

        // Fetch Workloads mapping for preview
        if (fData && fData.length > 0) {
            const fIds = fData.map((f: any) => f.id);
            const { data: wData } = await supabase.from("workloads").select("*").in("faculty_id", fIds).order("created_at", { ascending: false });
            if (wData) setExistingWorkloads(wData);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (!facultyId) throw new Error("Please select a Faculty to assign this workload to.");

            const targetsArray = targetGroups.split(",").map(t => t.trim()).filter(t => t.length > 0);
            const tagsArray = requiredTags.split(",").map(t => t.trim()).filter(t => t.length > 0);

            const { error } = await supabase.from("workloads").insert({
                faculty_id: facultyId,
                subject_code: subjectCode,
                type: type,
                target_groups: targetsArray,
                weekly_hours: parseInt(weeklyHours),
                consecutive_hours: parseInt(consecutiveHours),
                required_tags: tagsArray,
                is_online: isOnline
            });

            if (error) throw error;

            toast.success("Workload added", { description: `${subjectCode} workload saved.` });
            setSubjectCode("");
            setTargetGroups("");
            setWeeklyHours("");
            setConsecutiveHours(type === "Theory" ? "1" : "2");
            setRequiredTags("");
            fetchData();
            onSuccess();
        } catch (err: any) {
            toast.error("Failed to add workload", { description: err.message });
        }
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto border border-slate-200 dark:border-slate-800 p-6 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            {/* IN-APP USER GUIDE */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-200 mb-4">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                    <strong>Workload Guide:</strong> This is your master curriculum mapper. Link Subjects to Faculty here. Use specific Target Groups (like `SY-CSDS-A` or batches `B1`) to ensure divisions don't overlap. Practical labs typically require 2 consecutive hours.
                </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Assign Class to Faculty</h3>

            <div className="space-y-2">
                <Label>Assign to Faculty (Rule Set)</Label>
                <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:ring-slate-300"
                    value={facultyId} onChange={e => setFacultyId(e.target.value)} required
                >
                    <option value="" disabled>Select a Faculty Rule Set...</option>
                    {existingFaculty.map((f, i) => (
                        <option key={f.id} value={f.id}>
                            Faculty {f.id.slice(0, 8).toUpperCase()} {f.class_teacher_for ? `(Class Teacher: ${f.class_teacher_for})` : ""}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Subject Code / Name</Label>
                    <Input required placeholder="DS2012_ML" value={subjectCode} onChange={e => setSubjectCode(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Event Type</Label>
                    <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:ring-slate-300"
                        value={type} onChange={e => {
                            setType(e.target.value);
                            if (e.target.value === "Practical" || e.target.value === "Tutorial") setConsecutiveHours("2");
                            if (e.target.value === "Theory") setConsecutiveHours("1");
                        }}
                    >
                        <option value="Theory">Theory (Lectures)</option>
                        <option value="Practical">Practical / Lab</option>
                        <option value="Tutorial">Tutorial</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Target Groups / Divisions (Comma separated)</Label>
                <Input required placeholder="SY-CSDS-A, B1" value={targetGroups} onChange={e => setTargetGroups(e.target.value)} />
            </div>

            <div className="flex items-center space-x-3 my-2 bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <input 
                    type="checkbox" 
                    id="isOnline" 
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-900" 
                    checked={isOnline} 
                    onChange={e => setIsOnline(e.target.checked)} 
                />
                <Label htmlFor="isOnline" className="text-sm font-medium cursor-pointer text-slate-800 dark:text-slate-200">
                    Virtual / Online Class Bypass (Skips physical room allocation constraints)
                </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Total Weekly Hours</Label>
                    <Input required type="number" min="1" max="20" placeholder="3" value={weeklyHours} onChange={e => setWeeklyHours(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Consecutive Hour Block</Label>
                    <Input required type="number" min="1" max="4" placeholder="1" value={consecutiveHours} onChange={e => setConsecutiveHours(e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Required Room Tags (Optional)</Label>
                <Input placeholder="Computer_Lab" value={requiredTags} onChange={e => setRequiredTags(e.target.value)} />
                <p className="text-[10px] text-slate-500">Maps to tags created in the Physical Rooms tab to ensure correct hardware matches.</p>
            </div>

            <Button disabled={isSubmitting || existingFaculty.length === 0} type="submit" className="w-full mt-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Save Workload Assignment
            </Button>
            {existingFaculty.length === 0 && (
                <p className="text-xs text-red-500 text-center mt-2">You must create at least one Faculty Rule Set before assigning workloads.</p>
            )}

            {existingWorkloads.length > 0 && (
                <div className="pt-6 mt-4 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Server className="w-4 h-4 text-emerald-500" />
                        Live Workload Records ({existingWorkloads.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {existingWorkloads.map((w, i) => (
                            <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
                                <div>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">{w.subject_code}</span>
                                    <span className="text-xs text-slate-500">{w.type} • Targets: {w.target_groups?.join(", ")}</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">Faculty {w.faculty_id.slice(0, 4)}</span>
                                    <span className="block text-xs text-slate-500 mt-1">{w.weekly_hours}h/wk</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </form>
    );
}
