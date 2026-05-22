"use client";

import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Upload, Download, FileText, CheckCircle2, XCircle,
  AlertCircle, Loader2, Eye, RotateCcw, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

// ─── Column schema — matches backend parser & solver inputs exactly ────────────
type ColDef = {
  key: string;
  label: string;
  type: "string" | "integer" | "semisep" | "boolean" | "enum";
  required: boolean;
  hint: string;
  options?: string[];
};

const SCHEMA: Record<"rooms" | "faculty" | "workloads", ColDef[]> = {
  rooms: [
    { key: "room_id",  label: "room_id",  type: "string",  required: true,  hint: "e.g. D201" },
    { key: "type",     label: "type",     type: "enum",    required: true,  hint: "theory | lab", options: ["theory", "lab"] },
    { key: "capacity", label: "capacity", type: "integer", required: true,  hint: "e.g. 60" },
    { key: "tags",     label: "tags",     type: "semisep", required: false, hint: "Projector;Lab (use ; as separator)" },
  ],
  faculty: [
    { key: "faculty_id",        label: "faculty_id",        type: "string",  required: true,  hint: "e.g. F001" },
    { key: "name",              label: "name",              type: "string",  required: true,  hint: "Full name" },
    { key: "max_load_hrs",      label: "max_load_hrs",      type: "integer", required: true,  hint: "Max weekly hrs (e.g. 16)" },
    { key: "max_continuous_hrs",label: "max_continuous_hrs",type: "integer", required: false, hint: "Back-to-back limit (e.g. 3)" },
    { key: "shift_start",       label: "shift_start",       type: "integer", required: false, hint: "8 = 8:00 AM" },
    { key: "shift_end",         label: "shift_end",         type: "integer", required: false, hint: "17 = 5:00 PM" },
    { key: "class_teacher_for", label: "class_teacher_for", type: "string",  required: false, hint: "e.g. SY-B (optional)" },
  ],
  workloads: [
    { key: "faculty_id",        label: "faculty_id",        type: "string",  required: true,  hint: "Must match uploaded faculty_id" },
    { key: "subject_code",      label: "subject_code",      type: "string",  required: true,  hint: "e.g. DS2001" },
    { key: "event_type",        label: "event_type",        type: "enum",    required: false, hint: "Theory | Lab | Tutorial (Practical = Lab)", options: ["Theory", "Lab", "Tutorial", "Practical"] },
    { key: "target_groups",     label: "target_groups",     type: "semisep", required: false, hint: "SY B;SY B1 (use ; as separator)" },
    { key: "weekly_hours",      label: "weekly_hours",      type: "integer", required: true,  hint: "Total hrs/week (e.g. 3)" },
    { key: "consecutive_hours", label: "consecutive_hours", type: "integer", required: false, hint: "Must divide weekly_hours evenly" },
    { key: "is_online",         label: "is_online",         type: "boolean", required: false, hint: "true or false" },
    { key: "required_room_tags",label: "required_room_tags",type: "semisep", required: false, hint: "Linux_Lab;Projector (use ;)" },
  ],
};

// ─── 3 sample rows per type ────────────────────────────────────────────────────
const MOCK_DATA: Record<"rooms" | "faculty" | "workloads", Record<string, string>[]> = {
  rooms: [
    { room_id: "D201", type: "theory", capacity: "80", tags: "Projector" },
    { room_id: "D205", type: "theory", capacity: "80", tags: "" },
    { room_id: "Lab1", type: "lab",    capacity: "30", tags: "Linux_Lab;Projector" },
  ],
  faculty: [
    { faculty_id: "F001", name: "Dr. Sharma",  max_load_hrs: "12", max_continuous_hrs: "3", shift_start: "8",  shift_end: "17", class_teacher_for: "SY-B" },
    { faculty_id: "F002", name: "Prof. Patel", max_load_hrs: "17", max_continuous_hrs: "3", shift_start: "8",  shift_end: "17", class_teacher_for: "" },
    { faculty_id: "F003", name: "Dr. Khan",    max_load_hrs: "14", max_continuous_hrs: "2", shift_start: "9",  shift_end: "17", class_teacher_for: "" },
  ],
  workloads: [
    { faculty_id: "F001", subject_code: "DS2001",     event_type: "Theory", target_groups: "SY B",       weekly_hours: "3", consecutive_hours: "1", is_online: "false", required_room_tags: "" },
    { faculty_id: "F001", subject_code: "DS2001_LAB", event_type: "Lab",    target_groups: "SY B1;SY B2",weekly_hours: "2", consecutive_hours: "2", is_online: "false", required_room_tags: "Linux_Lab" },
    { faculty_id: "F002", subject_code: "CN3002",     event_type: "Theory", target_groups: "SY B",       weekly_hours: "3", consecutive_hours: "1", is_online: "false", required_room_tags: "" },
  ],
};

