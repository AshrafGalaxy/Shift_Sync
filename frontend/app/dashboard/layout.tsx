"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, Menu, Search, LogOut, Zap } from "lucide-react";

import { createClient } from "@/utils/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";

const breadcrumbMap: Record<string, Array<{ label: string; href?: string }>> = {
    "/dashboard": [{ label: "Dashboard" }],
    "/dashboard/timetable": [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Master Timetable" },
    ],
    "/dashboard/resources": [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Resource Heatmap" },
    ],
    "/dashboard/history": [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Generation History" },
    ],
    "/dashboard/faculty": [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Faculty" },
    ],
    "/dashboard/manage": [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Data Manager" },
    ],
    "/dashboard/guide": [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Documentation" },
    ],
    "/dashboard/settings": [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings" },
    ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [institutionName, setInstitutionName] = useState("ShiftSync");
    const [userEmail, setUserEmail] = useState("admin@institution.edu");
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        // Close sidebar on mobile by default
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setSidebarOpen(false);
        }

        // Fetch institution name
        const fetchInstitution = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || "admin@institution.edu");
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("institution_id")
                    .eq("id", user.id)
                    .single();

                if (profile?.institution_id) {
                    const { data: institution } = await supabase
                        .from("institutions")
                        .select("name")
                        .eq("id", profile.institution_id)
                        .single();

                    if (institution) {
                        setInstitutionName(institution.name);
                    }
                }
            }
        };

        fetchInstitution();
    }, []);

    const breadcrumbItems = breadcrumbMap[pathname] || [{ label: "Dashboard" }];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
            <Toaster position="top-right" richColors />

            {/* Sidebar */}
            <Sidebar
                isOpen={isSidebarOpen}
                onToggle={setSidebarOpen}
                institutionName={institutionName}
                userEmail={userEmail}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-hidden print:h-auto print:overflow-visible">
                {/* Top Header */}
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 print:hidden">
                    {/* Left Section */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Mobile Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-50"
                        >
                            <Menu className="w-5 h-5" />
                        </Button>

                        {/* Search */}
                        <div className="hidden md:flex relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="search"
                                placeholder="Search faculty, rooms..."
                                className="w-full bg-slate-100 dark:bg-slate-900/50 border-none pl-9 rounded-full h-9 focus-visible:ring-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative text-slate-500 hover:text-slate-900 dark:hover:text-slate-50"
                        >
                            <Bell className="w-5 h-5" />
                            <motion.span
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"
                            />
                        </Button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible">
                    {/* Breadcrumb */}
                    <Breadcrumb items={breadcrumbItems} />

                    {/* Page Content */}
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
