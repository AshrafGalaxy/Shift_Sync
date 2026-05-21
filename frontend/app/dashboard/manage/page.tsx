"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Database, Building, Users, BookOpen, Loader2, Archive, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/client";
import RoomGrid from "./_components/RoomGrid";
import FacultyGrid from "./_components/FacultyGrid";
import WorkloadGrid from "./_components/WorkloadGrid";

export interface Room {
    id: string;
    name: string;
    type: string;
    capacity: number;
    tags: string[];
    institution_id: string;
    is_archived?: boolean;
}

export interface Faculty {
    id: string;
    profile_id: string;
    max_load_hrs: number;
    max_continuous_hrs: number;
    shift_hours: number[];
    blocked_slots: { day: string; time: number }[];
    class_teacher_for: string | null;
    full_name?: string;
    is_archived?: boolean;
}

export interface Workload {
    id: string;
    faculty_id: string;
    subject_code: string;
    type: string;
    target_groups: string[];
    weekly_hours: number;
    consecutive_hours: number;
    required_tags: string[];
    is_online: boolean;
    faculty_name?: string;
}

export default function ManagePage() {
    const [activeTab, setActiveTab] = useState("rooms");
    const [rooms, setRooms] = useState<Room[]>([]);
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [workloads, setWorkloads] = useState<Workload[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [institutionId, setInstitutionId] = useState<string | null>(null);
    const supabase = createClient();

    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("institution_id")
                .eq("id", user.id)
                .single();

            if (!profile?.institution_id) return;
            const instId = profile.institution_id;
            setInstitutionId(instId);

            const [roomsRes, facultyRes, workloadsRes] = await Promise.all([
                supabase.from("rooms").select("*").eq("institution_id", instId).order("name"),
                supabase
                    .from("faculty_settings")
                    .select("*, profiles(full_name)")
                    .order("created_at"),
                supabase
                    .from("workloads")
                    .select("*, faculty_settings(profiles(full_name))")
                    .order("subject_code"),
            ]);

            setRooms(roomsRes.data || []);
            setFaculty(
                (facultyRes.data || []).map((f: any) => ({
                    ...f,
                    full_name: f.profiles?.full_name ?? "Unknown",
                }))
            );
            setWorkloads(
                (workloadsRes.data || []).map((w: any) => ({
                    ...w,
                    faculty_name: w.faculty_settings?.profiles?.full_name ?? "Unknown",
                }))
            );
        } catch (err) {
            console.error("Manage page fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    if (isLoading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Loading data registry...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <Database className="w-6 h-6 text-blue-600" />
                    Data Manager
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    View, edit, and delete individual records across all entity types.
                </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Rooms", count: rooms.length, icon: Building, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" },
                    { label: "Faculty", count: faculty.length, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                    { label: "Workloads", count: workloads.length, icon: BookOpen, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-500/10" },
                ].map((stat) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm"
                    >
                        <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stat.count}</p>
                            <p className="text-xs text-slate-500">{stat.label} registered</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-slate-100 dark:bg-slate-900 p-1">
                    <TabsTrigger value="rooms" className="flex items-center gap-2">
                        <Building className="w-4 h-4" /> Room Directory
                    </TabsTrigger>
                    <TabsTrigger value="faculty" className="flex items-center gap-2">
                        <Users className="w-4 h-4" /> Faculty Roster
                    </TabsTrigger>
                    <TabsTrigger value="workloads" className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Workload Registry
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="flex items-center gap-2">
                        <Archive className="w-4 h-4" /> Archived
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="rooms" className="mt-4">
                    <RoomGrid
                        data={rooms}
                        onDataChange={fetchAll}
                    />
                </TabsContent>

                <TabsContent value="faculty" className="mt-4">
                    <FacultyGrid
                        data={faculty}
                        onDataChange={fetchAll}
                    />
                </TabsContent>

                <TabsContent value="workloads" className="mt-4">
                    <WorkloadGrid
                        data={workloads}
                        onDataChange={fetchAll}
                    />
                </TabsContent>

                <TabsContent value="archived" className="mt-4">
                    <div className="space-y-6">
                        {/* Archived Rooms */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <Building className="w-4 h-4 text-purple-500" />
                                Archived Rooms ({rooms.filter(r => r.is_archived).length})
                            </h3>
                            {rooms.filter(r => r.is_archived).length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No archived rooms.</p>
                            ) : (
                                <div className="space-y-2">
                                    {rooms.filter(r => r.is_archived).map(r => (
                                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
                                            <div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.name}</p>
                                                <p className="text-xs text-slate-400">{r.type} · Capacity {r.capacity}</p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    await createClient().from("rooms").update({ is_archived: false }).eq("id", r.id);
                                                    fetchAll();
                                                }}
                                                className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium px-3 py-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" /> Restore
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Archived Faculty */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                Archived Faculty ({faculty.filter(f => f.is_archived).length})
                            </h3>
                            {faculty.filter(f => f.is_archived).length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No archived faculty.</p>
                            ) : (
                                <div className="space-y-2">
                                    {faculty.filter(f => f.is_archived).map(f => (
                                        <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
                                            <div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{f.full_name ?? "Unknown"}</p>
                                                <p className="text-xs text-slate-400">Max {f.max_load_hrs} hrs/wk</p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    await createClient().from("faculty_settings").update({ is_archived: false }).eq("id", f.id);
                                                    fetchAll();
                                                }}
                                                className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium px-3 py-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" /> Restore
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
