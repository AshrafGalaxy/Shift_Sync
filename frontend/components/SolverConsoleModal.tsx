"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Play, Download, Terminal, X, ArrowRight, LayoutDashboard, Database, Building } from "lucide-react";
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
}

export default function SolverConsoleModal({ isOpen, onClose, payload, onRoutingRequest, onSuccess, onLogsComplete }: SolverConsoleModalProps) {
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
            // Decoupled API call via Next.js server proxy
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Infeasible / Error
                let diag = data.diagnosis || {};
                setIssues({
                    critical: diag.critical || [],
                    warnings: diag.warnings || []
                });
                
                // Artificially stream logs if provided, then fail
                await streamLogs(data.progress_log || ["[ERROR] Engine encountered fatal constraints."], true);
                setStep("failed");
                return;
            }

            // Success or Warning (Overflow)
            const targetStep = data.status === "success_with_overflow" ? "warning" : "success";
            setScore(data.optimality_score ?? 100);
            setOverflowCount(data.overflow_count ?? 0);
            
            // Dynamic delay: stream logs smoothly
            await streamLogs(data.progress_log || ["[SUCCESS] Timetable generated."], false, data.optimality_score);
            
            setStep(targetStep);
            if (onLogsComplete) onLogsComplete(data.progress_log || [], data.optimality_score ?? 100);
            if (onSuccess) onSuccess();

        } catch (err: any) {
            setLogs(prev => [...prev, `[FATAL ERROR] ${err.message}`]);
            setStep("failed");
        }
    };

    const streamLogs = async (incomingLogs: string[], isFailure: boolean, optScore: number = 100) => {
        // Dynamic speed based on optimality score (lower score = slower so they can read conflicts)
        const baseDelay = isFailure ? 300 : (optScore < 80 ? 200 : 80);
        
        for (let i = 0; i < incomingLogs.length; i++) {
            await new Promise(r => setTimeout(r, baseDelay + Math.random() * 50)); // Jitter for realism
            setLogs(prev => [...prev, incomingLogs[i]]);
        }
        await new Promise(r => setTimeout(r, 500)); // Final pause
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
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <Terminal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Left: Terminal Logs (Always visible, takes up space) */}
                    <div className={`flex-1 flex flex-col bg-slate-950 p-4 overflow-hidden relative transition-all duration-500 ${step === 'solving' ? 'w-full' : 'w-full md:w-1/2 border-r border-slate-800'}`}>
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
                                <div key={idx} className={`${log.includes('[ERROR]') ? 'text-red-400' : log.includes('[SUCCESS]') ? 'text-emerald-400' : log.includes('[STEP') ? 'text-blue-400 font-bold mt-3' : 'opacity-80'}`}>
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

                    {/* Right: Results Dashboard (Fades in when done) */}
                    <AnimatePresence>
                        {step !== "solving" && step !== "idle" && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/20 p-6 flex flex-col"
                            >
                                {step === "success" && (
                                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                                        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Optimal Timetable Generated!</h3>
                                        <p className="text-slate-500 max-w-md">The AI successfully mapped all variables with zero hard constraint violations.</p>
                                        
                                        <div className="mt-8 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 w-full max-w-sm flex flex-col items-center">
                                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">Optimality Score</span>
                                            <div className="text-5xl font-black text-emerald-600 dark:text-emerald-400">
                                                {score}/100
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === "warning" && (
                                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                                        <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                            <AlertTriangle className="w-12 h-12 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Generated with Overflow</h3>
                                        <p className="text-slate-500 max-w-md">All faculty and groups were scheduled, but some classes required Ghost Rooms due to physical capacity constraints.</p>
                                        
                                        <div className="mt-6 w-full space-y-3">
                                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center justify-between">
                                                <div className="flex flex-col text-left">
                                                    <span className="font-semibold text-amber-900 dark:text-amber-200">Manual Assignment Needed</span>
                                                    <span className="text-sm text-amber-700 dark:text-amber-400/80">{overflowCount} slot(s) are currently marked as TBD in the schedule.</span>
                                                </div>
                                                <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30" onClick={() => { onClose(); if(onRoutingRequest) onRoutingRequest("timetable"); }}>
                                                    View Grid
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === "failed" && (
                                    <div className="flex flex-col space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
                                                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Generation Failed</h3>
                                                <p className="text-sm text-slate-500">The constraints are mathematically impossible. Please resolve the critical issues below.</p>
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
                                                                onClick={() => { onClose(); if(onRoutingRequest) onRoutingRequest(issue.tab_hint); }}
                                                            >
                                                                Fix {issue.tab_hint} <ArrowRight className="w-4 h-4 ml-2" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {issues.critical.length === 0 && issues.warnings.length === 0 && (
                                                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
                                                    Unknown error occurred. Please check logs.
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