// ─── Row validator ────────────────────────────────────────────────────────────
function validateRow(row: Record<string, string>, schema: ColDef[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const col of schema) {
    const val = (row[col.key] ?? "").trim();
    if (col.required && !val) { errors[col.key] = "Required"; continue; }
    if (!val) continue;
    if (col.type === "integer" && isNaN(parseInt(val))) errors[col.key] = "Must be a number";
    if (col.type === "boolean" && !["true", "false"].includes(val.toLowerCase())) errors[col.key] = "Must be true or false";
    if (col.type === "enum" && col.options && !col.options.map(o => o.toLowerCase()).includes(val.toLowerCase()))
      errors[col.key] = `Must be: ${col.options.join(" | ")}`;
  }
  return errors;
}

/**
 * Normalise workload class type to the 3 canonical DB enum values.
 * Accepts any casing of: theory, lab, practical (→ Lab), tutorial.
 */
function normaliseWorkloadType(raw: string): string {
  const map: Record<string, string> = {
    theory: "Theory",
    lab: "Lab",
    practical: "Lab",  // legacy alias — practical = lab
    tutorial: "Tutorial",
  };
  return map[raw.trim().toLowerCase()] ?? "Theory";
}

/**
 * Normalise room type to lowercase canonical values used in solver: theory | lab.
 * Accepts practical as alias for lab.
 */
function normaliseRoomType(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v === "practical" || v === "lab") return "lab";
  return "theory";
}

