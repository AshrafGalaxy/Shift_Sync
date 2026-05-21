"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Map, Search, Loader2, ChevronDown, FileText, FileSpreadsheet, Printer, Maximize2, Minimize2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";

const TIMES = [8, 9, 10, 11, 12, 13, 14, 15, 16];

const mapMilitaryTo12Hour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h.toString().padStart(2, '0')}:00 ${period}`;
};

export default function ResourceHeatmapView() {
    const [searchTerm, setSearchTerm] = useState("");
    const [rooms, setRooms] = useState<any[]>([]);
    const [matrices, setMatrices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState("Mon");

    const supabase = createClient();

    useEffect(() => {
        const fetchHeatmapData = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Not logged in");

                const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
                if (!profile?.institution_id) throw new Error("No institution");

                // Fetch physical rooms
                const { data: dbRooms } = await supabase.from("rooms").select("*").eq("institution_id", profile.institution_id);
                setRooms(dbRooms || []);

                // Fetch live schedule
                const { data: latestTimetable } = await supabase
                    .from("generated_timetables")
                    .select("matrix_data")
                    .eq("institution_id", profile.institution_id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                if (latestTimetable?.matrix_data?.schedule) {
                    setMatrices(latestTimetable.matrix_data.schedule);
                }
            } catch (err) {
                console.warn("Heatmap fetch warning:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHeatmapData();
    }, []);

    const getStatus = (roomId: string, timeIndex: number) => {
        if (timeIndex === 13) return "lunch";

        // Find if any class is scheduled in this room at this specific time AND selected day
        // Backend uses `time_slot` (not `slot`) — match exactly
        const isOccupied = matrices.some(m => m.room === roomId && m.time_slot === timeIndex && m.day === selectedDay);
        return isOccupied ? "occupied" : "free";
    };

    const getSlotInfo = (roomId: string, timeIndex: number) => {
        return matrices.find(m => m.room === roomId && m.time_slot === timeIndex && m.day === selectedDay) ?? null;
    };

    const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Analytics Calculation for Legend
    const workingTimes = TIMES.filter(t => t !== 13);
    const totalSlots = filteredRooms.length * workingTimes.length;
    let occupiedCount = 0;

    if (totalSlots > 0) {
        filteredRooms.forEach(room => {
            workingTimes.forEach(time => {
                if (getStatus(room.name, time) === "occupied") occupiedCount++;
            });
        });
    }

    const occupiedPct = totalSlots > 0 ? Math.round((occupiedCount / totalSlots) * 100) : 0;
    const availablePct = totalSlots > 0 ? 100 - occupiedPct : 0;

    // Fullscreen and Export Handlers
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    };

    const exportToCSV = () => {
        if (filteredRooms.length === 0) return alert("No rooms to export.");

        const headers = ["Resource", ...TIMES.map(t => mapMilitaryTo12Hour(t))];
        const rows = filteredRooms.map(room => {
            const rowData = [room.name];
            TIMES.forEach(time => {
                if (time === 13) {
                    rowData.push("Lunch Break");
                } else {
                    const classInfo = matrices.find(m => m.room === room.name && m.time_slot === time && m.day === selectedDay);
                    if (classInfo) {
                        rowData.push(`Occupied (${classInfo.subject} by ${classInfo.faculty})`);
                    } else {
                        rowData.push("Available");
                    }
                }
            });
            return rowData;
        });

        const csvContent = [headers.join(","), ...rows.map(e => e.map(cell => `"${cell}"`).join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Resource_Heatmap_${selectedDay}_${new Date().getTime()}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToExcel = () => {
        if (filteredRooms.length === 0) return alert("No rooms to export.");
        const gridRows: any[][] = [];
        const headers = ["Resource", ...TIMES.map(t => mapMilitaryTo12Hour(t))];
        gridRows.push(headers);

        filteredRooms.forEach(room => {
            const row: string[] = [room.name];
            TIMES.forEach(time => {
                if (time === 13) {
                    row.push("Lunch Break");
                } else {
                    const classInfo = matrices.find(m => m.room === room.name && m.time_slot === time && m.day === selectedDay);
                    if (classInfo) {
                        row.push(`Occupied\n${classInfo.subject}\nFaculty: ${classInfo.faculty}`);
                    } else {
                        row.push("Available");
                    }
                }
            });
            gridRows.push(row);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(gridRows);
        const wscols = [{ wch: 15 }, ...TIMES.map(() => ({ wch: 25 }))];
        worksheet["!cols"] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Heatmap ${selectedDay}`);
        XLSX.writeFile(workbook, `Resource_Heatmap_${selectedDay}_${new Date().getTime()}.xlsx`);
    };

    const exportToPDF = () => {
        window.print();
    };

    return (
        <div ref={containerRef} className={`space-y-6 animate-in fade-in duration-500 ${isFullscreen ? 'p-6 bg-slate-50 dark:bg-slate-950 min-h-screen overflow-auto' : ''}`}>

            {/* Header & Controls */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Resource Heatmap</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Live view of room vacancies and occupancies.</p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search rooms..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9"
                            />
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
                                <DropdownMenuLabel className="text-xs">Printable</DropdownMenuLabel>
                                <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer text-orange-600 focus:text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-950/50">
                                    <Printer className="w-4 h-4 mr-2" />
                                    Save as PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 md:flex hidden" onClick={toggleFullscreen}>
                            {isFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
                            {isFullscreen ? "Exit Fullscreen" : "Fullscreen Focus"}
                        </Button>
                    </div>
                </div>

                {/* Day Selector — BUG-03 fix: selectedDay was state with no UI */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg w-fit">
                    {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                                selectedDay === day
                                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Left Stats/Legend Panel */}
                <div className="md:col-span-1 space-y-4">
                    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Status Legend</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                                    <span className="text-slate-700 dark:text-slate-300">Available</span>
                                </div>
                                <span className="font-semibold">{availablePct}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-slate-700 dark:text-slate-300">Occupied</span>
                                </div>
                                <span className="font-semibold">{occupiedPct}%</span>
                            </div>
                            <div className="flex items-center justify-between opacity-50">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-orange-400" />
                                    <span className="text-slate-700 dark:text-slate-300">Maintenance</span>
                                </div>
                                <span className="font-semibold">0%</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm bg-blue-50/50 dark:bg-blue-900/10">
                        <CardContent className="p-4 flex gap-4 items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                                <Map className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Campus Overview</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Currently tracking {rooms.length} physical resources across campus.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Heatmap Grid */}
                <div className="md:col-span-3">
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Resource</th>
                                        {TIMES.map(time => (
                                            <th key={time} className="px-2 py-3 font-medium text-slate-500 dark:text-slate-400 text-center w-24">
                                                {mapMilitaryTo12Hour(time)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={10} className="py-20 text-center text-slate-500">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50 text-blue-600" />
                                                Loading Live Infrastructure Matrix...
                                            </td>
                                        </tr>
                                    ) : filteredRooms.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-20 text-center text-slate-500">
                                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <Map className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">No Data Available</h3>
                                                <p className="text-sm mt-1">Please ensure you have generated a timetable or added physical rooms.</p>
                                            </td>
                                        </tr>
                                    ) : filteredRooms.map((room) => (
                                        <tr key={room.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900 dark:text-slate-100">{room.name}</div>
                                                <div className="text-xs text-slate-500">Cap: {room.capacity} • {room.type || "theory"}</div>
                                            </td>
                                            {TIMES.map((time) => {
                                                const status = getStatus(room.name, time);
                                                const slotInfo = status === "occupied" ? getSlotInfo(room.name, time) : null;
                                                return (
                                                    <td key={time} className="px-2 py-3 text-center">
                                                        {status === "lunch" ? (
                                                            <div className="w-full h-8 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-400 italic">
                                                                Break
                                                            </div>
                                                        ) : (
                                                            <div
                                                                title={slotInfo ? `${slotInfo.subject ?? ""} · ${slotInfo.faculty_name ?? slotInfo.faculty_id ?? "Faculty TBD"} · ${slotInfo.type ?? ""}` : undefined}
                                                                className={`w-full h-8 rounded border flex items-center justify-center transition-all cursor-pointer hover:ring-2 hover:ring-offset-1 dark:hover:ring-offset-slate-950 ${status === 'free'
                                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:ring-emerald-500'
                                                                : status === 'occupied'
                                                                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 hover:ring-blue-500'
                                                                    : 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 hover:ring-orange-500'
                                                            }`}>
                                                                <span className="text-[10px] font-semibold tracking-wider uppercase transition-opacity">
                                                                    {status === "occupied" && slotInfo?.subject
                                                                        ? slotInfo.subject.slice(0, 6)
                                                                        : status.slice(0, 4)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredRooms.length === 0 && !isLoading && (
                            <div className="p-8 text-center text-slate-500">
                                No rooms found matching &quot;{searchTerm}&quot;
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
