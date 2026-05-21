"use client";

import { AlertTriangle, Info, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface Issue {
    constraint: string;
    entity: string;
    message: string;
    fix_hint: string;
    tab_hint?: string;
}

interface Diagnosis {
    total_issues: number;
    critical: Issue[];
    warnings: Issue[];
}

interface Props {
    open: boolean;
    diagnosis: Diagnosis | null;
    onClose: () => void;
    /** Optional: called with tab name so parent can switch to the right tab */
    onNavigate?: (tab: string) => void;
}

export function ConflictRefinerModal({ open, diagnosis, onClose, onNavigate }: Props) {
    if (!diagnosis) return null;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-2xl w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {/* ── Header ─────────────────────────────────────────────── */}
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xl font-bold">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        Generation Failed — Constraint Violations Found
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        The AI solver could not build a valid timetable.{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {diagnosis.total_issues} issue{diagnosis.total_issues !== 1 ? "s" : ""}
                        </span>{" "}
                        detected. Fix the items below and regenerate.
                    </DialogDescription>
                </DialogHeader>

                {/* ── Issue List ──────────────────────────────────────────── */}
                <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                    {diagnosis.critical.map((issue, i) => (
                        <IssueCard key={`c-${i}`} issue={issue} severity="critical" onNavigate={onNavigate} />
                    ))}
                    {diagnosis.warnings.map((issue, i) => (
                        <IssueCard key={`w-${i}`} issue={issue} severity="warning" onNavigate={onNavigate} />
                    ))}
                    {diagnosis.total_issues === 0 && (
                        <p className="text-center text-slate-400 text-sm py-8">
                            No specific violations detected — the solver timeout may be too short.
                            Try extending <code>max_time_in_seconds</code> in engine.py.
                        </p>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────── */}
                <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        <X className="w-4 h-4 mr-2" />
                        Close & Fix
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function IssueCard({
    issue,
    severity,
    onNavigate,
}: {
    issue: Issue;
    severity: "critical" | "warning";
    onNavigate?: (tab: string) => void;
}) {
    const isCritical = severity === "critical";
    return (
        <div
            className={`rounded-xl border p-4 space-y-2 ${
                isCritical
                    ? "border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10"
                    : "border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10"
            }`}
        >
            {/* Row 1: badge + constraint name + entity chip */}
            <div className="flex items-start gap-2 flex-wrap">
                <span
                    className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded shrink-0 ${
                        isCritical
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    }`}
                >
                    {isCritical ? "Critical" : "Warning"}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {issue.constraint}
                </span>
                {issue.entity && (
                    <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                        {issue.entity}
                    </span>
                )}
            </div>

            {/* Row 2: message */}
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {issue.message}
            </p>

            {/* Row 3: fix hint */}
            <div
                className={`text-xs rounded-lg px-3 py-2 border flex items-start gap-2 ${
                    isCritical
                        ? "bg-white dark:bg-slate-900 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300"
                        : "bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-300"
                }`}
            >
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{issue.fix_hint}</span>
            </div>

            {/* Row 4: navigate button */}
            {issue.tab_hint && onNavigate && (
                <button
                    onClick={() => { onNavigate(issue.tab_hint!); }}
                    className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                    <ExternalLink className="w-3 h-3" />
                    Open {issue.tab_hint} tab
                </button>
            )}
        </div>
    );
}
