"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Menu, ChevronRight, AlertTriangle, CheckCircle2, AlertCircle, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Admin-only routes — faculty gets redirected away from these
const ADMIN_ONLY_ROUTES = [
    "/dashboard",
    "/dashboard/resources",
    "/dashboard/history",
    "/dashboard/manage",
];

const pageMetaMap: Record<string, { title: string; sub: string }> = {
    "/dashboard":           { title: "Overview",            sub: "AI engine, data ingestion & system health" },
    "/dashboard/timetable": { title: "Master Timetable",    sub: "View and export the generated schedule" },
    "/dashboard/resources": { title: "Resource Heatmap",    sub: "Room and faculty utilisation analysis" },
    "/dashboard/history":   { title: "Generation History",  sub: "All past timetable runs and results" },
    "/dashboard/faculty":   { title: "Faculty",             sub: "Faculty profiles and workload overview" },
    "/dashboard/manage":    { title: "Data Manager",        sub: "Bulk edit rooms, faculty and workloads" },
    "/dashboard/guide":     { title: "Documentation",       sub: "How to use ShiftSync effectively" },
    "/dashboard/settings":  { title: "Settings",            sub: "Account and institution preferences" },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [institutionName, setInstitutionName] = useState("ShiftSync");
    const [userEmail, setUserEmail] = useState("admin@institution.edu");
    const [userRole, setUserRole] = useState<string>("admin");
    const [userName, setUserName] = useState<string>("Admin");
    const [notifications, setNotifications] = useState<{id: string; type: "error"|"warning"|"success"; title: string; body: string; ts?: string; link?: string}[]>([]);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifRead, setNotifRead] = useState(false);
    const notifHashRef = useRef("");
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setSidebarOpen(false);
        }

        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }

            setUserEmail(user.email || "admin@institution.edu");

            const { data: profile } = await supabase
                .from("profiles")
                .select("institution_id, role, full_name")
                .eq("id", user.id)
                .single();

            if (profile) {
                const role = profile.role ?? "admin";
                setUserRole(role);
                setUserName(profile.full_name ?? "User");

                // Faculty redirect: if on an admin-only page, send to faculty portal
                if (role === "faculty" && ADMIN_ONLY_ROUTES.includes(pathname)) {
                    router.replace("/dashboard/faculty");
                    return;
                }

                if (profile.institution_id) {
                    const { data: institution } = await supabase
                        .from("institutions")
                        .select("name")
                        .eq("id", profile.institution_id)
                        .single();
                    if (institution) setInstitutionName(institution.name);
                }
            }
        };

        fetchUserData();
    }, [pathname]);

    // Fetch notifications from live data
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
                if (!profile?.institution_id) return;
                const instId = profile.institution_id;

                const notifs: typeof notifications = [];

                // 1. Check latest generation status
                const { data: latest } = await supabase
                    .from("generated_timetables")
                    .select("id, status, created_at, matrix_data")
                    .eq("institution_id", instId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                if (latest) {
                    const ts = format(new Date(latest.created_at), "MMM d, h:mm a");
                    if (latest.status === "failed") {
                        notifs.push({ id: "gen-fail", type: "error", title: "Last generation failed", body: "Check the engine logs for diagnostics.", ts, link: "/dashboard/history" });
                    } else if (latest.status === "success_with_overflow") {
                        const raw = latest.matrix_data;
                        const schedule = Array.isArray(raw) ? raw : (raw?.schedule ?? []);
                        const overflowCount = schedule.filter((s: any) => s.needs_room_assignment).length;
                        notifs.push({ id: "overflow", type: "warning", title: `${overflowCount} ghost-room slot(s)`, body: "Some classes have no matching room. Assign rooms in Data Manager.", ts, link: "/dashboard/timetable" });
                    } else if (latest.status === "success") {
                        notifs.push({ id: "gen-ok", type: "success", title: "Timetable ready", body: `Generated ${ts} — all constraints satisfied.`, ts, link: "/dashboard/timetable" });
                    }
                }

                // 2. Check data readiness issues
                const { count: roomCount } = await supabase.from("rooms").select("*", { count: "exact", head: true }).eq("institution_id", instId);
                const { count: facCount } = await supabase.from("faculty_settings").select("*", { count: "exact", head: true }).eq("institution_id", instId);

                if (!roomCount || roomCount === 0) notifs.push({ id: "no-rooms", type: "error", title: "No rooms configured", body: "Add at least one room before generating.", link: "/dashboard/manage" });
                if (!facCount || facCount === 0) notifs.push({ id: "no-fac", type: "error", title: "No faculty configured", body: "Add at least one faculty member before generating.", link: "/dashboard/manage" });

                const newHash = notifs.map(n => n.id).join(",");
                if (newHash === notifHashRef.current) return; // No change — skip re-render + red-dot
                notifHashRef.current = newHash;
                setNotifications(notifs);
                setNotifRead(false);
            } catch { /* silent */ }
        };
        fetchNotifications();
    }, [pathname]);

    const pageMeta = pageMetaMap[pathname] ?? { title: "Dashboard", sub: "ShiftSync" };

    return (
        // ── Root: exact viewport height, no page-level scroll ──────────────
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-row">
            <Toaster position="top-right" richColors />

            {/* Sidebar — role-aware */}
            <Sidebar
                isOpen={isSidebarOpen}
                onToggle={setSidebarOpen}
                institutionName={institutionName}
                userEmail={userEmail}
                userRole={userRole}
                userName={userName}
            />

            {/* ── Main content column ────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 print:overflow-visible">

                {/* ── Top header ──────────────────────────────────────────── */}
                <header className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-30 print:hidden">

                    {/* Left — hamburger + page breadcrumb */}
                    <div className="flex items-center gap-3 min-w-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="shrink-0 h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-50"
                        >
                            <Menu className="w-4 h-4" />
                        </Button>

                        <div className="hidden md:flex items-center gap-1.5 min-w-0">
                            <Link
                                href={userRole === "faculty" ? "/dashboard/faculty" : "/dashboard"}
                                className="text-sm font-semibold text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors shrink-0"
                            >
                                ShiftSync
                            </Link>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 shrink-0" />
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                                {pageMeta.title}
                            </span>
                        </div>
                    </div>

                    {/* Right — theme toggle + notification bell */}
                    <div className="flex items-center gap-2 shrink-0">
                        <ThemeToggle />

                        <Popover open={notifOpen} onOpenChange={(o: boolean) => { setNotifOpen(o); if (o) setNotifRead(true); }}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-50"
                                >
                                    <Bell className="w-4 h-4" />
                                    {!notifRead && notifications.length > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-slate-950"
                                        />
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80 p-0 shadow-xl border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-slate-500" />
                                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">Notifications</span>
                                        {notifications.length > 0 && (
                                            <span className="text-[10px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded-full">{notifications.length}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                                            <CheckCircle2 className="w-8 h-8 opacity-40" />
                                            <p className="text-sm font-medium">All clear — no issues</p>
                                        </div>
                                    ) : notifications.map(n => (
                                        <div
                                            key={n.id}
                                            className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                                                n.type === "error" ? "border-l-2 border-red-400" :
                                                n.type === "warning" ? "border-l-2 border-amber-400" :
                                                "border-l-2 border-emerald-400"
                                            }`}
                                            onClick={() => { if (n.link) { router.push(n.link); setNotifOpen(false); } }}
                                        >
                                            <div className="mt-0.5 shrink-0">
                                                {n.type === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                                                {n.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                                {n.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">{n.title}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{n.body}</p>
                                                {n.ts && <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">{n.ts}</p>}
                                            </div>
                                            {n.link && <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />}
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </header>

                {/* ── Page content: the ONLY scrollable element ─────────── */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 print:p-0 print:overflow-visible">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
