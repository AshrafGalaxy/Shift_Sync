"use client";

import { useState, useEffect } from "react";
import { BookOpen, Key, AlertTriangle, TableProperties, Workflow, CheckCircle2, Rocket, ArrowRight, Building, Users, Database, Cpu, Eye, Settings } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";

const STEPS = [
    { icon: Settings, color: "text-violet-500 bg-violet-50 dark:bg-violet-500/10", title: "1. Configure Institution", desc: "Set your working days, time slots, and lunch break in Settings.", href: "/dashboard/settings" },
    { icon: Building, color: "text-purple-500 bg-purple-50 dark:bg-purple-500/10", title: "2. Add Rooms", desc: "Register classrooms and labs with capacity and tags (e.g. Projector, Linux_Lab).", href: "/dashboard/manage" },
    { icon: Users, color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10", title: "3. Add Faculty", desc: "Invite faculty members and configure their shift hours and max load.", href: "/dashboard/manage" },
    { icon: Database, color: "text-teal-500 bg-teal-50 dark:bg-teal-500/10", title: "4. Define Workloads", desc: "Assign subjects to faculty -- set type, hours, batches, and required room tags.", href: "/dashboard/manage" },
    { icon: Cpu, color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10", title: "5. Generate Timetable", desc: "Run the AI Solver Engine from the Overview dashboard. Watch real-time logs.", href: "/dashboard" },
    { icon: Eye, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10", title: "6. Review & Export", desc: "View the Master Timetable, filter by faculty/batch, and export to Excel or iCal.", href: "/dashboard/timetable" },
];

const LS_KEY = "shiftsync_guide_completed";

export default function GuidePage() {
    const [completed, setCompleted] = useState<number[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
            if (Array.isArray(stored)) setCompleted(stored);
        } catch { /* ignore */ }
        setMounted(true);
    }, []);

    const toggle = (e: React.MouseEvent, idx: number) => {
        e.preventDefault();
        e.stopPropagation();
        const next = completed.includes(idx) ? completed.filter(i => i !== idx) : [...completed, idx];
        setCompleted(next);
        localStorage.setItem(LS_KEY, JSON.stringify(next));
    };

    const pct = Math.round((completed.length / STEPS.length) * 100);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-blue-600" />
                    Documentation &amp; Guide
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                    Everything you need to go from zero to a fully generated timetable.
                </p>
            </div>

            {/* Quick Start */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-violet-500" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Quick Start -- 6 Steps</h2>
                    </div>
                    {mounted && (
                        <div className="flex items-center gap-3">
                            <div className="w-32 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{completed.length}/{STEPS.length}</span>
                            {completed.length > 0 && (
                                <button onClick={() => { setCompleted([]); localStorage.removeItem(LS_KEY); }} className="text-[10px] text-slate-400 hover:text-red-500 transition-colors">reset</button>
                            )}
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {STEPS.map((step, i) => {
                        const done = completed.includes(i);
                        return (
                            <Link href={step.href} key={i}>
                                <div className={`group flex flex-col gap-3 p-4 rounded-xl border bg-white dark:bg-slate-950 hover:shadow-md transition-all cursor-pointer relative ${done ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700"}`}>
                                    <div className="flex items-start justify-between">
                                        <div className={`w-9 h-9 rounded-lg ${done ? "bg-emerald-100 dark:bg-emerald-900/30" : step.color} flex items-center justify-center shrink-0 transition-colors`}>
                                            {done ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <step.icon className="w-5 h-5" />}
                                        </div>
                                        <button
                                            onClick={(e) => toggle(e, i)}
                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? "bg-emerald-500 border-emerald-500" : "border-slate-300 dark:border-slate-600 hover:border-emerald-400"}`}
                                            title={done ? "Mark incomplete" : "Mark complete"}
                                        >
                                            {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        </button>
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold transition-colors ${done ? "text-emerald-700 dark:text-emerald-400 line-through opacity-70" : "text-slate-900 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-400"}`}>{step.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
                                    </div>
                                    {!done && (
                                        <div className="mt-auto flex items-center gap-1 text-[11px] text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                                            Go there <ArrowRight className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
                {mounted && pct === 100 && (
                    <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-semibold animate-in fade-in duration-300">
                        <CheckCircle2 className="w-4 h-4" /> All steps complete -- you are ready to generate!
                    </div>
                )}
            </div>

            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Critical Requirements for Sub-Batches
                    </CardTitle>
                    <CardDescription className="text-red-600/80 dark:text-red-400/80 font-medium">
                        You MUST follow strict naming conventions to prevent Labs and Theory classes from clashing.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-800 dark:text-slate-200">
                    <p>
                        The AI Solver uses a <strong>Substring Mapping Heuristic</strong> to link Batches (Practical/Tutorial) to their Parent Divisions (Theory). If a Parent Division is scheduled for a Theory class, the solver will physically block all of its child batches from being scheduled for Labs at that exact same time.
                    </p>
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-red-100 dark:border-red-900/50">
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 font-bold mt-0.5">x</span>
                                <div>
                                    <strong className="block text-red-700 dark:text-red-400">Incorrect Naming</strong>
                                    Parent: <code>SY-CSDS-A</code> <br />
                                    Child: <code>B1</code> <br />
                                    <em>(The solver does not know B1 belongs to SY-CSDS-A and they will clash.)</em>
                                </div>
                            </li>
                            <li className="flex items-start gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-emerald-500 font-bold mt-0.5">v</span>
                                <div>
                                    <strong className="block text-emerald-700 dark:text-emerald-400">Correct Naming</strong>
                                    Parent: <code>SY-CSDS-A</code> <br />
                                    Child: <code>SY-CSDS-A-B1</code> or <code>SY-CSDS-A (B1)</code> <br />
                                    <em>(Because "SY-CSDS-A" is inside the child text, the solver locks them together.)</em>
                                </div>
                            </li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TableProperties className="w-5 h-5 text-blue-600" />
                        CSV Upload Standards
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-600 dark:text-slate-300">
                    <p>When mass-importing data via CSV on the Overview page, your Excel files must adhere to strict formatting rules:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Arrays &amp; Lists:</strong> Any field that accepts multiple items (like <code>required_tags</code> for Rooms or <code>target_groups</code> for Workloads) must be separated by the pipe character <code>|</code>.</li>
                        <li><strong>Tags:</strong> Ensure room tags exactly match the required tags in a faculty workload. A classroom cannot host an event unless it holds 100% of the tags requested.</li>
                        <li><strong>Empty Fields:</strong> Leave empty cells blank. The ingestion engine will automatically convert them to empty arrays or default values.</li>
                    </ul>
                </CardContent>
            </Card>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mt-8 mb-4 border-b pb-2 flex items-center gap-2">
                <Workflow className="w-6 h-6 text-purple-600" />
                Active Solver Constraints
            </h2>

            <Accordion type="single" collapsible className="w-full bg-white dark:bg-slate-950 rounded-lg border shadow-sm">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="px-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="w-5 h-5 text-emerald-500" />Lab Continuity (Consecutive Hours)</div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/20">
                        <p>If a Workload is assigned <strong>Consecutive Hours &gt; 1</strong> (e.g., a 2-hour Practical Lab):</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>It mathematically cannot be fragmented. It will be scheduled as a single, unbroken block.</li>
                            <li>The block strictly stays inside the exact same <strong>Room</strong> with the exact same <strong>Teacher</strong>.</li>
                            <li>A 2-hour lab cannot start 1 hour before lunch, or 1 hour before the college day ends.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger className="px-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="w-5 h-5 text-emerald-500" />Shift &amp; Shift-Block Boundaries</div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/20">
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Global Lunch:</strong> No classes will ever be scheduled during the college-wide lunch slot.</li>
                            <li><strong>Faculty Shifts:</strong> A professor will only be scheduled within their defined shift hours.</li>
                            <li><strong>Blocked Slots:</strong> Visiting faculty can declare specific times as unavailable -- those are zeroed out by the solver.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                    <AccordionTrigger className="px-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="w-5 h-5 text-emerald-500" />Room &amp; Faculty Double Booking Rules</div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/20">
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>A specific Faculty member can only be in one place at one time.</li>
                            <li>A Room can only host a single event at any given time.</li>
                            <li>If a Room hosts a 3-hour lab 8-11 AM, the solver projects a shadow over 9 AM and 10 AM.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                    <AccordionTrigger className="px-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="w-5 h-5 text-emerald-500" />Workload Hours Fulfillment</div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/20">
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>If a faculty requires 4 hours of Theory, the solver assigns exactly 4 one-hour blocks across the week.</li>
                            <li>If a faculty requires 4 hours of Practical (2-hr consecutive), the solver assigns exactly 2 two-hour blocks.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                    <AccordionTrigger className="px-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div className="flex items-center gap-2 font-semibold"><Key className="w-5 h-5 text-emerald-500" />Custom Rules &amp; Pinned Classes</div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/20">
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>FORCE_PIN:</strong> Locking a slot mathematically bolts that Class, Faculty, Batch, and Room to that exact Time and Day.</li>
                            <li><strong>RESTRICT_TIME:</strong> Backend rules can restrict certain subjects to only Morning or Afternoon slots.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
