"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, AlertTriangle, Loader2, CalendarDays, ExternalLink, Clock, History, TriangleAlert, ScrollText, Download, CheckCircle2, Star, TrendingUp, LayoutGrid } from "lucide-react";
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
    const [logsRecord, setLogsRecord] = useState<any | null>(null); // record whose logs are shown

    const logsEndRef = useRef<HTMLDivElement>(null);
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
                .select("id, created_at, is_active, status, error_message, matrix_data")
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

    // Auto-scroll logs modal to bottom when it opens
    useEffect(() => {
        if (logsRecord) {
            setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
    }, [logsRecord]);

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

    const handleDownloadLogs = (record: any) => {
        const logs: string[] = record.matrix_data?.progress_log || [];
        const score = record.matrix_data?.optimality_score;
        const text = [
            `ShiftSync Solver Log — ${format(new Date(record.created_at), "MMMM do, yyyy 'at' h:mm a")}`,
            `Status: ${record.status}`,
            score != null ? `Optimality Score: ${score}/100` : "",
            "",
            "=== PROGRESS LOG ===",
            ...logs,
        ].join("\n");
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `shiftsync_log_${record.id.slice(0, 8)}.txt`;
        a.click();
    };

    const getLogs = (record: any): string[] =>
        record?.matrix_data?.progress_log || [];

    const getSlotCount = (record: any): number => {
        const raw = record?.matrix_data;
        if (!raw) return 0;
        const arr = Array.isArray(raw) ? raw : (raw?.schedule ?? Object.values(raw ?? {}));
        return Array.isArray(arr) ? arr.length : 0;
    };

    const setAsActive = async (recordId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user!.id).single();
            if (!profile?.institution_id) return;
            // Deactivate all, then activate selected
            await supabase.from("generated_timetables").update({ is_active: false }).eq("institution_id", profile.institution_id);
            await supabase.from("generated_timetables").update({ is_active: true }).eq("id", recordId);
            setHistory(prev => prev.map(r => ({ ...r, is_active: r.id === recordId })));
            toast.success("Active timetable updated", { description: "Faculty portals and Master Timetable will now show this version." });
        } catch (err: any) {
            toast.error("Failed to set active: " + err.message);
        }
    };

    // Analytics derived from history
    const successRecords = history.filter(r => r.status === "success" || r.status === "success_with_overflow");
    const scores = successRecords.map(r => r.matrix_data?.optimality_score).filter((s): s is number => s != null);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const successRate = history.length ? Math.round((successRecords.length / history.length) * 100) : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Delete confirm dialog ── */}
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

            {/* ── Clear all confirm dialog ── */}
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

            {/* ── Solver Logs Modal ── */}
            <Dialog open={!!logsRecord} onOpenChange={(o) => !o && setLogsRecord(null)}>
                <DialogContent className="max-w-3xl w-full h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-950 border border-slate-800">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Solver Log Archive</DialogTitle>
                    </DialogHeader>
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                            </div>
                            <div>
                                <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Solver Log Archive</p>
                                {logsRecord && (
                                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                                        {format(new Date(logsRecord.created_at), "MMM do, yyyy · h:mm a")}
                                        {logsRecord.matrix_data?.optimality_score != null &&
                                            ` · Score ${logsRecord.matrix_data.optimality_score}/100`}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {logsRecord && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 bg-transparent"
                                    onClick={() => handleDownloadLogs(logsRecord)}
                                >
                                    <Download className="w-3 h-3 mr-1.5" />
                                    Download .txt
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Log lines */}
                    <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-1 custom-scrollbar">
                        {logsRecord && getLogs(logsRecord).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
                                <ScrollText className="w-10 h-10 opacity-40" />
                                <p className="text-sm">No logs stored for this run.</p>
                                <p className="text-[10px] text-slate-700">Logs are saved from the next generation onwards.</p>
                            </div>
                        ) : (
                            getLogs(logsRecord).map((line: string, i: number) => (
                                <div key={i} className={`leading-relaxed ${
                                    line.includes("[ERROR]") || line.includes("FATAL") || line.includes("INFEASIBLE")
                                        ? "text-red-400"
                                        : line.includes("[SUCCESS]") || line.includes("OPTIMAL") || line.includes("FEASIBLE")
                                            ? "text-emerald-400"
                                            : line.includes("[STEP")
                                                ? "text-violet-400 font-semibold mt-2"
                                                : "text-slate-400"
                                }`}>
                                    <span className="text-slate-700 select-none mr-2">{String(i + 1).padStart(3, "0")}</span>
                                    {line}
                                </div>
                            ))
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Analytics Banner */}
            {history.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Total Runs", value: history.length, icon: History, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-500/10" },
                        { label: "Successful", value: successRecords.length, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
                        { label: "Success Rate", value: `${successRate}%`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                        { label: "Avg Score", value: avgScore != null ? `${avgScore}/100` : "—", icon: Star, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{stat.value}</p>
                                <p className="text-[11px] text-slate-500">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Header actions */}
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
                    <CardDescription>All algorithmic matrix solutions sorted by newest first. Logs are persisted for every run.</CardDescription>
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
                            {history.map((record, index) => {
                                const logs = getLogs(record);
                                const score = record.matrix_data?.optimality_score;
                                return (
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
                                                    {score != null && (
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            score >= 90 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                            : score >= 70 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                        }`}>Score {score}/100</span>
                                                    )}
                                                    {getSlotCount(record) > 0 && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                                            <LayoutGrid className="w-2.5 h-2.5" />{getSlotCount(record)} slots
                                                        </span>
                                                    )}
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {format(new Date(record.created_at), "MMMM do, yyyy 'at' h:mm a")}
                                                    {logs.length > 0 && (
                                                        <span className="ml-2 text-slate-400 dark:text-slate-600">· {logs.length} log lines</span>
                                                    )}
                                                </p>
                                                {record.status === "failed" && record.error_message && (
                                                    <div className="mt-2 text-xs font-mono text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30 overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-auto">
                                                        {record.error_message}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 justify-end flex-wrap">
                                            {/* Set as Active — only for successful non-active records */}
                                            {record.status !== "failed" && !record.is_active && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                    onClick={() => setAsActive(record.id)}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                                    Set Active
                                                </Button>
                                            )}
                                            {/* View Logs button — always visible */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-700"
                                                onClick={() => setLogsRecord(record)}
                                            >
                                                <ScrollText className="w-3.5 h-3.5 mr-1.5" />
                                                View Logs
                                            </Button>
                                            {/* View timetable — only for non-failed */}
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
                                );
                            })}
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
