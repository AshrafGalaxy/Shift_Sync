"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    CalendarDays,
    Map,
    Users,
    Settings,
    Bell,
    Search,
    Menu,
    X,
    LogOut,
    History,
    BookOpen,
    Database
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";

const sidebarLinks = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Master Timetable", href: "/dashboard/timetable", icon: CalendarDays },
    { name: "Resource Heatmap", href: "/dashboard/resources", icon: Map },
    { name: "Generation History", href: "/dashboard/history", icon: History },
    { name: "Data Manager", href: "/dashboard/manage", icon: Database },
    { name: "Documentation", href: "/dashboard/guide", icon: BookOpen },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch initial unread count + subscribe to new notifications in real-time
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Initial count
            const { count } = await supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .eq("recipient_id", user.id)
                .eq("is_read", false);
            setUnreadCount(count ?? 0);

            // Real-time subscription
            channel = supabase
                .channel(`layout-notif:${user.id}`)
                .on("postgres_changes", {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `recipient_id=eq.${user.id}`,
                }, () => setUnreadCount((prev) => prev + 1))
                .on("postgres_changes", {
                    event: "UPDATE",
                    schema: "public",
                    table: "notifications",
                    filter: `recipient_id=eq.${user.id}`,
                }, () => {
                    // Recount on any update (mark-as-read events)
                    supabase
                        .from("notifications")
                        .select("*", { count: "exact", head: true })
                        .eq("recipient_id", user.id)
                        .eq("is_read", false)
                        .then(({ count: c }) => setUnreadCount(c ?? 0));
                })
                .subscribe();
        })();
        return () => { if (channel) supabase.removeChannel(channel); };
    }, [supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 print:hidden">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                        <CalendarDays className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">ShiftSync</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
            </div>

            {/* Sidebar Navigation */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 256, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className={`fixed inset-y-0 left-0 z-40 transform bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:flex md:w-64 flex-col overflow-hidden h-screen print:hidden`}
                    >
                        <div className="p-6 hidden md:flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <CalendarDays className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-50">ShiftSync</span>
                        </div>

                        <div className="px-4 pb-4 md:pt-4 flex-1 space-y-1 overflow-y-auto">
                            {sidebarLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link key={link.name} href={link.href}>
                                        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-50"}`}>
                                            <link.icon className={`w-5 h-5 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                                            {link.name}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between px-3 py-2">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-9 h-9 border border-slate-200 dark:border-slate-800">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="bg-gradient-to-r from-teal-400 to-emerald-400 text-white font-medium">SA</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900 dark:text-slate-50">Super Admin</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">admin@shiftsync.edu</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out" className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                                    <LogOut className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden print:h-auto print:overflow-visible">
                {/* Top Header */}
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md hidden md:flex items-center justify-between px-8 sticky top-0 z-30 print:hidden">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-50">
                            <Menu className="w-5 h-5" />
                        </Button>
                        <div className="relative w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="search"
                                placeholder="Search faculty, rooms, subjects..."
                                className="w-full bg-slate-100 dark:bg-slate-900/50 border-none pl-9 rounded-full h-9 focus-visible:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 dark:hover:text-slate-50">
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 border-2 border-white dark:border-slate-950 text-[10px] text-white font-bold flex items-center justify-center px-1">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </Button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible">
                    {children}
                </div>
            </main>

        </div>
    );
}
