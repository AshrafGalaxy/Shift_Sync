"use client";


import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Filter, Download, Plus, Maximize2, Minimize2, Loader2, CalendarDays, FileSpreadsheet, Calendar as CalendarIcon, Printer, ChevronDown, Lock, Unlock, Send, AlertTriangle, X, Users, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    const [facultyFilter, setFacultyFilter] = useState("All Faculty");
    const [searchQuery, setSearchQuery] = useState("");
    const [availableFilters, setAvailableFilters] = useState<string[]>(["All Divisions"]);
    const [availableFaculty, setAvailableFaculty] = useState<string[]>(["All Faculty"]);
    const [slots, setSlots] = useState<any[]>([]);
    const [days, setDays] = useState<string[]>(DAYS);
    const [times, setTimes] = useState<number[]>(TIMES);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [pinnedClasses, setPinnedClasses] = useState<string[]>([]);
    const [instId, setInstId] = useState<string | null>(null);
    const [lunchSlot, setLunchSlot] = useState<any>(13);
    const [overflowCount, setOverflowCount] = useState<number>(0);
    const [overflowBannerDismissed, setOverflowBannerDismissed] = useState(false);
    const [showRoomUtil, setShowRoomUtil] = useState(false);
    const [substitutions, setSubstitutions] = useState<Record<string, { substitute_faculty_name: string; id: string }>>({});
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

                const { data: instData } = await supabase
                    .from("institutions")
                    .select("lunch_slot, days_active, time_slots")
                    .eq("id", profile.institution_id)
                    .single();

                if (instData?.lunch_slot) setLunchSlot(instData.lunch_slot);
                if (instData?.days_active && instData.days_active.length > 0) setDays(instData.days_active);
                if (instData?.time_slots && instData.time_slots.length > 0) setTimes(instData.time_slots);

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
                        if (parsedCache.days) setDays(parsedCache.days);
                        if (parsedCache.times) setTimes(parsedCache.times);
                        setIsLoading(false);
                        return;
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
                    if (error.code !== "PGRST116") console.error("Timetable Fetch Error:", error);
                }

                if (latestTimetable && latestTimetable.matrix_data && latestTimetable.matrix_data.schedule) {
                    const schedule = latestTimetable.matrix_data.schedule ?? [];
                    const mappedSlots = schedule.map((entry: any) => ({
                        workload_id: entry.workload_id,
                        day: entry.day,
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

                    const uniqueFaculty = Array.from(new Set(mappedSlots.map((s: any) => s.faculty).filter(Boolean))) as string[];
                    setAvailableFaculty(["All Faculty", ...uniqueFaculty]);

                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        slots: mappedSlots,
                        filters: filters,
                        lunch: instData?.lunch_slot || lunchSlot,
                        days: instData?.days_active || days,
                        times: instData?.time_slots || times,
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

    // Fetch active substitutions and index by "day|time_slot|subject_code"
    useEffect(() => {
        if (!instId) return;
        (async () => {
            const { data } = await supabase
                .from("substitutions")
                .select("id, day, time_slot, subject_code, substitute_faculty_name")
                .eq("institution_id", instId)
                .eq("status", "active");
            if (!data) return;
            const map: Record<string, { substitute_faculty_name: string; id: string }> = {};
            data.forEach((s: any) => {
                map[`${s.day}|${s.time_slot}|${s.subject_code}`] = { substitute_faculty_name: s.substitute_faculty_name, id: s.id };
            });
            setSubstitutions(map);
        })();
    }, [instId]);

    const isLunchTime = (day: string, time: number): boolean => {
        if (typeof lunchSlot === 'object' && lunchSlot !== null && !Array.isArray(lunchSlot)) {
            return lunchSlot[day] === time;
        }
        return time === lunchSlot;
    };

    // â”€â”€ Export: Pixel-perfect Excel matching timetable card layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const exportToExcel = () => {
        if (!slots || slots.length === 0) {
            toast.warning("Nothing to export", { description: "Generate a timetable first." });
            return;
        }

        const activeDays = days;
        const activeTimes = times;
        const wb = XLSX.utils.book_new();
        const ws: any = {};
        const merges: any[] = [];

        // â”€â”€ Column widths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        ws["!cols"] = [
            { wch: 10 },                           // Day column
            ...activeTimes.map(() => ({ wch: 30 })) // Time columns
        ];

        // â”€â”€ Helper: format one slot card into multi-line cell text â”€â”€â”€â”€â”€â”€â”€â”€
        const formatCard = (s: any): string => {
            const parts = s.subject.split('_');
            const code = parts.length > 1 ? parts[0] : "";
            const name = parts.length > 1 ? parts.slice(1).join(' ') : s.subject;
            const typeLabel = s.type === 'tutorial' ? 'TUT' : s.type === 'lab' ? 'LAB' : 'LEC';
            const lines = [
                code ? `[${typeLabel}] ${code}` : `[${typeLabel}]`,
                name,
                `\u{1F464} ${s.faculty}`,
                s.needs_room_assignment ? `\u{1F4CD} Room: TBD \u26A0` : `\u{1F4CD} ${s.room}`,
                `\u{1F3AB} ${s.targets.join(', ')}`
            ];
            return lines.join('\n');
        };

        // â”€â”€ Header row (row 0) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const encodeCell = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

        ws[encodeCell(0, 0)] = { v: "Day \\ Time", t: "s" };
        activeTimes.forEach((time, ci) => {
            ws[encodeCell(0, ci + 1)] = { v: mapMilitaryTo12Hour(time), t: "s" };
        });

        let rowIdx = 1; // current Excel row

        // â”€â”€ Body: one day block per active day â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        activeDays.forEach(day => {
            // Find max number of classes in any single time slot for this day
            const slotCounts = activeTimes.map(time => {
                if (isLunchTime(day, time)) return 1;
                return slots.filter(s =>
                    s.day === day &&
                    s.time === time &&
                    (activeFilter === "All Divisions" || s.targets.includes(activeFilter))
                ).length || 1;
            });
            const maxRows = Math.max(...slotCounts, 1);

            // Day label cell spans all sub-rows for this day
            ws[encodeCell(rowIdx, 0)] = { v: day, t: "s" };
            if (maxRows > 1) {
                merges.push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx + maxRows - 1, c: 0 } });
            }

            // Allocate maxRows rows for each time column
            activeTimes.forEach((time, ci) => {
                const colIdx = ci + 1;

                if (isLunchTime(day, time)) {
                    ws[encodeCell(rowIdx, colIdx)] = { v: "Lunch Break", t: "s" };
                    // Span remaining sub-rows if any
                    if (maxRows > 1) {
                        merges.push({ s: { r: rowIdx, c: colIdx }, e: { r: rowIdx + maxRows - 1, c: colIdx } });
                    }
                    return;
                }

                const activeSlots = slots.filter(s =>
                    s.day === day &&
                    s.time === time &&
                    (activeFilter === "All Divisions" || s.targets.includes(activeFilter))
                );

                if (activeSlots.length === 0) {
                    ws[encodeCell(rowIdx, colIdx)] = { v: "", t: "s" };
                    if (maxRows > 1) {
                        merges.push({ s: { r: rowIdx, c: colIdx }, e: { r: rowIdx + maxRows - 1, c: colIdx } });
                    }
                } else if (activeSlots.length === 1) {
                    ws[encodeCell(rowIdx, colIdx)] = { v: formatCard(activeSlots[0]), t: "s" };
                    if (maxRows > 1) {
                        merges.push({ s: { r: rowIdx, c: colIdx }, e: { r: rowIdx + maxRows - 1, c: colIdx } });
                    }
                } else {
                    // Multiple classes: each in its own sub-row
                    activeSlots.forEach((slot, si) => {
                        const cellRow = rowIdx + si;
                        ws[encodeCell(cellRow, colIdx)] = { v: formatCard(slot), t: "s" };
                    });
                    // If fewer slots than maxRows, fill remaining rows with empty
                    for (let si = activeSlots.length; si < maxRows; si++) {
                        ws[encodeCell(rowIdx + si, colIdx)] = { v: "", t: "s" };
                    }
                }
            });

            // Set row heights for all sub-rows in this day
            if (!ws["!rows"]) ws["!rows"] = [];
            for (let ri = rowIdx; ri < rowIdx + maxRows; ri++) {
                ws["!rows"][ri] = { hpt: 80 }; // ~80pt per sub-row
            }

            rowIdx += maxRows;
        });

        // Header row height
        if (!ws["!rows"]) ws["!rows"] = [];
        ws["!rows"][0] = { hpt: 26 };

        // Apply merges
        ws["!merges"] = merges;

        // Sheet bounds
        ws["!ref"] = XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: rowIdx - 1, c: activeTimes.length }
        });

        const sheetName = activeFilter === "All Divisions" ? "Master Timetable" : `Timetable - ${activeFilter}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
        XLSX.writeFile(wb, `ShiftSync_Timetable_${activeFilter === "All Divisions" ? "All" : activeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Excel exported", { description: `Saved as ShiftSync_Timetable_${activeFilter === "All Divisions" ? "All" : activeFilter}_[date].xlsx` });
    };

    const exportToICS = () => {
        if (!slots || slots.length === 0) { toast.warning("Nothing to export", { description: "Generate a timetable first." }); return; }

        const dayMap: Record<string, string> = { "Mon": "20240304", "Tue": "20240305", "Wed": "20240306", "Thu": "20240307", "Fri": "20240308", "Sat": "20240309", "Sun": "20240310" };

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

    // Slot card renderer — reused for both grid and print
    const SlotCard = ({ slot }: { slot: any }) => {
        const isPinned = pinnedClasses.includes(`${slot.workload_id}|${slot.room}|${slot.day}|${slot.time}`);
        const subjectParts = slot.subject.split('_');
        const subjectCode = subjectParts.length > 1 ? subjectParts[0] : "";
        const subjectName = subjectParts.length > 1 ? subjectParts.slice(1).join(' ') : slot.subject;

        const colorScheme =
            slot.needs_room_assignment
                ? { card: isPinned ? 'bg-amber-100/80 dark:bg-amber-500/30 border-amber-400' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 hover:border-amber-400', badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300', code: 'text-amber-800 dark:text-amber-300', title: 'text-amber-950 dark:text-amber-100' }
                : slot.type === 'tutorial'
                    ? { card: isPinned ? 'bg-purple-100/80 dark:bg-purple-500/30 border-purple-400' : 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 hover:border-purple-400', badge: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300', code: 'text-purple-800 dark:text-purple-300', title: 'text-purple-950 dark:text-purple-100' }
                    : slot.type === 'lab'
                        ? { card: isPinned ? 'bg-teal-100/80 dark:bg-teal-500/30 border-teal-400' : 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20 hover:border-teal-400', badge: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300', code: 'text-teal-800 dark:text-teal-300', title: 'text-teal-950 dark:text-teal-100' }
                        : { card: isPinned ? 'bg-blue-100/80 dark:bg-blue-500/30 border-blue-400' : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 hover:border-blue-400', badge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300', code: 'text-blue-800 dark:text-blue-300', title: 'text-blue-950 dark:text-blue-100' };

        return (
            <div className={`w-full rounded-lg p-2 flex flex-col justify-between border transition-all hover:-translate-y-0.5 hover:shadow-md relative group/card ${colorScheme.card}`}>
                {/* Pin button */}
                <div
                    className={`absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover/card:opacity-100 transition-opacity z-10 ${isPinned ? 'opacity-100 bg-white shadow-sm dark:bg-slate-800' : 'bg-white/80 dark:bg-slate-800/80'}`}
                    onClick={(e) => { e.stopPropagation(); togglePin(slot); }}
                    title={isPinned ? "Unpin class assignment" : "Pin this slot to prevent shuffling"}
                >
                    {isPinned ? <Lock className="w-3 h-3 text-red-500" /> : <Unlock className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />}
                </div>

                {/* Top row: division badge + room */}
                <div className="flex justify-between items-start mb-1 pr-4">
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 border-none truncate max-w-[60%] shrink-0 ${colorScheme.badge}`}>
                        {slot.targets.join(", ")}
                    </Badge>
                    <span className={`text-[10px] font-medium truncate ml-1 ${slot.needs_room_assignment ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                        {slot.needs_room_assignment ? (
                            <><AlertTriangle className="w-3 h-3 inline mr-0.5" />TBD</>
                        ) : slot.room}
                    </span>
                </div>

                {/* Subject code */}
                {subjectCode && (
                    <p className={`text-[10px] tracking-wider uppercase opacity-80 mb-0.5 font-semibold ${colorScheme.code}`}>
                        {subjectCode}
                    </p>
                )}

                {/* Subject name */}
                <p className={`text-xs font-bold leading-tight ${colorScheme.title}`}>
                    {subjectName}
                </p>

                {/* Faculty row — shows substitute if one exists */}
                {(() => {
                    const subKey = `${slot.day}|${slot.time}|${slot.subject.split(' ')[0]}`;
                    const sub = substitutions[subKey];
                    return (
                        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                            <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex justify-center items-center overflow-hidden shrink-0">
                                <span className="text-[8px]">{(sub ? sub.substitute_faculty_name : slot.faculty)?.charAt(0)}</span>
                            </div>
                            <p className={`text-[10px] font-medium truncate ${sub ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                {sub ? sub.substitute_faculty_name : slot.faculty}
                            </p>
                            {sub && <span className="text-[8px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1 rounded">SUB</span>}
                        </div>
                    );
                })()}
            </div>
        );
    };

    // Compute visible slot count based on all active filters
    const visibleSlots = slots.filter(s => {
        const matchDiv = activeFilter === "All Divisions" || s.targets.includes(activeFilter);
        const matchFac = facultyFilter === "All Faculty" || s.faculty === facultyFilter;
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || s.subject.toLowerCase().includes(q) || s.faculty?.toLowerCase().includes(q) || s.room?.toLowerCase().includes(q);
        return matchDiv && matchFac && matchSearch;
    });

    // Room utilization: count occupied (day, time) pairs per room
    const roomUtil = (() => {
        const nonLunchTimes = times.filter(t => {
            if (typeof lunchSlot === "object") return !Object.values(lunchSlot).includes(t);
            return t !== lunchSlot;
        });
        const totalSlots = days.length * nonLunchTimes.length;
        const roomMap: Record<string, number> = {};
        slots.forEach((s: any) => {
            if (s.room && s.room !== "TBD") {
                const key = `${s.room}|${s.day}|${s.time_slot}`;
                roomMap[s.room] = roomMap[s.room] || 0;
            }
        });
        // Unique (room, day, timeslot) pairs
        const uniqueMap: Record<string, Set<string>> = {};
        slots.forEach((s: any) => {
            if (!s.room || s.room === "TBD") return;
            if (!uniqueMap[s.room]) uniqueMap[s.room] = new Set();
            uniqueMap[s.room].add(`${s.day}|${s.time_slot}`);
        });
        return Object.entries(uniqueMap)
            .map(([room, set]) => ({ room, used: set.size, total: totalSlots, pct: Math.round((set.size / totalSlots) * 100) }))
            .sort((a, b) => b.pct - a.pct);
    })();

    return (
        <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col pt-2 animate-in fade-in duration-500 print:h-auto print:space-y-2">

            <style>{`
                @media print {
                    @page { size: landscape; margin: 8mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>

            {/* Header - Row 1: Title+chip | Search (full-width) | Export | Fullscreen */}
            <div className="shrink-0 print:hidden space-y-2">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Master Timetable</h1>
                        {slots.length > 0 && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${visibleSlots.length === slots.length ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'}`}>
                                {visibleSlots.length === slots.length ? `${slots.length} slots` : `${visibleSlots.length} / ${slots.length} slots`}
                            </span>
                        )}
                    </div>
                    {/* Search stretches full width */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                            placeholder="Search subject, faculty or room..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 w-full text-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    {/* Export */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 shrink-0">
                                <Download className="w-4 h-4 mr-2" />Export<ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs">Spreadsheet</DropdownMenuLabel>
                            <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer text-green-700 dark:text-green-400 focus:text-green-700 focus:bg-green-50 dark:focus:bg-green-950/50">
                                <FileSpreadsheet className="w-4 h-4 mr-2" />Download as Excel (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs">Calendar Integration</DropdownMenuLabel>
                            <DropdownMenuItem onClick={exportToICS} className="cursor-pointer text-teal-600 focus:text-teal-600 focus:bg-teal-50 dark:focus:bg-teal-950/50">
                                <CalendarIcon className="w-4 h-4 mr-2" />Export to iCal (.ics)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={pushToGoogleCalendar} className="cursor-pointer text-purple-600 focus:text-purple-600 focus:bg-purple-50 dark:focus:bg-purple-950/50">
                                <Send className="w-4 h-4 mr-2" />Push to Google Calendar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs">Printable</DropdownMenuLabel>
                            <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer text-orange-600 focus:text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-950/50">
                                <Printer className="w-4 h-4 mr-2" />Save as PDF / Print
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {/* Fullscreen */}
                    {!hideFullscreen && (
                        <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 md:flex hidden shrink-0" onClick={toggleFullscreen}>
                            {isFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
                            {isFullscreen ? "Exit" : "Fullscreen"}
                        </Button>
                    )}
                </div>
                {/* Row 2: Description | Division filter | Faculty filter */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {activeFilter === "All Divisions" ? "Viewing all divisions. Use the filter to isolate a single division's schedule." : `Filtered to: ${activeFilter} — each slot shows exactly one class.`}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                            <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                            <select className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 appearance-none h-9" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                                {availableFilters.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className="relative">
                            <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                            <select className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 appearance-none h-9" value={facultyFilter} onChange={(e) => setFacultyFilter(e.target.value)}>
                                {availableFaculty.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overflow Banner */}
            {overflowCount > 0 && !overflowBannerDismissed && (
                <div className="shrink-0 flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm print:hidden animate-in slide-in-from-top-2 duration-300">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                    <div className="flex-1">
                        <span className="font-semibold">{overflowCount} class slot{overflowCount !== 1 ? 's' : ''} have no matching room</span>
                        <span className="font-normal ml-1 text-amber-700 dark:text-amber-300">— marked <span className="font-semibold">âš  TBD</span> in the grid. Add a matching room in Data Manager and regenerate.</span>
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

            {/* Room Utilization Strip */}
            {roomUtil.length > 0 && slots.length > 0 && (
                <div className="shrink-0 print:hidden">
                    <button
                        onClick={() => setShowRoomUtil(v => !v)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1.5 mb-1.5 transition-colors"
                    >
                        <span className={`transition-transform ${showRoomUtil ? "rotate-90" : ""}`}>â–¶</span>
                        Room Utilization ({roomUtil.length} rooms)
                    </button>
                    {showRoomUtil && (
                        <div className="flex flex-wrap gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm animate-in fade-in duration-200">
                            {roomUtil.map(({ room, used, total, pct }) => (
                                <div key={room} className="flex flex-col gap-1 min-w-[90px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 truncate">{room}</span>
                                        <span className={`text-[10px] font-bold ml-1 ${pct >= 80 ? "text-red-500" : pct >= 50 ? "text-amber-500" : "text-emerald-500"}`}>{pct}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] text-slate-400">{used}/{total} slots</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Grid Container — min-h-0 prevents flex child from overflowing parent height */}
            <div
                ref={gridRef}
                className={`flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm relative print:overflow-visible print:border-none print:shadow-none print:w-full ${isFullscreen ? 'p-4 rounded-none border-none' : ''}`}
            >
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
                            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Go to the Overview dashboard and click "Generate Timetable" to populate this view.</p>
                        </div>
                    </div>
                ) : (
                    // â”€â”€ The actual timetable grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    <table className="w-full border-collapse table-fixed print:text-[8pt]">
                        <colgroup>
                            {/* Day column */}
                            <col style={{ width: "80px" }} />
                            {/* Time slot columns — equal width */}
                            {times.map(t => <col key={t} />)}
                        </colgroup>

                        {/* Header: times + occupancy % */}
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <th className="sticky left-0 z-30 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-2 text-center text-xs font-medium text-slate-500 print:static">
                                    Day / Time
                                </th>
                                {times.map(time => {
                                    const nonLunchDays = days.filter(d => !isLunchTime(d, time));
                                    const occupied = nonLunchDays.filter(d =>
                                        visibleSlots.some(s => s.day === d && s.time === time)
                                    ).length;
                                    const pct = nonLunchDays.length ? Math.round((occupied / nonLunchDays.length) * 100) : 0;
                                    const color = pct >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                        : pct >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
                                    return (
                                        <th key={time} className="border-r border-slate-200 dark:border-slate-800 p-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                            <div>{mapMilitaryTo12Hour(time)}</div>
                                            <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>{pct}%</span>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        {/* Body: one row per day */}
                        <tbody>
                            {days.map((day) => (
                                <tr key={day} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors group">
                                    {/* Day label */}
                                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-2 text-center font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:bg-slate-50 dark:group-hover:bg-slate-900/80 transition-colors shadow-[1px_0_4px_rgba(0,0,0,0.03)] print:static">
                                        {day}
                                    </td>

                                    {/* Slot cells */}
                                    {times.map(time => {
                                        if (isLunchTime(day, time)) {
                                            return (
                                                <td key={time} className="border-r border-slate-100 dark:border-slate-800/50 p-2 bg-slate-50 dark:bg-slate-900/40 text-center align-middle">
                                                    <span className="text-xs text-slate-400 dark:text-slate-600 font-medium italic">Lunch Break</span>
                                                </td>
                                            );
                                        }

                                        const activeSlots = slots.filter(s =>
                                            s.day === day &&
                                            s.time === time &&
                                            (activeFilter === "All Divisions" || s.targets.includes(activeFilter)) &&
                                            (facultyFilter === "All Faculty" || s.faculty === facultyFilter) &&
                                            (searchQuery === "" || s.subject.toLowerCase().includes(searchQuery.toLowerCase()) || (s.faculty ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
                                        );

                                        if (activeSlots.length === 0) {
                                            return (
                                                <td key={time} className="border-r border-slate-100 dark:border-slate-800/50 p-1.5 align-top group/slot">
                                                    <div className="h-full w-full rounded-md border border-dashed border-slate-200 dark:border-slate-800 opacity-0 group-hover/slot:opacity-100 transition-opacity flex items-center justify-center min-h-[80px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <Plus className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                </td>
                                            );
                                        }

                                        if (activeFilter === "All Divisions" && activeSlots.length > 1) {
                                            // Multi-class cell (All Divisions view):
                                            // Stack cards vertically, each full width — NO scroll, all visible
                                            return (
                                                <td key={time} className="border-r border-slate-100 dark:border-slate-800/50 p-1.5 align-top">
                                                    <div className="flex flex-col gap-1.5">
                                                        {activeSlots.map((slot, i) => (
                                                            <SlotCard key={i} slot={slot} />
                                                        ))}
                                                    </div>
                                                </td>
                                            );
                                        }

                                        // Single-class cell (filtered or single result)
                                        return (
                                            <td key={time} className="border-r border-slate-100 dark:border-slate-800/50 p-1.5 align-top">
                                                <SlotCard slot={activeSlots[0]} />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
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

