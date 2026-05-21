"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Upload, AlertCircle, CheckCircle2, FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

const TEMPLATES = {
    rooms: "room_id,type,capacity,tags\nD201,theory,80,Projector,Linux_Lab\nD202,lab,30,Mac_Lab",
    faculty: "faculty_id,max_load_hrs,max_continuous_hrs,shift_start,shift_end,class_teacher_for\nF001,16,3,8,16,SY-CSDS-A\nF002,12,2,10,18,",
    workloads: "faculty_id,subject_code,event_type,target_groups,weekly_hours,consecutive_hours,is_online,required_room_tags\nF001,DS2001_ML,Theory,SY-CSDS-A;B1,3,1,false,Projector\nF001,DS2001_ML_LAB,Practical,B1,2,2,false,Mac_Lab"
};

const REQUIRED_HEADERS = {
    rooms: ["room_id", "type", "capacity", "tags"],
    faculty: ["faculty_id", "max_load_hrs", "max_continuous_hrs", "shift_start", "shift_end", "class_teacher_for"],
    workloads: ["faculty_id", "subject_code", "event_type", "target_groups", "weekly_hours", "consecutive_hours", "is_online", "required_room_tags"]
};

export default function CsvUploadManager({ onSuccess }: { onSuccess?: () => void }) {
    const [uploadType, setUploadType] = useState<"rooms" | "faculty" | "workloads">("rooms");
    const [isParsing, setIsParsing] = useState(false);
    const [statusText, setStatusText] = useState("");
    const supabase = createClient();

    const handleDownloadTemplate = () => {
        const blob = new Blob([TEMPLATES[uploadType]], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${uploadType}_template.csv`;
        a.click();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setStatusText("Parsing CSV...");

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const headers = results.meta.fields || [];
                    const required = REQUIRED_HEADERS[uploadType];
                    const missing = required.filter(h => !headers.includes(h));

                    if (missing.length > 0) {
                        throw new Error(`CSV is missing required headers: ${missing.join(", ")}. Please use the exact template format.`);
                    }

                    setStatusText(`Found ${results.data.length} valid rows. Preparing database insertion...`);
                    await processData(results.data as any[]);

                } catch (err: any) {
                    alert(err.message || "Failed to process CSV.");
                    setStatusText("Upload failed.");
                } finally {
                    setIsParsing(false);
                    // Reset input
                    e.target.value = "";
                }
            },
            error: (err) => {
                alert("CSV Parsing Error: " + err.message);
                setIsParsing(false);
            }
        });
    };

    const processData = async (data: any[]) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
        if (!profile?.institution_id) throw new Error("Please complete the Global Settings form first to initialize your institution block.");

        const instId = profile.institution_id;

        if (uploadType === "rooms") {
            const payloads = data.map(row => ({
                institution_id: instId,
                name: row.room_id,
                type: (row.type || "theory").toLowerCase(),
                capacity: parseInt(row.capacity) || 30,
                tags: row.tags ? row.tags.split(";").map((t: string) => t.trim()) : []
            }));

            const { error } = await supabase.from("rooms").insert(payloads);
            if (error) throw error;
        }

        if (uploadType === "faculty") {
            const payloads = data.map(row => {
                const shiftStart = parseInt(row.shift_start) || 8;
                const shiftEnd = parseInt(row.shift_end) || 16;
                const shiftArray = [];
                for (let i = shiftStart; i <= shiftEnd; i++) shiftArray.push(i);

                return {
                    profile_id: user.id,
                    max_load_hrs: parseInt(row.max_load_hrs) || 16,
                    max_continuous_hrs: parseInt(row.max_continuous_hrs) || 3, // Default to safely burnout value
                    shift_hours: shiftArray,
                    class_teacher_for: row.class_teacher_for || null,
                    blocked_slots: [{ _csv_id: row.faculty_id }] // Inject mapping ID safely
                };
            });

            const { error } = await supabase.from("faculty_settings").insert(payloads);
            if (error) throw error;
        }

        if (uploadType === "workloads") {
            // Must fetch Faculty Maps first
            const { data: fData } = await supabase.from("faculty_settings").select("id, blocked_slots").eq("profile_id", user.id);
            if (!fData || fData.length === 0) throw new Error("No Faculty found! You must upload the Faculty CSV before Workloads.");

            const facultyMap: Record<string, string> = {};
            fData.forEach((f) => {
                if (f.blocked_slots && f.blocked_slots.length > 0 && f.blocked_slots[0]._csv_id) {
                    facultyMap[f.blocked_slots[0]._csv_id] = f.id;
                }
            });

            const payloads = data.map(row => {
                const fId = facultyMap[row.faculty_id];
                const subj = String(row.subject_code || "").toLowerCase();
                const autoOnline = subj.includes("dt") || subj.includes("course era") || subj.includes("course_era") || subj.includes("courseera") || subj.includes("mdm-dv");

                return {
                    faculty_id: fId,
                    subject_code: row.subject_code,
                    type: row.event_type || "Theory",
                    target_groups: row.target_groups ? row.target_groups.split(";").map((t: string) => t.trim()) : [],
                    weekly_hours: parseInt(row.weekly_hours) || 1,
                    consecutive_hours: parseInt(row.consecutive_hours) || 1,
                    is_online: String(row.is_online).toLowerCase() === 'true' || autoOnline,
                    required_tags: row.required_room_tags ? row.required_room_tags.split(";").map((t: string) => t.trim()) : []
                };
            });

            const { error } = await supabase.from("workloads").insert(payloads);
            if (error) throw error;
        }

        alert(`Successfully injected ${data.length} ${uploadType} records into the Database!`);
        setStatusText("Ready");
        if (onSuccess) onSuccess();
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 p-8 rounded-xl bg-white dark:bg-slate-950 shadow-sm">
            <div className="text-center space-y-2">
                <FileText className="w-10 h-10 mx-auto text-blue-600 dark:text-blue-500" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Bulk CSV Upload Engine</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Upload massive datasets from Excel or Google Sheets. The AI constraint builder requires absolute format strictness, so please use the exact template headers.
                </p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-4 rounded-lg flex gap-3 text-sm text-orange-800 dark:text-orange-200">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                    <strong>Data Sequencing Rule:</strong> You MUST upload your data in the correct relational order. <br />
                    1. Global Settings (Web Form) <br />
                    2. Rooms & Faculty (CSV) <br />
                    3. Workloads (CSV) - <span className="text-orange-900 dark:text-orange-300 font-semibold text-xs">Since Workloads belong to specific teachers, Faculty must exist first.</span><br />
                    *Note: Arrays like target_groups should be separated by semicolons (;) in the CSV.*
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-base">1. Select Data Type</Label>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                        {(["rooms", "faculty", "workloads"] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setUploadType(type)}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${uploadType === type ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-base text-transparent select-none border-b-0 hidden sm:block">Action</Label>
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2 mt-6" onClick={handleDownloadTemplate}>
                        <Download className="w-4 h-4" /> Download Template
                    </Button>
                </div>
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center transition-colors hover:border-blue-500 dark:hover:border-blue-400">
                <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    id="csv-upload"
                    onChange={handleFileUpload}
                    disabled={isParsing}
                />
                <label htmlFor="csv-upload" className={`cursor-pointer flex flex-col items-center gap-3 ${isParsing ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Click to browse</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">or drag {"'n'"} drop .csv file</span>
                    </div>
                    {isParsing && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> {statusText}
                        </div>
                    )}
                </label>
            </div>

            {statusText && !isParsing && statusText !== "Upload failed." && (
                <div className="flex items-center gap-2 justify-center text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-md">
                    <CheckCircle2 className="w-4 h-4" />
                    Waiting for next instruction.
                </div>
            )}
        </div>
    );
}
