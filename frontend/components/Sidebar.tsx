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
    ChevronLeft,
    Menu,
    X,
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const sidebarLinks = [
    { label: "GENERATE", section: true },
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Master Timetable", href: "/dashboard/timetable", icon: CalendarDays },
    { label: "ANALYZE", section: true },
    { name: "Resource Heatmap", href: "/dashboard/resources", icon: Map },
    { name: "Generation History", href: "/dashboard/history", icon: History },
    { label: "MANAGE", section: true },
    { name: "Data Manager", href: "/dashboard/manage", icon: Settings },
    { name: "Faculty", href: "/dashboard/faculty", icon: BookOpen },
    { label: "SYSTEM", section: true },
    { name: "Documentation", href: "/dashboard/guide", icon: BookOpen },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
    isOpen: boolean;
    onToggle: (open: boolean) => void;
    institutionName?: string;
    userEmail?: string;
}

export function Sidebar({ isOpen, onToggle, institutionName = "ShiftSync", userEmail = "admin@institution.edu" }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const sidebarVariants = {
        open: { x: 0, opacity: 1 },
        closed: { x: -256, opacity: 0 },
    };

    return (
        <>
            {/* Mobile Toggle Button - positioned in header, passed from layout */}

            {/* Sidebar */}
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
                            {/* Header */}
                            <div className="p-6 flex items-center justify-between border-b border-slate-800">
                                <Link href="/" className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                                        <CalendarDays className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-bold text-lg tracking-tight">ShiftSync</span>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onToggle(false)}
                                    className="md:hidden"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>



            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
                {sidebarLinks.map((item, idx) => {
                    if (typeof item === "object" && "section" in item && item.section) {
                        return (
                            <div key={idx} className="px-3 py-3 mt-4">
                                <p className="text-xs uppercase tracking-widest text-slate-600 font-semibold">
                                    {item.label}
                                </p>
                            </div>
                        );
                    }

                    if (typeof item === "object" && "href" in item && "name" in item) {
                        const link = item as any;
                        const isActive = pathname === link.href;
                        const Icon = link.icon;

                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                            >
                                <motion.div
                                    whileHover={{ x: 4 }}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                                        isActive
                                            ? "bg-blue-500/15 border-l-2 border-l-blue-500 text-blue-400 font-semibold"
                                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                    }`}
                                >
                                    {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                                    <span className="text-sm">{link.name}</span>
                                </motion.div>
                            </Link>
                        );
                    }

                    return null;
                })}
            </nav>

                            {/* User Section */}
                            <div className="p-4 border-t border-slate-800 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-9 h-9 border border-slate-700">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-semibold">
                                            AD
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-300 truncate">Admin</p>
                                        <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSignOut}
                                    variant="ghost"
                                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Logout
                                </Button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
