"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Filter, Download, Plus, ChevronLeft, ChevronRight, Maximize2, Minimize2, Loader2, CalendarDays, FileSpreadsheet, Calendar as CalendarIcon, Printer, FileText, ChevronDown, Lock, Unlock, Send, AlertTriangle, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TIMES = [8, 9, 10, 11, 12, 13, 14, 15, 16];

const mapMilitaryTo12Hour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h.toString().padStart(2, '0')}:00 ${period}`;
};

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export function MasterTimetableView({ targetIdProp, hideFullscreen }: { targetIdProp?: string, hideFullscreen?: boolean } = {}) {
    const searchParams = useSearchParams();
    const targetId = targetIdProp || searchParams.get("id");

    const [activeFilter, setActiveFilter] = useState("All Divisions");
    const [availableFilters, setAvailableFilters] = useState<string[]>(["All Divisions"]);
    const [slots, setSlots] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [pinnedClasses, setPinnedClasses] = useState<string[]>([]);
    const [instId, setInstId] = useState<string | null>(null);
    const [lunchSlot, setLunchSlot] = useState<number>(13);
    const [overflowCount, setOverflowCount] = useState<number>(0);
    const [overflowBannerDismissed, setOverflowBannerDismissed] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const togglePin = (slot: any) => {
        if (!instId || !slot.workload_id) return;
        const key = `${slot.workload_id}|${slot.room}|${slot.day}|${slot.time}`;
        let newPins;
        if (pinnedClasses.includes(key)) {
            newPins = pinnedClasses.filter(k => k !== key);
        } else {
            newPins = [...pinnedClasses, key];
        }
        setPinnedClasses(newPins);
        localStorage.setItem(`pinned_classes_${instId}`, JSON.stringify(newPins));
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        const fetchLatestTimetable = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Not logged in");

                const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
                if (!profile?.institution_id) throw new Error("No institution");
                setInstId(profile.institution_id);

                const { data: instData } = await supabase.from("institutions").select("lunch_slot").eq("id", profile.institution_id).single();
                if (instData?.lunch_slot) setLunchSlot(instData.lunch_slot);

                const storedPins = localStorage.getItem(`pinned_classes_${profile.institution_id}`);
                if (storedPins) setPinnedClasses(JSON.parse(storedPins));

                const cacheKey = `tt_cache_${profile.institution_id}${targetId ? '_' + targetId : ''}`;
                const forceRefresh = localStorage.getItem('force_tt_refresh');
                
                if (!forceRefresh) {
                    const cachedData = sessionStorage.getItem(cacheKey);
                    if (cachedData) {
                        const parsedCache = JSON.parse(cachedData);
                        setSlots(parsedCache.slots);
                        setAvailableFilters(parsedCache.filters);
                        if (parsedCache.lunch) setLunchSlot(parsedCache.lunch);
                        setIsLoading(false);
                        return; // Skipped Supabase Query
                    }
                } else {
                    localStorage.removeItem('force_tt_refresh');
                }

                let query = supabase
                    .from("generated_timetables")
                    .select("matrix_data")
                    .eq("institution_id", profile.institution_id);

                if (targetId) {
                    query = query.eq("id", targetId);
                } else {
                    query = query.eq("is_active", true).order("created_at", { ascending: false }).limit(1);
                }

                const { data: latestTimetable, error } = await query.single();
                if (error) {
                    // Suppress error if it's just 'no rows returned'
                    if (error.code !== "PGRST116") console.error("Timetable Fetch Error:", error);
                }

                if (latestTimetable && latestTimetable.matrix_data && latestTimetable.matrix_data.schedule) {
                    // Map Python generic array back into our UI grid system
                    const schedule = latestTimetable.matrix_data.schedule ?? [];
                    const mappedSlots = schedule.map((entry: any) => ({
                        workload_id: entry.workload_id,
                        day: entry.day, // e.g. "Mon"
                        time: entry.time_slot,
                        subject: entry.subject,
                        faculty: entry.faculty_name || entry.faculty_id,
                        room: entry.room,
                        targets: entry.targets || [],
                        type: entry.type === "Tutorial" || entry.subject.includes("TUT") ? "tutorial" : (entry.type === "Practical" || entry.subject.includes("LAB") ? "lab" : "theory"),
                        needs_room_assignment: entry.needs_room_assignment ?? false
                    }));
                    setSlots(mappedSlots);

                    const overflow = mappedSlots.filter((s: any) => s.needs_room_assignment).length;
                    setOverflowCount(overflow);
                    setOverflowBannerDismissed(false);

                    const uniqueTargets = Array.from(new Set(mappedSlots.flatMap((s: any) => s.targets)));
                    const filters = ["All Divisions", ...uniqueTargets as string[]];
                    setAvailableFilters(filters);
                    
                    // Sync to Browser Cache
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        slots: mappedSlots,
                        filters: filters,
                        lunch: instData?.lunch_slot || lunchSlot
                    }));
                }
            } catch (err) {
                console.warn("No timetable to display:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLatestTimetable();
    }, []);

    const exportToCSV = () => {
        if (!slots || slots.length === 0) { toast.warning("Nothing to export", { description: "Generate a timetable first." }); return; }

        const headers = ["Day", "Time", "Subject", "Faculty", "Room", "Type", "Divisions/Batches"];
        const rows = slots.map(slot => [
            slot.day,
            mapMilitaryTo12Hour(slot.time).replace(":", ""), // Simple string to avoid excel issues
            `"${slot.subject}"`,
            `"${slot.faculty}"`,
            slot.room,
            slot.type,
            `"${slot.targets.join(", ")}"`
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Master_Timetable_${new Date().getTime()}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToExcel = () => {
        if (!slots || slots.length === 0) { toast.warning("Nothing to export", { description: "Generate a timetable first." }); return; }

        const gridRows: any[][] = [];

        // Header Row
        const headers = ["Day / Time", ...TIMES.map(t => mapMilitaryTo12Hour(t))];
        gridRows.push(headers);

        // Body Rows
        DAYS.forEach(day => {
            const row: string[] = [day];
            TIMES.forEach(time => {
                if (time === lunchSlot) {
                    row.push("Lunch Break");
                } else {
                    const activeSlots = slots.filter(s => s.day === day && s.time === time && (activeFilter === "All Divisions" || s.targets.includes(activeFilter)));
                    if (activeSlots.length === 0) {
                        row.push("");
                    } else {
                        const cellText = activeSlots.map(s => `[${s.type.toUpperCase()}] ${s.subject}\nFaculty: ${s.faculty}\nRoom: ${s.room}\nDivs: ${s.targets.join(", ")}`).join("\n\n---\n\n");
                        row.push(cellText);
                    }
                }
            });
            gridRows.push(row);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(gridRows);

        // Auto-size columns slightly
        const wscols = [{ wch: 15 }, ...TIMES.map(() => ({ wch: 30 }))];
        worksheet["!cols"] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Master Timetable");
        XLSX.writeFile(workbook, `Master_Timetable_Grid_${new Date().getTime()}.xlsx`);
    };

    const exportToICS = () => {
        if (!slots || slots.length === 0) { toast.warning("Nothing to export", { description: "Generate a timetable first." }); return; }

        // Define a base fake Monday for the generator to anchor dates to.
        const dayMap: Record<string, string> = { "Mon": "20240304", "Tue": "20240305", "Wed": "20240306", "Thu": "20240307", "Fri": "20240308" };

        let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ShiftSync//Timetable Generator//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n`;

        slots.forEach((slot, index) => {
            const dateStr = dayMap[slot.day];
            if (!dateStr) return;

            const startTime = `${slot.time.toString().padStart(2, '0')}0000`;
            const endTime = `${(slot.time + 1).toString().padStart(2, '0')}0000`;
            const uid = `shiftsync_${new Date().getTime()}_${index}@shiftsync.local`;

            icsContent += `BEGIN:VEVENT\n`;
            icsContent += `DTSTART;TZID=Asia/Kolkata:${dateStr}T${startTime}\n`;
            icsContent += `DTEND;TZID=Asia/Kolkata:${dateStr}T${endTime}\n`;
            icsContent += `SUMMARY:[${slot.type.toUpperCase()}] ${slot.subject}\n`;
            icsContent += `LOCATION:${slot.room}\n`;
            icsContent += `DESCRIPTION:Faculty: ${slot.faculty}\\nBatches: ${slot.targets.join(", ")}\n`;
            icsContent += `UID:${uid}\n`;
            icsContent += `STATUS:CONFIRMED\n`;
            icsContent += `END:VEVENT\n`;
        });

        icsContent += `END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute("download", `ShiftSync_Calendar_${new Date().getTime()}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        window.print();
    };

    const pushToGoogleCalendar = async () => {
        if (!slots || slots.length === 0) { toast.warning("Nothing to push", { description: "Generate a timetable first." }); return; }
        toast.loading("Pushing to Google Calendar...");
        try {
            const res = await fetch("/api/calendar/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Push failed");
            toast.success("Calendar synced", { description: `${data.message}${data.failed > 0 ? ` (${data.failed} events failed)` : ""}` });
        } catch (err: any) {
            toast.error("Calendar push failed", { description: err.message });
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            gridRef.current?.requestFullscreen().catch(err => {
                toast.error("Fullscreen failed", { description: err.message });
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col pt-2 animate-in fade-in duration-500 print:h-auto print:space-y-2">
            <style>{`
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Master Timetable</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">View and resolve remaining conflicts across all divisions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <select
                            className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 appearance-none h-9"
                            value={activeFilter}
                            onChange={(e) => setActiveFilter(e.target.value)}
                        >
                            {availableFilters.map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9">
                                <Download className="w-4 h-4 mr-2" />
                                Export Options
                                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Data Formats</DropdownMenuLabel>
                            <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
                                <FileText className="w-4 h-4 mr-2 text-slate-500" />
                                CSV Flat Data
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-950/50">
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Excel 2D Grid
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs">Integration</DropdownMenuLabel>
                            <DropdownMenuItem onClick={exportToICS} className="cursor-pointer text-teal-600 focus:text-teal-600 focus:bg-teal-50 dark:focus:bg-teal-950/50">
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                Export to iCal (.ics)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={pushToGoogleCalendar} className="cursor-pointer text-purple-600 focus:text-purple-600 focus:bg-purple-50 dark:focus:bg-purple-950/50">
                                <Send className="w-4 h-4 mr-2" />
                                Push to Google Calendar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs">Printable</DropdownMenuLabel>
                            <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer text-orange-600 focus:text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-950/50">
                                <Printer className="w-4 h-4 mr-2" />
                                Save as PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {!hideFullscreen && (
                        <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 md:flex hidden" onClick={toggleFullscreen}>
                            {isFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
                            {isFullscreen ? "Exit Fullscreen" : "Fullscreen Focus"}
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Overflow Banner ────────────────────────────────────────────── */}
            {overflowCount > 0 && !overflowBannerDismissed && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm print:hidden animate-in slide-in-from-top-2 duration-300">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                    <div className="flex-1">
                        <span className="font-semibold">{overflowCount} class slot{overflowCount !== 1 ? 's' : ''} assigned to overflow</span>
                        <span className="font-normal ml-1 text-amber-700 dark:text-amber-300">— no matching room was found for these workloads. They are marked <span className="font-semibold">⚠ Room TBD</span> in the grid. Assign a room manually or add a matching room in Data Manager and regenerate.</span>
                    </div>
                    <button
                        onClick={() => setOverflowBannerDismissed(true)}
                        className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors shrink-0"
                        title="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Grid Container */}
            <div ref={gridRef} className={`flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm relative print:overflow-visible print:border-none print:shadow-none print:w-full ${isFullscreen ? 'p-6 rounded-none border-none' : ''}`}>
                {isLoading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-sm text-slate-500 font-medium">Loading Master Timetable...</p>
                    </div>
                ) : slots.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
                            <CalendarDays className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">No Timetable Generated</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">You haven't generated a timetable yet. Go to the Overview dashboard and click "Generate Smart Timetable" to populate this view.</p>
                        </div>
                    </div>
                ) : (
                    <div className="min-w-[1000px] h-full inline-block print:min-w-0 print:w-full">
                        {/* Header Row (Times) */}
                        <div className="flex sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="w-24 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 sticky left-0 z-30 flex items-center justify-center font-medium text-xs text-slate-500">
                                Day / Time
                            </div>
                            {TIMES.map((time) => (
                                <div key={time} className="flex-1 min-w-[140px] border-r border-slate-200 dark:border-slate-800 p-3 text-center font-semibold text-xs text-slate-700 dark:text-slate-300">
                                    {mapMilitaryTo12Hour(time)}
                                </div>
                            ))}
                        </div>

                        {/* Body Rows (Days) */}
                        <div className="flex flex-col">
                            {DAYS.map((day) => (
                                <div key={day} className="flex border-b border-slate-100 dark:border-slate-800/50 group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                    {/* Fixed Left Column (Day Name) */}
                                    <div className="w-24 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sticky left-0 z-10 flex items-center justify-center font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:bg-slate-50 dark:group-hover:bg-slate-900/80 transition-colors shadow-[1px_0_5px_rgba(0,0,0,0.02)]">
                                        <span className="-rotate-90 md:rotate-0 tracking-widest md:tracking-normal uppercase md:capitalize text-xs md:text-sm">
                                            {day}
                                        </span>
                                    </div>

                                    {/* Slots Wrapper */}
                                    <div className="flex flex-1 relative">
                                        {TIMES.map((time) => {
                                            const activeSlots = slots.filter(s => s.day === day && s.time === time && (activeFilter === "All Divisions" || s.targets.includes(activeFilter)));
                                            // Handle both static global lunch integers and new dynamic Maps
                                            const isLunch = typeof lunchSlot === 'object' && lunchSlot !== null 
                                                ? lunchSlot[day] === time 
                                                : time === lunchSlot;

                                            if (isLunch) {
                                                return (
                                                    <div key={time} className="flex-1 min-w-[140px] border-r border-slate-100 dark:border-slate-800/50 p-2 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs font-medium italic">
                                                        <span>Lunch Break</span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={time} className="flex-1 min-w-[140px] border-r border-slate-100 dark:border-slate-800/50 p-1.5 relative group/slot max-h-[140px]">
                                                    {activeSlots.length > 0 ? (
                                                        <div className="h-full w-full flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1">
                                                            {activeSlots.map((slot, i) => {
                                                                const isPinned = pinnedClasses.includes(`${slot.workload_id}|${slot.room}|${slot.day}|${slot.time}`);
                                                                
                                                                // String formatting: "DS2012_ML_Lab" -> Code: "DS2012", Name: "ML Lab"
                                                                const subjectParts = slot.subject.split('_');
                                                                const subjectCode = subjectParts.length > 1 ? subjectParts[0] : "";
                                                                const subjectName = subjectParts.length > 1 ? subjectParts.slice(1).join(' ') : slot.subject;

                                                                return (
                                                                    <div key={i} className={`shrink-0 rounded-md p-2 flex flex-col justify-between border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md relative group/card ${
                                                                        slot.needs_room_assignment
                                                                            ? (isPinned ? 'bg-amber-100/80 dark:bg-amber-500/30 border-amber-400' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40')
                                                                            : slot.type === 'tutorial'
                                                                                ? (isPinned ? 'bg-purple-100/80 dark:bg-purple-500/30 border-purple-400' : 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 hover:border-purple-300 dark:hover:border-purple-500/40')
                                                                                : slot.type === 'lab'
                                                                                    ? (isPinned ? 'bg-teal-100/80 dark:bg-teal-500/30 border-teal-400' : 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20 hover:border-teal-300 dark:hover:border-teal-500/40')
                                                                                    : (isPinned ? 'bg-blue-100/80 dark:bg-blue-500/30 border-blue-400' : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 hover:border-blue-300 dark:hover:border-blue-500/40')
                                                                        }`}>

                                                                        <div
                                                                            className={`absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover/card:opacity-100 transition-opacity z-10 ${isPinned ? 'opacity-100 bg-white shadow-sm dark:bg-slate-800' : 'bg-white/80 dark:bg-slate-800/80'}`}
                                                                            onClick={(e) => { e.stopPropagation(); togglePin(slot); }}
                                                                            title={isPinned ? "Unpin class assignment" : "Pin this slot to prevent shuffling"}
                                                                        >
                                                                            {isPinned ? <Lock className="w-3 h-3 text-red-500" /> : <Unlock className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />}
                                                                        </div>

                                                                        <div>
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 border-none truncate max-w-[55px] ${slot.type === 'tutorial' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300' : slot.type === 'lab' ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'}`}>
                                                                                    {slot.targets.join(", ")}
                                                                                </Badge>
                                                                                 <span className={`text-[10px] font-medium truncate ${
                                                                        slot.needs_room_assignment
                                                                            ? 'text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5'
                                                                            : isPinned ? 'text-slate-800 dark:text-slate-200 flex-1 text-right mr-5' : 'text-slate-500 dark:text-slate-400'
                                                                    }`}>
                                                                        {slot.needs_room_assignment ? (
                                                                            <><AlertTriangle className="w-3 h-3 inline mr-0.5" />Room TBD</>
                                                                        ) : slot.room}
                                                                    </span>
                                                                            </div>
                                                                            {subjectCode && (
                                                                                <p className={`text-[10px] tracking-wider uppercase opacity-80 mb-0.5 font-semibold ${slot.type === 'tutorial' ? 'text-purple-800 dark:text-purple-300' : slot.type === 'lab' ? 'text-teal-800 dark:text-teal-300' : 'text-blue-800 dark:text-blue-300'}`}>
                                                                                    {subjectCode}
                                                                                </p>
                                                                            )}
                                                                            <p className={`text-xs font-bold leading-tight ${slot.type === 'tutorial' ? 'text-purple-950 dark:text-purple-100' : slot.type === 'lab' ? 'text-teal-950 dark:text-teal-100' : 'text-blue-950 dark:text-blue-100'}`}>
                                                                                {subjectName}
                                                                            </p>
                                                                        </div>
                                                                        <div className="mt-2 flex items-center gap-1">
                                                                            <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex justify-center items-center overflow-hidden shrink-0">
                                                                                <span className="text-[8px]">{slot.faculty?.charAt(0)}</span>
                                                                            </div>
                                                                            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate">
                                                                                {slot.faculty}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full w-full rounded-md border border-dashed border-slate-200 dark:border-slate-800 opacity-0 group-hover/slot:opacity-100 transition-opacity flex items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <Plus className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}

export default function MasterTimetablePage() {
    return (
        <Suspense fallback={
            <div className="h-[60vh] flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 opacity-50 text-blue-600" />
                Initializing Matrix Renderer...
            </div>
        }>
            <MasterTimetableView />
        </Suspense>
    );
}
