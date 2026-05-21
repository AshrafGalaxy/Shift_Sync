"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, AlertTriangle, Loader2, CalendarDays, ExternalLink, Clock, History, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { MasterTimetableView } from "../timetable/page";

export default function HistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isClearingAll, setIsClearingAll] = useState(false);
    const [selectedTimetableId, setSelectedTimetableId] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [pendingClearAll, setPendingClearAll] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
            if (!profile?.institution_id) return;
            const { data, error } = await supabase
                .from("generated_timetables")
                .select("id, created_at, is_active, status, error_message")
                .eq("institution_id", profile.institution_id)
                .order("created_at", { ascending: false });
            if (error) {
                toast.error("DB Schema Error: Ensure 'status' column exists via SQL Migration.");
                throw error;
            }
            if (data) setHistory(data);
        } catch (err) {
            console.error("History fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;
        const id = pendingDeleteId;
        setPendingDeleteId(null);
        setIsDeletingId(id);
        try {
            const { error } = await supabase.from("generated_timetables").delete().eq("id", id);
            if (error) throw error;
            setHistory(prev => prev.filter(t => t.id !== id));
            toast.success("Record deleted");
        } catch (err: any) {
            toast.error("Failed to delete: " + err.message);
        }
        setIsDeletingId(null);
    };

    const confirmClearAll = async () => {
        setPendingClearAll(false);
        setIsClearingAll(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user?.id).single();
            if (!profile?.institution_id) return;
            const { error } = await supabase.from("generated_timetables").delete().eq("institution_id", profile.institution_id);
            if (error) throw error;
            setHistory([]);
            toast.success("All history cleared");
        } catch (err: any) {
            toast.error("Failed to clear history: " + err.message);
        }
        setIsClearingAll(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Danger confirm dialogs — replaces native browser confirm() */}
            <Dialog open={!!pendingDeleteId} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
                <DialogContent className="max-w-sm bg-white dark:bg-slate-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /> Delete Record?</DialogTitle>
                        <DialogDescription>This generation record will be permanently removed. This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 mt-4">
                        <Button variant="outline" className="flex-1" onClick={() => setPendingDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Delete</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={pendingClearAll} onOpenChange={(o) => !o && setPendingClearAll(false)}>
                <DialogContent className="max-w-sm bg-white dark:bg-slate-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /> Clear All History?</DialogTitle>
                        <DialogDescription>Every timetable generation record will be permanently deleted. This cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 mt-4">
                        <Button variant="outline" className="flex-1" onClick={() => setPendingClearAll(false)}>Cancel</Button>
                        <Button variant="destructive" className="flex-1" onClick={confirmClearAll}>
                            {isClearingAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Clear All
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Header actions only — title shown in layout header */}
            <div className="flex justify-end">
                {history.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={() => setPendingClearAll(true)} disabled={isClearingAll}>
                        {isClearingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                        Clear All History
                    </Button>
                )}
            </div>

            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/50">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5 text-violet-600" />
                        Timeline Records
                    </CardTitle>
                    <CardDescription>All algorithmic matrix solutions sorted by newest first.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50 text-violet-600" />
                            Loading your timeline...
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <History className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">No Generations Yet</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">You haven't run the AI Solver yet. Go to the Overview tab to trigger a generation.</p>
                            <Button className="mt-6 bg-violet-600 hover:bg-violet-700" onClick={() => router.push('/dashboard')}>
                                Go to Overview
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {history.map((record, index) => (
                                <div key={record.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <div className="flex items-start sm:items-center gap-4 w-full">
                                        <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 mt-1 sm:mt-0 ${
                                            record.status === "failed"
                                                ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
                                                : record.status === "success_with_overflow"
                                                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700"
                                                    : "bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800"
                                        }`}>
                                            {record.status === "failed" ? (
                                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                            ) : record.status === "success_with_overflow" ? (
                                                <TriangleAlert className="w-4 h-4 text-amber-500" />
                                            ) : (
                                                <CalendarDays className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap text-sm">
                                                {record.status === "failed" ? "Generation Failed" : `Timetable Version ${history.length - index}`}
                                                {record.status === "failed" && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Error</span>
                                                )}
                                                {record.status === "success_with_overflow" && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex items-center gap-1">
                                                        <TriangleAlert className="w-3 h-3" /> Overflow
                                                    </span>
                                                )}
                                                {record.is_active && record.status !== "failed" && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>
                                                )}
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {format(new Date(record.created_at), "MMMM do, yyyy 'at' h:mm a")}
                                            </p>
                                            {record.status === "failed" && record.error_message && (
                                                <div className="mt-2 text-xs font-mono text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30 overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-auto">
                                                    {record.error_message}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 justify-end">
                                        {record.status !== "failed" && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs border-slate-200 dark:border-slate-700"
                                                onClick={() => setSelectedTimetableId(record.id)}
                                            >
                                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                                View
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            onClick={() => setPendingDeleteId(record.id)}
                                            disabled={isDeletingId === record.id}
                                        >
                                            {isDeletingId === record.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Historical Timetable Modal */}
            <Dialog open={!!selectedTimetableId} onOpenChange={(open) => !open && setSelectedTimetableId(null)}>
                <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-6 overflow-hidden bg-slate-50 dark:bg-slate-950">
                    <DialogHeader className="shrink-0 mb-4">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <History className="w-5 h-5 text-violet-600" />
                            Historical Timetable Preview
                        </DialogTitle>
                        <DialogDescription>Viewing an archived generation — export or print this version.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 w-full min-h-0 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-y-auto">
                        <div className="p-4 h-full">
                            {selectedTimetableId && (
                                <MasterTimetableView targetIdProp={selectedTimetableId} hideFullscreen={true} />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
