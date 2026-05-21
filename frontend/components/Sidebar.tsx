"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    CalendarDays,
    Map,
    History,
    BookOpen,
    Settings,
    LogOut,
    X,
    Users,
    Shield,
    GraduationCap,
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// ── Nav structure (role-gated) ──────────────────────────────────────────
const ADMIN_LINKS = [
    { label: "GENERATE", section: true },
    { name: "Overview",           href: "/dashboard",           icon: LayoutDashboard, roles: ["admin"] },
    { name: "Master Timetable",   href: "/dashboard/timetable", icon: CalendarDays,    roles: ["admin", "faculty"] },
    { label: "ANALYZE", section: true, roles: ["admin"] },
    { name: "Resource Heatmap",   href: "/dashboard/resources", icon: Map,             roles: ["admin"] },
    { name: "Generation History", href: "/dashboard/history",   icon: History,         roles: ["admin"] },
    { label: "MANAGE", section: true, roles: ["admin"] },
    { name: "Data Manager",       href: "/dashboard/manage",    icon: Settings,        roles: ["admin"] },
    { name: "Faculty",            href: "/dashboard/faculty",   icon: Users,           roles: ["admin", "faculty"] },
    { label: "SYSTEM", section: true },
    { name: "Documentation",      href: "/dashboard/guide",     icon: BookOpen,        roles: ["admin", "faculty"] },
    { name: "Settings",           href: "/dashboard/settings",  icon: Settings,        roles: ["admin", "faculty"] },
];

interface SidebarProps {
    isOpen: boolean;
    onToggle: (open: boolean) => void;
    institutionName?: string;
    userEmail?: string;
    userRole?: string;
    userName?: string;
}

export function Sidebar({
    isOpen,
    onToggle,
    institutionName = "ShiftSync",
    userEmail = "admin@institution.edu",
    userRole = "admin",
    userName = "Admin",
}: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const isFaculty = userRole === "faculty";
    const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    const sidebarVariants = {
        open: { x: 0, opacity: 1 },
        closed: { x: -256, opacity: 0 },
    };

    return (
        <>
            <AnimatePresence mode="wait">
                {isOpen && (
                    <>
                        {/* Mobile Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => onToggle(false)}
                            className="fixed inset-0 bg-black/50 z-30 md:hidden"
                        />

                        {/* Sidebar Panel */}
                        <motion.aside
                            variants={sidebarVariants}
                            initial="closed"
                            animate="open"
                            exit="closed"
                            transition={{ duration: 0.3 }}
                            className="fixed md:relative inset-y-0 left-0 z-40 w-64 flex flex-col bg-slate-950 border-r border-slate-800 overflow-hidden print:hidden"
                        >
                            {/* Logo header */}
                            <div className="p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
                                <Link href={isFaculty ? "/dashboard/faculty" : "/dashboard"} className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                                        <CalendarDays className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-bold text-lg tracking-tight text-white">ShiftSync</span>
                                </Link>
                                <Button variant="ghost" size="icon" onClick={() => onToggle(false)} className="md:hidden">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Navigation Links */}
                            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
                                {ADMIN_LINKS.map((item, idx) => {
                                    // Section headers — show only if at least one link in section is visible
                                    if ("section" in item && item.section) {
                                        // Hide admin-only sections for faculty
                                        if (item.roles && !item.roles.includes(userRole)) return null;
                                        return (
                                            <div key={idx} className="px-3 py-3 mt-3 first:mt-0">
                                                <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">
                                                    {item.label}
                                                </p>
                                            </div>
                                        );
                                    }

                                    if ("href" in item && "name" in item) {
                                        const link = item as any;
                                        // Filter by role
                                        if (link.roles && !link.roles.includes(userRole)) return null;

                                        const isActive = pathname === link.href;
                                        const Icon = link.icon;

                                        return (
                                            <Link key={link.name} href={link.href}>
                                                <motion.div
                                                    whileHover={{ x: 3 }}
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                                                        isActive
                                                            ? "bg-blue-500/15 border-l-2 border-l-blue-500 text-blue-400 font-semibold"
                                                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                                    }`}
                                                >
                                                    {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                                                    <span>{link.name}</span>
                                                </motion.div>
                                            </Link>
                                        );
                                    }
                                    return null;
                                })}
                            </nav>

                            {/* User footer */}
                            <div className="p-4 border-t border-slate-800 shrink-0 space-y-3">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-9 h-9 border border-slate-700 shrink-0">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-semibold">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-medium text-slate-300 truncate">{userName}</p>
                                            <Badge
                                                className={`text-[9px] px-1.5 py-0 h-4 shrink-0 font-bold ${
                                                    isFaculty
                                                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                                        : "bg-violet-500/20 text-violet-300 border-violet-500/30"
                                                }`}
                                            >
                                                {isFaculty ? <><GraduationCap className="w-2.5 h-2.5 mr-0.5 inline" />FACULTY</> : <><Shield className="w-2.5 h-2.5 mr-0.5 inline" />ADMIN</>}
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSignOut}
                                    variant="ghost"
                                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 text-sm"
                                >
                                    <LogOut className="w-4 h-4 mr-2" /> Logout
                                </Button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
