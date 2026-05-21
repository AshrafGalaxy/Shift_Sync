"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Play, Download, Terminal, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Issue {
    constraint: string;
    entity: string;
    message: string;
    fix_hint: string;
    tab_hint: string;
}

interface SolverConsoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    payload: any;
    onRoutingRequest?: (tab: string) => void;
    onSuccess?: () => void;
    onLogsComplete?: (logs: string[], score: number) => void;
    onLiveLog?: (line: string) => void;
}

export default function SolverConsoleModal({ isOpen, onClose, payload, onRoutingRequest, onSuccess, onLogsComplete, onLiveLog }: SolverConsoleModalProps) {
    const [step, setStep] = useState<"idle" | "solving" | "success" | "warning" | "failed">("idle");
    const [logs, setLogs] = useState<string[]>([]);
    const [score, setScore] = useState<number | null>(null);
    const [overflowCount, setOverflowCount] = useState<number>(0);
    const [issues, setIssues] = useState<{ critical: Issue[]; warnings: Issue[] }>({ critical: [], warnings: [] });

    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    // Handle Generation
    useEffect(() => {
        if (isOpen && step === "idle") {
            runGeneration();
        }
    }, [isOpen, step]);

    const runGeneration = async () => {
        setStep("solving");
        setLogs(["[SYSTEM] Initializing AI Engine...", "[SYSTEM] Validating Master Workloads..."]);

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                let diag = data.diagnosis || {};
                setIssues({
                    critical: diag.critical || [],
                    warnings: diag.warnings || []
                });
                await streamLogs(data.progress_log || ["[ERROR] Engine encountered fatal constraints."], true);
                setStep("failed");
                return;
            }

            const targetStep = data.status === "success_with_overflow" ? "warning" : "success";
            setScore(data.optimality_score ?? 100);
            setOverflowCount(data.overflow_count ?? 0);

            await streamLogs(data.progress_log || ["[SUCCESS] Timetable generated."], false, data.optimality_score);

            setStep(targetStep);
            // Fire log callback — does NOT navigate. User clicks "View Timetable" to navigate.
            if (onLogsComplete) onLogsComplete(data.progress_log || [], data.optimality_score ?? 100);

        } catch (err: any) {
            setLogs(prev => [...prev, `[FATAL ERROR] ${err.message}`]);
            setStep("failed");
        }
    };

    const streamLogs = async (incomingLogs: string[], isFailure: boolean, optScore: number = 100) => {
        const baseDelay = isFailure ? 300 : (optScore < 80 ? 200 : 80);
        for (let i = 0; i < incomingLogs.length; i++) {
            await new Promise(r => setTimeout(r, baseDelay + Math.random() * 50));
            setLogs(prev => [...prev, incomingLogs[i]]);
            if (onLiveLog) onLiveLog(incomingLogs[i]); // ← stream to dashboard card
        }
        await new Promise(r => setTimeout(r, 600));
    };

    const handleDownloadLogs = () => {
        const text = logs.join("\n") + "\n\n=== DIAGNOSIS ===\n" + JSON.stringify(issues, null, 2);
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `shiftsync_solver_logs_${new Date().getTime()}.txt`;
        a.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                            <Terminal className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">AI Solver Console</h2>
                            <p className="text-xs text-slate-500 font-mono">Session ID: {new Date().getTime().toString(16)}</p>
                        </div>
                    </div>
                    {step !== "solving" && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleDownloadLogs} className="hidden sm:flex">
                                <Download className="w-4 h-4 mr-2" />
                                Export Logs
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setStep("idle"); setLogs([]); onClose(); }} className="rounded-full">
                                <X className="w-5 h-5 text-slate-500" />
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                    {/* Left: Terminal Logs */}
                    <div className={`flex-1 flex flex-col bg-slate-950 p-4 overflow-hidden relative transition-all duration-500 ${step === "solving" ? "w-full" : "w-full md:w-1/2 border-r border-slate-800"}`}>
                        <div className="flex items-center justify-between mb-2 shrink-0">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                            </div>
                            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">cp-sat stdout</span>
                        </div>

                        <div className="flex-1 overflow-y-auto font-mono text-xs sm:text-sm text-slate-300 space-y-1.5 pr-2 custom-scrollbar">
                            {logs.map((log, idx) => (
                                <div key={idx} className={`${log.includes("[ERROR]") ? "text-red-400" : log.includes("[SUCCESS]") || log.includes("OPTIMAL") || log.includes("FEASIBLE") ? "text-emerald-400" : log.includes("[STEP") ? "text-violet-400 font-bold mt-3" : "opacity-80"}`}>
                                    {log}
                                </div>
                            ))}
                            {step === "solving" && (
                                <div className="flex items-center gap-2 mt-2 opacity-50">
                                    <div className="w-1.5 h-4 bg-emerald-400 animate-pulse" />
                                </div>
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>

                    {/* Right: Results Panel — user must click CTA to navigate */}
                    <AnimatePresence>
                        {step !== "solving" && step !== "idle" && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/20 p-6 flex flex-col custom-scrollbar"
                            >
                                {/* ── SUCCESS ── */}
                                {step === "success" && (
                                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-8 h-full">
                                        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Optimal Timetable Generated!</h3>
                                        <p className="text-slate-500 max-w-md text-sm">The AI successfully mapped all variables with zero hard constraint violations.</p>

                                        <div className="mt-4 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 w-full max-w-xs flex flex-col items-center gap-3">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Optimality Score</span>
                                            <div className="text-6xl font-black text-emerald-600 dark:text-emerald-400">
                                                {score}/100
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                                <div
                                                    className="h-2 rounded-full bg-emerald-500 transition-all duration-1000"
                                                    style={{ width: `${score ?? 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="text-xs font-medium text-center mt-1">
                                            {(score ?? 0) >= 90 && <span className="text-emerald-600 dark:text-emerald-400">✓ Optimal — No manual intervention needed</span>}
                                            {(score ?? 0) >= 70 && (score ?? 0) < 90 && <span className="text-amber-600 dark:text-amber-400">⚠️ Good — Minor overflow, review amber slots</span>}
                                            {(score ?? 0) < 70 && <span className="text-red-500 dark:text-red-400">⚠️ Partial — Several constraints relaxed, review required</span>}
                                        </div>

                                        <Button
                                            onClick={() => { if (onSuccess) onSuccess(); }}
                                            className="mt-4 h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 text-base flex items-center gap-2"
                                        >
                                            <Play className="w-4 h-4 fill-white" />
                                            View Timetable
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                        <p className="text-xs text-slate-400">Download logs before navigating if needed.</p>
                                    </div>
                                )}

                                {/* ── WARNING (overflow) ── */}
                                {step === "warning" && (
                                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-8 h-full">
                                        <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                            <AlertTriangle className="w-12 h-12 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Generated with Overflow</h3>
                                        <p className="text-slate-500 max-w-md text-sm">All faculty and groups were scheduled, but {overflowCount} slot(s) required Ghost Rooms due to physical capacity constraints.</p>

                                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl w-full max-w-xs text-left">
                                            <span className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Manual Assignment Needed</span>
                                            <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1">{overflowCount} slot(s) are marked TBD — assign physical rooms in the timetable view.</p>
                                        </div>

                                        <div className="text-xs font-medium text-center text-amber-600 dark:text-amber-400 mt-1">
                                            {overflowCount} ghost-room slot(s) need manual room assignment
                                        </div>

                                        <Button
                                            onClick={() => { if (onSuccess) onSuccess(); }}
                                            className="mt-4 h-12 px-8 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg text-base flex items-center gap-2"
                                        >
                                            <Play className="w-4 h-4 fill-white" />
                                            View Timetable
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                        <p className="text-xs text-slate-400">Rooms marked TBD need manual assignment.</p>
                                    </div>
                                )}

                                {/* ── FAILED ── */}
                                {step === "failed" && (
                                    <div className="flex flex-col space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
                                                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Generation Failed</h3>
                                                <p className="text-sm text-slate-500">The constraints are mathematically impossible. Resolve the critical issues below.</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {issues.critical.map((issue, idx) => (
                                                <div key={idx} className="bg-white dark:bg-slate-800 border-l-4 border-l-red-500 rounded-r-xl rounded-l-sm shadow-sm p-4 border-y border-r border-slate-100 dark:border-slate-700">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 uppercase tracking-wider">{issue.constraint}</span>
                                                                <span className="text-xs font-semibold text-slate-500">{issue.entity}</span>
                                                            </div>
                                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">{issue.message}</p>
                                                            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg">
                                                                <span className="text-lg leading-none">💡</span>
                                                                <span className="leading-snug">{issue.fix_hint}</span>
                                                            </div>
                                                        </div>

                                                        {issue.tab_hint && (
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="shrink-0 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                                                                onClick={() => { onClose(); if (onRoutingRequest) onRoutingRequest(issue.tab_hint); }}
                                                            >
                                                                Fix {issue.tab_hint} <ArrowRight className="w-4 h-4 ml-2" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {issues.critical.length === 0 && issues.warnings.length === 0 && (
                                                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl text-sm space-y-3">
                                                    <p className="font-semibold text-red-700 dark:text-red-300">🔍 No specific constraint identified</p>
                                                    <p className="text-red-600 dark:text-red-400 text-xs leading-relaxed">The solver returned INFEASIBLE without a specific constraint breakdown. Common causes:</p>
                                                    <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
                                                        <li>A faculty member has more weekly hours than their shift allows</li>
                                                        <li>Two workloads target the same group at the same time</li>
                                                        <li>No rooms match a workload’s required tags</li>
                                                    </ul>
                                                    <p className="text-xs text-red-500">Check the engine logs on the left for more details, or download them for analysis.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
