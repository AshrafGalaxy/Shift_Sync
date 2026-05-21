"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, Menu, ChevronRight } from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";

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

                    {/* Right — theme toggle + bell */}
                    <div className="flex items-center gap-2 shrink-0">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-50"
                        >
                            <Bell className="w-4 h-4" />
                            <motion.span
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 2.5 }}
                                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500"
                            />
                        </Button>
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
