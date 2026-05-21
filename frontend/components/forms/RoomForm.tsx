"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { Plus, Loader2, Server, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

export default function RoomForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState("");
    const [type, setType] = useState("theory");
    const [capacity, setCapacity] = useState("");
    const [tags, setTags] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingRooms, setExistingRooms] = useState<any[]>([]);
    const supabase = createClient();

    const fetchRooms = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
        if (profile?.institution_id) {
            const { data } = await supabase.from("rooms").select("*").eq("institution_id", profile.institution_id).order("created_at", { ascending: false });
            if (data) setExistingRooms(data);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");

            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
            if (!profile?.institution_id) throw new Error("⚠️ Missing Global Settings. Please complete Step 1 (Global Settings tab) to initialize your college before adding rooms.");

            const tagArray = tags.split(",").map(t => t.trim()).filter(t => t.length > 0);

            const { error } = await supabase.from("rooms").insert({
                institution_id: profile.institution_id,
                name: name,
                type: type,
                capacity: parseInt(capacity),
                tags: tagArray
            });

            if (error) throw error;

            toast.success("Room added", { description: `${name} added to the database.` });
            setName("");
            setCapacity("");
            setTags("");
            fetchRooms();
            onSuccess();
        } catch (err: any) {
            toast.error("Failed to add room", { description: err.message });
        }
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto border border-slate-200 dark:border-slate-800 p-6 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            {/* IN-APP USER GUIDE */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-200 mb-4">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                    <strong>Rooms Guide:</strong> Add physical spaces available. Rooms must have accurate capacities so the AI doesn't schedule an 80-student batch in a 30-seater lab. Use specific Hardware Tags like `Computer_Lab` or `Linux_Lab` to map classes to this specific room later.
                </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Add New Physical Room</h3>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Room ID / Name</Label>
                    <Input required placeholder="e.g. D201" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Room Type</Label>
                    <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                        value={type} onChange={e => setType(e.target.value)}
                    >
                        <option value="theory">Theory (Classroom)</option>
                        <option value="lab">Laboratory</option>
                        <option value="seminar">Seminar Hall</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Capacity (Seats)</Label>
                    <Input required type="number" min="1" placeholder="80" value={capacity} onChange={e => setCapacity(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Hardware Tags (Comma separated)</Label>
                    <Input placeholder="Projector, Linux_Lab, AC" value={tags} onChange={e => setTags(e.target.value)} />
                </div>
            </div>

            <Button disabled={isSubmitting} type="submit" className="w-full mt-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Save Room constraint
            </Button>

            {existingRooms.length > 0 && (
                <div className="pt-6 mt-4 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Server className="w-4 h-4 text-emerald-500" />
                        Live Database Records ({existingRooms.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {existingRooms.map((r, i) => (
                            <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{r.name}</span>
                                <div className="flex gap-3 text-slate-500 text-xs">
                                    <span>{r.type}</span>
                                    <span>Cap: {r.capacity}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </form>
    );
}
