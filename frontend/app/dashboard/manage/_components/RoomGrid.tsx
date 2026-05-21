"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { DataGrid } from "./DataGrid";
import { Room } from "../page";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Building, Archive, RotateCcw, Trash2 } from "lucide-react";

interface RoomGridProps {
    data: Room[];
    onDataChange: () => void;
}

export default function RoomGrid({ data, onDataChange }: RoomGridProps) {
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const supabase = createClient();

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("rooms").delete().eq("id", id);
        if (error) { toast.error("Delete failed", { description: error.message }); return; }
        onDataChange();
    };

    const handleArchive = async (id: string, currentState: boolean) => {
        setArchivingId(id);
        const { error } = await supabase
            .from("rooms")
            .update({ is_archived: !currentState })
            .eq("id", id);
        if (error) { toast.error("Archive failed", { description: error.message }); }
        setArchivingId(null);
        onDataChange();
    };

    const handleEdit = (room: Room) => {
        setEditingRoom({ ...room, tags: Array.isArray(room.tags) ? room.tags : [] });
    };

    const handleSave = async () => {
        if (!editingRoom) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("rooms")
                .update({
                    name: editingRoom.name,
                    type: editingRoom.type,
                    capacity: Number(editingRoom.capacity),
                    tags: editingRoom.tags,
                })
                .eq("id", editingRoom.id);
            if (error) throw error;
            setEditingRoom(null);
            onDataChange();
        } catch (err: any) {
            toast.error("Save failed", { description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    const columns = [
        {
            key: "name",
            header: "Room Name / ID",
            width: "w-48",
            render: (r: Room) => (
                <div className="flex items-center gap-2">
                    <div className={r.is_archived ? "opacity-50" : ""}>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.id.slice(0, 8)}…</p>
                    </div>
                    {r.is_archived && (
                        <Badge className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 shrink-0">
                            Archived
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: "type",
            header: "Type",
            render: (r: Room) => (
                <Badge variant="outline" className={`text-xs font-normal bg-slate-50 dark:bg-slate-900 ${r.is_archived ? "opacity-50" : ""}`}>
                    {r.type}
                </Badge>
            ),
        },
        {
            key: "capacity",
            header: "Capacity",
            render: (r: Room) => (
                <span className={`font-mono font-medium text-slate-800 dark:text-slate-200 ${r.is_archived ? "opacity-50" : ""}`}>{r.capacity}</span>
            ),
        },
        {
            key: "tags",
            header: "Tags",
            render: (r: Room) => (
                <div className={`flex flex-wrap gap-1 ${r.is_archived ? "opacity-50" : ""}`}>
                    {(r.tags || []).length === 0 ? (
                        <span className="text-slate-400 text-xs italic">None</span>
                    ) : (
                        (r.tags || []).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                                {tag}
                            </Badge>
                        ))
                    )}
                </div>
            ),
        },
    ];

    // Custom action buttons replacing DataGrid's default delete
    const customActions = (row: Room) => (
        <div className="flex items-center justify-end gap-1">
            {/* Edit — only for non-archived */}
            {!row.is_archived && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                    onClick={() => handleEdit(row)}
                    title="Edit"
                >
                    <Building className="w-3.5 h-3.5" />
                </Button>
            )}
            {/* Archive/Unarchive toggle */}
            <Button
                size="sm"
                variant="ghost"
                className={`h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${row.is_archived ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50" : "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50"}`}
                onClick={() => handleArchive(row.id, !!row.is_archived)}
                disabled={archivingId === row.id}
                title={row.is_archived ? "Restore" : "Archive"}
            >
                {archivingId === row.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : row.is_archived
                        ? <RotateCcw className="w-3.5 h-3.5" />
                        : <Archive className="w-3.5 h-3.5" />}
            </Button>
            {/* Permanent delete — only for archived rows */}
            {row.is_archived && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                    onClick={() => { if (confirm("Permanently delete this archived room?")) handleDelete(row.id); }}
                    title="Permanently Delete"
                >
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
                searchKeys={["name", "type", "tags"] as any}
                emptyMessage="No rooms added yet."
                customActions={customActions}
            />

            {/* Edit Modal */}
            <Dialog open={!!editingRoom} onOpenChange={(open) => !open && setEditingRoom(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-purple-500" />
                            Edit Room
                        </DialogTitle>
                        <DialogDescription>Update room details. Changes apply immediately.</DialogDescription>
                    </DialogHeader>
                    {editingRoom && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label>Room Name</Label>
                                <Input value={editingRoom.name} onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })} placeholder="e.g. CS Lab 1" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Room Type</Label>
                                <Input value={editingRoom.type} onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value })} placeholder="e.g. Laboratory, Classroom" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Capacity</Label>
                                <Input type="number" min={1} value={editingRoom.capacity} onChange={(e) => setEditingRoom({ ...editingRoom, capacity: parseInt(e.target.value) || 1 })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Tags (comma separated)</Label>
                                <Input
                                    value={(editingRoom.tags || []).join(", ")}
                                    onChange={(e) => setEditingRoom({ ...editingRoom, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                                    placeholder="e.g. Projector, Linux_Lab"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingRoom(null)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
