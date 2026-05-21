"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { DataGrid } from "./DataGrid";
import { Workload } from "../page";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Wifi } from "lucide-react";

interface WorkloadGridProps {
    data: Workload[];
    onDataChange: () => void;
}

export default function WorkloadGrid({ data, onDataChange }: WorkloadGridProps) {
    const [editingWorkload, setEditingWorkload] = useState<Workload | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("workloads").delete().eq("id", id);
        if (error) {
            alert("Delete failed: " + error.message);
        }
        onDataChange();
    };

    const handleEdit = (w: Workload) => {
        setEditingWorkload({ ...w });
    };

    const handleSave = async () => {
        if (!editingWorkload) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("workloads")
                .update({
                    subject_code: editingWorkload.subject_code,
                    type: editingWorkload.type,
                    target_groups: editingWorkload.target_groups,
                    weekly_hours: Number(editingWorkload.weekly_hours),
                    consecutive_hours: Number(editingWorkload.consecutive_hours),
                    required_tags: editingWorkload.required_tags,
                    is_online: editingWorkload.is_online,
                })
                .eq("id", editingWorkload.id);

            if (error) throw error;
            setEditingWorkload(null);
            onDataChange();
        } catch (err: any) {
            alert("Save failed: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const typeColors: Record<string, string> = {
        Theory: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20",
        Practical: "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/20",
        Tutorial: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20",
    };

    const columns = [
        {
            key: "subject_code",
            header: "Subject",
            width: "w-48",
            render: (w: Workload) => (
                <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-sm">{w.subject_code}</p>
                    <p className="text-xs text-slate-400">{w.faculty_name}</p>
                </div>
            ),
        },
        {
            key: "type",
            header: "Type",
            render: (w: Workload) => (
                <Badge variant="outline" className={`text-xs font-normal ${typeColors[w.type] ?? ""}`}>
                    {w.type}
                </Badge>
            ),
        },
        {
            key: "target_groups",
            header: "Batches",
            render: (w: Workload) => (
                <div className="flex flex-wrap gap-1">
                    {(w.target_groups || []).slice(0, 3).map((tg) => (
                        <Badge key={tg} variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800">
                            {tg}
                        </Badge>
                    ))}
                    {(w.target_groups || []).length > 3 && (
                        <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800">
                            +{w.target_groups.length - 3}
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: "weekly_hours",
            header: "Hours",
            render: (w: Workload) => (
                <div className="text-xs space-y-0.5">
                    <p className="font-mono font-medium text-slate-800 dark:text-slate-200">{w.weekly_hours} hrs/wk</p>
                    {w.consecutive_hours > 1 && (
                        <p className="text-slate-400">{w.consecutive_hours} consec.</p>
                    )}
                </div>
            ),
        },
        {
            key: "is_online",
            header: "Mode",
            render: (w: Workload) => (
                w.is_online
                    ? <Badge className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 text-xs gap-1 font-normal">
                        <Wifi className="w-3 h-3" /> Online
                    </Badge>
                    : <span className="text-xs text-slate-400">Physical</span>
            ),
        },
    ];

    return (
        <>
            <DataGrid
                data={data}
                columns={columns}
                onDelete={handleDelete}
                onEdit={handleEdit}
                searchKeys={["subject_code", "type", "faculty_name"] as any}
                emptyMessage="No workloads configured yet. Add workloads in the Overview tab."
            />

            {/* Edit Modal */}
            <Dialog open={!!editingWorkload} onOpenChange={(open) => !open && setEditingWorkload(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-teal-500" />
                            Edit Workload
                        </DialogTitle>
                        <DialogDescription>
                            Modify workload parameters for <span className="font-medium text-slate-700 dark:text-slate-300">{editingWorkload?.subject_code}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    {editingWorkload && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label>Subject Code</Label>
                                <Input
                                    value={editingWorkload.subject_code}
                                    onChange={(e) => setEditingWorkload({ ...editingWorkload, subject_code: e.target.value })}
                                    placeholder="e.g. CS301_Data_Structures"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Class Type</Label>
                                    <select
                                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingWorkload.type}
                                        onChange={(e) => setEditingWorkload({ ...editingWorkload, type: e.target.value })}
                                    >
                                        <option value="Theory">Theory</option>
                                        <option value="Practical">Practical</option>
                                        <option value="Tutorial">Tutorial</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Online?</Label>
                                    <div className="flex items-center gap-3 h-9">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={editingWorkload.is_online}
                                                onChange={(e) => setEditingWorkload({ ...editingWorkload, is_online: e.target.checked })}
                                                className="w-4 h-4 rounded accent-blue-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">Virtual / Online</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Weekly Hours</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={editingWorkload.weekly_hours}
                                        onChange={(e) => setEditingWorkload({ ...editingWorkload, weekly_hours: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Consecutive Hours</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={6}
                                        value={editingWorkload.consecutive_hours}
                                        onChange={(e) => setEditingWorkload({ ...editingWorkload, consecutive_hours: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Target Groups (comma separated)</Label>
                                <Input
                                    value={(editingWorkload.target_groups || []).join(", ")}
                                    onChange={(e) =>
                                        setEditingWorkload({
                                            ...editingWorkload,
                                            target_groups: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                                        })
                                    }
                                    placeholder="e.g. SY-CS-A, SY-CS-B"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Required Room Tags (comma separated)</Label>
                                <Input
                                    value={(editingWorkload.required_tags || []).join(", ")}
                                    onChange={(e) =>
                                        setEditingWorkload({
                                            ...editingWorkload,
                                            required_tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                                        })
                                    }
                                    placeholder="e.g. Projector, Linux_Lab (leave blank for any room)"
                                />
                            </div>
                            {editingWorkload.weekly_hours % editingWorkload.consecutive_hours !== 0 && (
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                    ⚠ Weekly hours ({editingWorkload.weekly_hours}) must be divisible by consecutive hours ({editingWorkload.consecutive_hours}).
                                </p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingWorkload(null)}>Cancel</Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || (!!editingWorkload && editingWorkload.weekly_hours % editingWorkload.consecutive_hours !== 0)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
