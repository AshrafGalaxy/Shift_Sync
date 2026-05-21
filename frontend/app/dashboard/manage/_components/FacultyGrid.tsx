"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { DataGrid } from "./DataGrid";
import { Faculty } from "../page";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Users, AlertTriangle, Archive, RotateCcw, Trash2 } from "lucide-react";

interface FacultyGridProps {
    data: Faculty[];
    onDataChange: () => void;
}

export default function FacultyGrid({ data, onDataChange }: FacultyGridProps) {
    const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const supabase = createClient();

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("faculty_settings").delete().eq("id", id);
        if (error) { toast.error("Delete failed", { description: error.message }); return; }
        onDataChange();
    };

    const handleArchive = async (id: string, currentState: boolean) => {
        setArchivingId(id);
        const { error } = await supabase
            .from("faculty_settings")
            .update({ is_archived: !currentState })
            .eq("id", id);
        if (error) { toast.error("Archive failed", { description: error.message }); }
        setArchivingId(null);
        onDataChange();
    };

    const handleEdit = (f: Faculty) => {
        setEditingFaculty({ ...f });
    };

    const handleSave = async () => {
        if (!editingFaculty) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("faculty_settings")
                .update({
                    max_load_hrs: Number(editingFaculty.max_load_hrs),
                    max_continuous_hrs: Number(editingFaculty.max_continuous_hrs),
                    shift_hours: editingFaculty.shift_hours,
                    class_teacher_for: editingFaculty.class_teacher_for || null,
                })
                .eq("id", editingFaculty.id);

            if (error) throw error;
            setEditingFaculty(null);
            onDataChange();
        } catch (err: any) {
            toast.error("Save failed", { description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    const formatShift = (hours: number[]) => {
        if (!hours || hours.length === 0) return "—";
        const sorted = [...hours].sort((a, b) => a - b);
        const start = sorted[0];
        const end = sorted[sorted.length - 1] + 1;
        return `${start}:00 – ${end}:00`;
    };

    const columns = [
        {
            key: "full_name",
            header: "Faculty Name",
            width: "w-48",
            render: (f: Faculty) => (
                <div className="flex items-center gap-2">
                    <div className={(f as any).is_archived ? "opacity-50" : ""}>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{f.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-slate-400 font-mono">{f.id.slice(0, 8)}…</p>
                    </div>
                    {(f as any).is_archived && (
                        <Badge className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 shrink-0">Archived</Badge>
                    )}
                </div>
            ),
        },
        {
            key: "max_load_hrs",
            header: "Max Load",
            render: (f: Faculty) => (
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{f.max_load_hrs} hrs/wk</span>
            ),
        },
        {
            key: "max_continuous_hrs",
            header: "Continuous Limit",
            render: (f: Faculty) => (
                <Badge variant="outline" className="text-xs font-mono">
                    {f.max_continuous_hrs} hrs max
                </Badge>
            ),
        },
        {
            key: "shift_hours",
            header: "Shift",
            render: (f: Faculty) => (
                <span className="text-xs text-slate-600 dark:text-slate-400">{formatShift(f.shift_hours)}</span>
            ),
        },
        {
            key: "class_teacher_for",
            header: "Class Teacher",
            render: (f: Faculty) => (
                f.class_teacher_for
                    ? <Badge className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 text-xs font-normal">{f.class_teacher_for}</Badge>
                    : <span className="text-slate-400 text-xs italic">None</span>
            ),
        },
    ];

    const customActions = (row: Faculty) => (
        <div className="flex items-center justify-end gap-1">
            {!(row as any).is_archived && (
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50" onClick={() => handleEdit(row)} title="Edit">
                    <Users className="w-3.5 h-3.5" />
                </Button>
            )}
            <Button
                size="sm" variant="ghost"
                className={`h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${ (row as any).is_archived ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50" : "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50" }`}
                onClick={() => handleArchive(row.id, !!(row as any).is_archived)}
                disabled={archivingId === row.id}
                title={(row as any).is_archived ? "Restore" : "Archive"}
            >
                {archivingId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (row as any).is_archived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            </Button>
            {(row as any).is_archived && (
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={() => handleDelete(row.id)} title="Permanently Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            )}
        </div>
    );

    return (
        <>
            <DataGrid
                data={data}
                columns={columns}
                onDelete={handleDelete}
                onEdit={handleEdit}
                searchKeys={["full_name", "class_teacher_for"] as any}
                emptyMessage="No faculty configured yet. Add faculty in the Overview tab."
                customActions={customActions}
            />

            {/* Edit Modal */}
            <Dialog open={!!editingFaculty} onOpenChange={(open) => !open && setEditingFaculty(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            Edit Faculty Settings
                        </DialogTitle>
                        <DialogDescription>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{editingFaculty?.full_name}</span> — update scheduling constraints below.
                        </DialogDescription>
                    </DialogHeader>
                    {editingFaculty && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Max Weekly Load (hrs)</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={editingFaculty.max_load_hrs}
                                        onChange={(e) => setEditingFaculty({ ...editingFaculty, max_load_hrs: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Continuous Hrs Limit</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={8}
                                        value={editingFaculty.max_continuous_hrs}
                                        onChange={(e) => setEditingFaculty({ ...editingFaculty, max_continuous_hrs: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Shift Hours (space-separated integers, 24hr)</Label>
                                <Input
                                    value={(editingFaculty.shift_hours || []).join(" ")}
                                    onChange={(e) =>
                                        setEditingFaculty({
                                            ...editingFaculty,
                                            shift_hours: e.target.value.split(/\s+/).map(Number).filter((n) => !isNaN(n) && n > 0),
                                        })
                                    }
                                    placeholder="e.g. 8 9 10 11 12 13 14"
                                />
                                <p className="text-xs text-slate-400">Each integer = one active hour slot. e.g. "8 9 10" = 8AM–11AM shift.</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Class Teacher For (Division ID)</Label>
                                <Input
                                    value={editingFaculty.class_teacher_for ?? ""}
                                    onChange={(e) => setEditingFaculty({ ...editingFaculty, class_teacher_for: e.target.value || null })}
                                    placeholder="e.g. SY-CS-A (leave blank if none)"
                                />
                            </div>
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Deleting this faculty will also cascade-delete all their workload assignments. Use the delete button on the row only when certain.</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingFaculty(null)}>Cancel</Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
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