// ─── Live Preview Table ───────────────────────────────────────────────────────
function LivePreviewTable({
  schema, rows, isMock, rowErrors,
}: {
  schema: ColDef[];
  rows: Record<string, string>[];
  isMock: boolean;
  rowErrors?: Record<string, string>[];
}) {
  const validCount  = rowErrors?.filter(e => Object.keys(e).length === 0).length ?? 0;
  const errorCount  = rowErrors?.filter(e => Object.keys(e).length > 0).length ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Table header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" />
          {isMock ? "Format Preview — 3 Sample Rows" : `Parsed Data — ${rows.length} rows`}
        </span>
        {!isMock && rowErrors && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            errorCount === 0
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          }`}>
            {errorCount === 0 ? `✅ All ${validCount} rows valid` : `❌ ${errorCount} rows have errors`}
          </span>
        )}
      </div>

      {/* Hint row for mock */}
      {isMock && (
        <div className="flex gap-0 border-b border-dashed border-blue-200 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-900/10 overflow-x-auto">
          <div className="px-3 py-1.5 text-[10px] text-blue-400 font-mono whitespace-nowrap w-8 shrink-0">—</div>
          {schema.map(col => (
            <div key={col.key} className="px-3 py-1.5 text-[10px] text-blue-400 font-mono whitespace-nowrap min-w-[90px]">
              {col.hint}
            </div>
          ))}
        </div>
      )}

      {/* Scrollable table */}
      <div className="overflow-x-auto max-h-56">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur">
              <th className="px-3 py-2 text-left text-slate-400 font-normal w-8">#</th>
              {schema.map(col => (
                <th key={col.key} className="px-3 py-2 text-left font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap min-w-[90px]">
                  {col.key}
                  {col.required && <span className="text-red-500 ml-0.5">*</span>}
                </th>
              ))}
              {!isMock && <th className="px-3 py-2 w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {rows.map((row, i) => {
              const errors = rowErrors?.[i] ?? {};
              const hasError = Object.keys(errors).length > 0;
              return (
                <tr
                  key={i}
                  className={`transition-colors ${
                    isMock
                      ? "opacity-55 bg-slate-50/30 dark:bg-slate-900/20"
                      : hasError
                      ? "bg-red-50/50 dark:bg-red-900/10"
                      : "hover:bg-slate-50/50 dark:hover:bg-slate-900/20"
                  }`}
                >
                  <td className="px-3 py-2 text-slate-400 tabular-nums">{i + 1}</td>
                  {schema.map(col => {
                    const val = row[col.key] ?? "";
                    const err = errors[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-2 font-mono whitespace-nowrap ${
                          err ? "bg-red-50 dark:bg-red-900/20 border-l-2 border-red-400" : ""
                        }`}
                      >
                        {err ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`${val ? "line-through opacity-40 text-slate-500" : "italic text-slate-400"}`}>
                              {val || "empty"}
                            </span>
                            <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-sans font-medium">
                              {err}
                            </span>
                          </div>
                        ) : (
                          <span className={val ? "text-slate-700 dark:text-slate-200" : "text-slate-300 dark:text-slate-600 italic"}>
                            {val || "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {!isMock && (
                    <td className="px-3 py-2">
                      {hasError
                        ? <XCircle className="w-3.5 h-3.5 text-red-500" />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      }
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
type Stage = "idle" | "previewing" | "uploading" | "done";

export default function CsvUploadManager({ onSuccess }: { onSuccess?: () => void }) {
  const [uploadType, setUploadType] = useState<"rooms" | "faculty" | "workloads">("rooms");
  const [stage, setStage]           = useState<Stage>("idle");
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [rowErrors, setRowErrors]   = useState<Record<string, string>[]>([]);
  const supabase = createClient();

  const schema = SCHEMA[uploadType];

  const reset = () => {
    setStage("idle");
    setParsedRows([]);
    setRowErrors([]);
  };

  const handleTypeChange = (t: "rooms" | "faculty" | "workloads") => {
    setUploadType(t);
    reset();
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    const header = schema.map(c => c.key).join(",");
    const sampleRows = MOCK_DATA[uploadType].map(row =>
      schema.map(c => row[c.key] ?? "").join(",")
    ).join("\n");
    const blob = new Blob([`${header}\n${sampleRows}`], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${uploadType}_template.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Step 1: parse file → validate → show preview
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const errors = rows.map(row => validateRow(row, schema));
        setParsedRows(rows);
        setRowErrors(errors);
        setStage("previewing");
      },
      error: (err) => toast.error("CSV parse error", { description: err.message }),
    });
  };

  // Step 2: confirm → insert to Supabase
  const handleConfirmUpload = async () => {
    setStage("uploading");
    try {
      await processData(parsedRows);
      setStage("done");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
      setStage("previewing");
    }
  };

  const processData = async (data: Record<string, string>[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not logged in.");

    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("institution_id").eq("id", user.id).single();
    if (pErr || !profile?.institution_id)
      throw new Error("Please complete Global Settings first to create your institution.");

    const instId = profile.institution_id;

    if (uploadType === "rooms") {
      const payloads = data.filter(r => r.room_id?.trim()).map(row => ({
        institution_id: instId,
        name:      String(row.room_id).trim(),
        // Normalise room type: practical → lab (solver uses lowercase 'theory'/'lab')
        type:      normaliseRoomType(row.type || "theory"),
        capacity:  parseInt(row.capacity) || 30,
        tags:      row.tags ? String(row.tags).split(";").map(t => t.trim()).filter(Boolean) : [],
        is_archived: false,
      }));
      if (!payloads.length) throw new Error("No valid room rows found.");
      const { error } = await supabase.from("rooms").insert(payloads);
      if (error) throw new Error(error.message);
      toast.success(`✅ Imported ${payloads.length} rooms`);
    }

    if (uploadType === "faculty") {
      const payloads = data.filter(r => r.faculty_id?.trim()).map(row => {
        const start = parseInt(row.shift_start) || 8;
        const end   = parseInt(row.shift_end)   || 16;
        const shift: number[] = [];
        for (let i = start; i <= end; i++) shift.push(i);
        return {
          institution_id:    instId,
          // CSV faculty are NOT registered auth users — profile_id MUST be null.
          // Setting profile_id = user.id (admin) caused unique constraint violations.
          profile_id:        null,
          name:              String(row.name || row.faculty_id).trim(),
          faculty_csv_id:    String(row.faculty_id).trim(),
          max_load_hrs:      parseInt(row.max_load_hrs) || 16,
          max_continuous_hrs:parseInt(row.max_continuous_hrs) || 3,
          shift_hours:       shift,
          class_teacher_for: row.class_teacher_for?.trim() || null,
          blocked_slots:     [],
          is_archived:       false,
        };
      });
      if (!payloads.length) throw new Error("No valid faculty rows found.");
      const { error } = await supabase.from("faculty_settings").insert(payloads);
      if (error) throw new Error(error.message);
      toast.success(`✅ Imported ${payloads.length} faculty members`);
    }

    if (uploadType === "workloads") {
      const { data: fData, error: fErr } = await supabase
        .from("faculty_settings")
        .select("id, faculty_csv_id, blocked_slots")
        .eq("institution_id", instId);
      if (fErr || !fData?.length)
        throw new Error("No faculty found. Upload Faculty CSV first.");

      const facultyMap: Record<string, string> = {};
      fData.forEach(f => {
        if (f.faculty_csv_id) facultyMap[f.faculty_csv_id] = f.id;
        if (f.blocked_slots?.[0]?._csv_id) facultyMap[f.blocked_slots[0]._csv_id] = f.id;
      });

      const skipped: string[] = [];
      const payloads = data
        .filter(row => {
          const id = row.faculty_id?.trim();
          if (!id) return false;
          if (!facultyMap[id]) { skipped.push(id); return false; }
          return true;
        })
        .map(row => ({
          institution_id:    instId,
          faculty_id:        facultyMap[row.faculty_id.trim()],
          subject_code:      String(row.subject_code || "").trim(),
          // Normalise type: practical/Practical/lab/LAB → 'Lab', theory → 'Theory', tutorial → 'Tutorial'
          type:              normaliseWorkloadType(row.event_type || "Theory"),
          target_groups:     row.target_groups ? String(row.target_groups).split(";").map(t => t.trim()).filter(Boolean) : [],
          weekly_hours:      parseInt(row.weekly_hours) || 1,
          consecutive_hours: parseInt(row.consecutive_hours) || 1,
          is_online:         String(row.is_online).toLowerCase() === "true",
          required_tags:     row.required_room_tags ? String(row.required_room_tags).split(";").map(t => t.trim()).filter(Boolean) : [],
        }));

      if (!payloads.length)
        throw new Error(skipped.length ? `No matching faculty IDs: ${skipped.join(", ")}. Upload Faculty CSV first.` : "No valid workload rows.");
      const { error } = await supabase.from("workloads").insert(payloads);
      if (error) throw new Error(error.message);
      skipped.length
        ? toast.warning(`Imported ${payloads.length} workloads. Skipped: ${skipped.join(", ")}`)
        : toast.success(`✅ Imported ${payloads.length} workloads`);
    }
  };

  const allValid = rowErrors.length > 0 && rowErrors.every(e => Object.keys(e).length === 0);

  return (
    <div className="space-y-5 border border-slate-200 dark:border-slate-800 p-6 rounded-xl bg-white dark:bg-slate-950 shadow-sm">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Bulk CSV Upload</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Upload rooms, faculty, or workloads from a CSV file. Preview the format below before uploading.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 flex items-center gap-1.5 text-xs h-8" onClick={handleDownloadTemplate}>
          <Download className="w-3.5 h-3.5" /> Template
        </Button>
      </div>

      {/* Upload order notice */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 flex gap-2.5 text-xs text-amber-800 dark:text-amber-200">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <div><strong>Upload order:</strong> 1. Global Settings → 2. Rooms &amp; Faculty (any order) → 3. Workloads (faculty must exist first). Arrays use semicolons (;) as separator.</div>
      </div>

      {/* Type selector */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
        {(["rooms", "faculty", "workloads"] as const).map(type => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
              uploadType === type
                ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Live preview table — mock (idle) or real (previewing) */}
      <LivePreviewTable
        schema={schema}
        rows={stage === "idle" ? MOCK_DATA[uploadType] : parsedRows}
        isMock={stage === "idle"}
        rowErrors={stage !== "idle" ? rowErrors : undefined}
      />

      {/* Upload zone / action area */}
      {stage === "idle" && (
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
          <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={handleFileSelect} />
          <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-sm">
              <span className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">Click to browse</span>
              <span className="text-slate-500 dark:text-slate-400"> or drag a .csv file here</span>
            </div>
            <p className="text-xs text-slate-400">The format preview above shows exactly what columns are expected</p>
          </label>
        </div>
      )}

      {stage === "previewing" && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            onClick={reset}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Choose Different File
          </Button>
          <Button
            size="sm"
            disabled={!allValid}
            onClick={handleConfirmUpload}
            className={`flex items-center gap-1.5 flex-1 ${
              allValid
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
          >
            {allValid ? (
              <><CheckCircle2 className="w-4 h-4" /> Confirm &amp; Upload {parsedRows.length} rows <ArrowRight className="w-3.5 h-3.5 ml-1" /></>
            ) : (
              <><XCircle className="w-4 h-4" /> Fix errors before uploading</>
            )}
          </Button>
        </div>
      )}

      {stage === "uploading" && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-blue-600 dark:text-blue-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Uploading {parsedRows.length} rows to database...
        </div>
      )}

      {stage === "done" && (
        <div className="flex items-center justify-between gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> Upload complete — data is live in the database.
          </div>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={reset}>
            Upload More
          </Button>
        </div>
      )}
    </div>
  );
}
