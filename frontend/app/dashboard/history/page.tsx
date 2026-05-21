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

    useEffect(() => {
        fetchHistory();
    }, []);

    const deleteTimetable = async (id: string) => {
        if (!confirm("Delete this generation?")) return;
        setIsDeletingId(id);
        try {
            const { error } = await supabase.from("generated_timetables").delete().eq("id", id);
            if (error) throw error;
            setHistory(history.filter(t => t.id !== id));
        } catch (err: any) {
            toast.error("Failed to delete: " + err.message);
        }
        setIsDeletingId(null);
    };

    const clearAllHistory = async () => {
        if (!confirm("Permanently delete ALL history? This cannot be undone.")) return;
        setIsClearingAll(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user?.id).single();
            if (!profile?.institution_id) return;

            const { error } = await supabase.from("generated_timetables").delete().eq("institution_id", profile.institution_id);
            if (error) throw error;

            setHistory([]);
        } catch (err: any) {
            toast.error("Failed to clear history: " + err.message);
        }
        setIsClearingAll(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Generation History</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">View and manage your past AI timeline generations.</p>
                </div>
                {history.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={clearAllHistory} disabled={isClearingAll}>
                        {isClearingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                        Clear All History
                    </Button>
                )}
            </div>

            <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm bg-white dark:bg-slate-950">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/50">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5 text-blue-600" />
                        Timeline Records
                    </CardTitle>
                    <CardDescription>All algorithmic matrix solutions sorted by newest first.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50 text-blue-600" />
                            Loading your timeline...
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                <History className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">No Generations Yet</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">You haven't run the Smart Timetable AI yet. Go to the Overview tab to trigger a generation!</p>
                            <Button className="mt-6" onClick={() => router.push('/dashboard')}>
                                Go to Overview
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {history.map((record, index) => (
                                <div key={record.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <div className="flex items-start sm:items-center gap-4 w-full">
                                        <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 mt-1 sm:mt-0 ${
                                            record.status === 'failed'
                                                ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
                                                : record.status === 'success_with_overflow'
                                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
                                                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
                                        }`}>
                                            {record.status === 'failed' ? (
                                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            ) : record.status === 'success_with_overflow' ? (
                                                <TriangleAlert className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                                            ) : (
                                                <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 w-full max-w-3xl overflow-hidden">
                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                                                {record.status === 'failed' ? "Generation Failed" : `Timetable Version ${history.length - index}`}
                                                {record.status === 'failed' && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0">
                                                        Error
                                                    </span>
                                                )}
                                                {record.status === 'success_with_overflow' && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 shrink-0 flex items-center gap-1">
                                                        <TriangleAlert className="w-3 h-3" /> Overflow
                                                    </span>
                                                )}
                                                {record.is_active && record.status !== 'failed' && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                                                        Active
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                                {format(new Date(record.created_at), "MMMM do, yyyy 'at' h:mm a")}
                                            </p>
                                            {record.status === 'failed' && record.error_message && (
                                                <div className="mt-2 text-xs font-mono text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                                                    {record.error_message}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 shrink-0 justify-end">
                                        {record.status !== 'failed' && (
                                            <Button
                                                variant="outline"
                                                className="w-full sm:w-auto"
                                                onClick={() => setSelectedTimetableId(record.id)}
                                            >
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                View Timetable
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 shrink-0"
                                            onClick={() => deleteTimetable(record.id)}
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

            {/* Historical Dashboard Modal Sandbox */}
            <Dialog open={!!selectedTimetableId} onOpenChange={(open) => !open && setSelectedTimetableId(null)}>
                <DialogContent className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] w-full h-[95vh] flex flex-col p-6 overflow-hidden bg-slate-50 dark:bg-slate-950">
                    <DialogHeader className="shrink-0 mb-4 flex-row items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <History className="w-6 h-6 text-blue-600" />
                                Historical Timetable Preview
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                Viewing an archived generation arrangement. You can export or print this historical version.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    {/* Encapsulated Inner Matrix Renderer */}
                    <div className="flex-1 w-full relative border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-y-auto">
                        <div className="p-4 h-full relative">
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
