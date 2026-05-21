"use client";

import { useState, useRef, useCallback, ReactNode, KeyboardEvent } from "react";
import { toast } from "sonner";
import {
  ClipboardPaste, Sheet, PencilLine, Plus, Trash2,
  CheckCircle2, XCircle, Loader2, RotateCcw, ArrowRight, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

// ─── Schema (mirrors CsvUploadManager — fixed column order for paste/sheet) ───
type ColDef = {
  key: string; label: string;
  type: "string" | "integer" | "semisep" | "boolean" | "enum";
  required: boolean; hint: string; options?: string[];
};

const SCHEMA: Record<"rooms" | "faculty" | "workloads", ColDef[]> = {
  rooms: [
    { key: "room_id",  label: "Room ID",   type: "string",  required: true,  hint: "e.g. D201" },
    { key: "type",     label: "Type",      type: "enum",    required: true,  hint: "theory | practical | lab", options: ["theory","practical","lab"] },
    { key: "capacity", label: "Capacity",  type: "integer", required: true,  hint: "e.g. 60" },
    { key: "tags",     label: "Tags",      type: "semisep", required: false, hint: "Projector;Lab" },
  ],
  faculty: [
    { key: "faculty_id",         label: "Faculty ID",       type: "string",  required: true,  hint: "e.g. F001" },
    { key: "name",               label: "Name",             type: "string",  required: true,  hint: "Full name" },
    { key: "max_load_hrs",       label: "Max Load (hrs)",   type: "integer", required: true,  hint: "e.g. 16" },
    { key: "max_continuous_hrs", label: "Max Continuous",   type: "integer", required: false, hint: "e.g. 3" },
    { key: "shift_start",        label: "Shift Start",      type: "integer", required: false, hint: "8 = 8 AM" },
    { key: "shift_end",          label: "Shift End",        type: "integer", required: false, hint: "17 = 5 PM" },
    { key: "class_teacher_for",  label: "Class Teacher For",type: "string",  required: false, hint: "e.g. SY-B" },
  ],
  workloads: [
    { key: "faculty_id",        label: "Faculty ID",       type: "string",  required: true,  hint: "Must match faculty" },
    { key: "subject_code",      label: "Subject Code",     type: "string",  required: true,  hint: "e.g. DS2001" },
    { key: "event_type",        label: "Event Type",       type: "enum",    required: false, hint: "Theory | Practical | Tutorial", options: ["Theory","Practical","Tutorial"] },
    { key: "target_groups",     label: "Target Groups",    type: "semisep", required: false, hint: "SY B;SY B1" },
    { key: "weekly_hours",      label: "Weekly Hours",     type: "integer", required: true,  hint: "e.g. 3" },
    { key: "consecutive_hours", label: "Consecutive Hrs",  type: "integer", required: false, hint: "Must divide weekly_hours" },
    { key: "is_online",         label: "Is Online",        type: "boolean", required: false, hint: "true / false" },
    { key: "required_room_tags",label: "Required Tags",    type: "semisep", required: false, hint: "Linux_Lab;Projector" },
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
    if (col.type === "boolean" && !["true","false"].includes(val.toLowerCase())) errors[col.key] = "true or false";
    if (col.type === "enum" && col.options && !col.options.map(o=>o.toLowerCase()).includes(val.toLowerCase()))
      errors[col.key] = col.options.join(" | ");
  }
  return errors;
}

// ─── Shared preview grid ──────────────────────────────────────────────────────
function PreviewGrid({ schema, rows, rowErrors }: {
  schema: ColDef[];
  rows: Record<string, string>[];
  rowErrors: Record<string, string>[];
}) {
  const errorCount = rowErrors.filter(e => Object.keys(e).length > 0).length;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{rows.length} rows parsed</span>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
          errorCount === 0
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
        }`}>
          {errorCount === 0 ? `✅ All rows valid` : `❌ ${errorCount} rows have errors`}
        </span>
      </div>
      <div className="overflow-x-auto max-h-52">
        <table className="w-full text-xs">
          <thead className="sticky top-0">
            <tr className="bg-slate-100 dark:bg-slate-900">
              <th className="px-2 py-2 text-slate-400 font-normal w-8 text-center">#</th>
              {schema.map(col => (
                <th key={col.key} className="px-3 py-2 text-left font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {col.key}{col.required && <span className="text-red-500 ml-0.5">*</span>}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {rows.map((row, i) => {
              const errors = rowErrors[i] ?? {};
              const hasErr = Object.keys(errors).length > 0;
              return (
                <tr key={i} className={hasErr ? "bg-red-50/50 dark:bg-red-900/10" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/20"}>
                  <td className="px-2 py-2 text-center text-slate-400 tabular-nums">{i+1}</td>
                  {schema.map(col => {
                    const val = row[col.key] ?? "";
                    const err = errors[col.key];
                    return (
                      <td key={col.key} className={`px-3 py-2 font-mono whitespace-nowrap ${err ? "bg-red-50 dark:bg-red-900/20 border-l-2 border-red-400" : ""}`}>
                        {err ? (
                          <span className="flex items-center gap-1.5">
                            <span className="line-through opacity-40 text-slate-500">{val || "empty"}</span>
                            <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">{err}</span>
                          </span>
                        ) : (
                          <span className={val ? "text-slate-700 dark:text-slate-200" : "text-slate-300 dark:text-slate-600 italic"}>
                            {val || "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center">
                    {hasErr ? <XCircle className="w-3.5 h-3.5 text-red-500 inline" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shared Supabase submit logic ─────────────────────────────────────────────
async function submitRows(
  supabase: ReturnType<typeof createClient>,
  type: "rooms" | "faculty" | "workloads",
  rows: Record<string, string>[]
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in.");

  const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
  if (!profile?.institution_id) throw new Error("Complete Global Settings first to create your institution.");
  const instId = profile.institution_id;

  if (type === "rooms") {
    const payloads = rows.filter(r => r.room_id?.trim()).map(row => ({
      institution_id: instId,
      name:      String(row.room_id).trim(),
      type:      String(row.type || "theory").toLowerCase().trim(),
      capacity:  parseInt(row.capacity) || 30,
      tags:      row.tags ? String(row.tags).split(";").map(t=>t.trim()).filter(Boolean) : [],
      is_archived: false,
    }));
    if (!payloads.length) throw new Error("No valid room rows.");
    const { error } = await supabase.from("rooms").insert(payloads);
    if (error) throw new Error(error.message);
    toast.success(`✅ Added ${payloads.length} rooms`);
  }

  if (type === "faculty") {
    const payloads = rows.filter(r => r.faculty_id?.trim()).map(row => {
      const start = parseInt(row.shift_start)||8, end = parseInt(row.shift_end)||16;
      const shift: number[] = []; for (let i=start;i<=end;i++) shift.push(i);
      return {
        institution_id: instId, profile_id: user.id,
        name: String(row.name || row.faculty_id).trim(),
        faculty_csv_id: String(row.faculty_id).trim(),
        max_load_hrs: parseInt(row.max_load_hrs)||16,
        max_continuous_hrs: parseInt(row.max_continuous_hrs)||3,
        shift_hours: shift,
        class_teacher_for: row.class_teacher_for?.trim() || null,
        blocked_slots: [], is_archived: false,
      };
    });
    if (!payloads.length) throw new Error("No valid faculty rows.");
    const { error } = await supabase.from("faculty_settings").insert(payloads);
    if (error) throw new Error(error.message);
    toast.success(`✅ Added ${payloads.length} faculty members`);
  }

  if (type === "workloads") {
    const { data: fData } = await supabase.from("faculty_settings").select("id,faculty_csv_id").eq("institution_id", instId);
    if (!fData?.length) throw new Error("Upload Faculty first — no faculty found for this institution.");
    const fMap: Record<string,string> = {};
    fData.forEach(f => { if (f.faculty_csv_id) fMap[f.faculty_csv_id] = f.id; });

    const skipped: string[] = [];
    const payloads = rows.filter(row => {
      const id = row.faculty_id?.trim();
      if (!id || !fMap[id]) { if (id) skipped.push(id); return false; }
      return true;
    }).map(row => ({
      institution_id: instId,
      faculty_id: fMap[row.faculty_id.trim()],
      subject_code: String(row.subject_code||"").trim(),
      type: String(row.event_type||"Theory").trim(),
      target_groups: row.target_groups ? String(row.target_groups).split(";").map(t=>t.trim()).filter(Boolean) : [],
      weekly_hours: parseInt(row.weekly_hours)||1,
      consecutive_hours: parseInt(row.consecutive_hours)||1,
      is_online: String(row.is_online).toLowerCase()==="true",
      required_tags: row.required_room_tags ? String(row.required_room_tags).split(";").map(t=>t.trim()).filter(Boolean) : [],
    }));
    if (!payloads.length) throw new Error(skipped.length ? `No matching faculty IDs: ${skipped.join(", ")}` : "No valid workload rows.");
    const { error } = await supabase.from("workloads").insert(payloads);
    if (error) throw new Error(error.message);
    skipped.length
      ? toast.warning(`Added ${payloads.length} workloads. Skipped: ${skipped.join(", ")}`)
      : toast.success(`✅ Added ${payloads.length} workloads`);
  }
}

// ─── Mode 2: Paste Mode ───────────────────────────────────────────────────────
function PasteMode({ type, schema, onSuccess }: { type: "rooms"|"faculty"|"workloads"; schema: ColDef[]; onSuccess?: ()=>void }) {
  const [rows, setRows]         = useState<Record<string,string>[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<string,string>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasted, setIsPasted] = useState(false);
  const supabase = createClient();

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const raw = e.clipboardData.getData("text/plain");
    const lines = raw.split("\n").map(l => l.trimEnd()).filter(l => l.trim());

    // Auto-detect if first line is headers (all values match column keys)
    let dataLines = lines;
    const firstCells = lines[0]?.split("\t").map(c => c.trim().toLowerCase());
    const schemaKeys = schema.map(c => c.key.toLowerCase());
    const looksLikeHeader = schemaKeys.every(k => firstCells.includes(k));
    if (looksLikeHeader) dataLines = lines.slice(1);

    const parsed: Record<string,string>[] = dataLines.map(line => {
      const cells = line.split("\t");
      const row: Record<string,string> = {};
      schema.forEach((col, idx) => { row[col.key] = (cells[idx] ?? "").trim(); });
      return row;
    });

    const errors = parsed.map(row => validateRow(row, schema));
    setRows(parsed);
    setRowErrors(errors);
    setIsPasted(true);
  }, [schema]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitRows(supabase, type, rows);
      setRows([]); setRowErrors([]); setIsPasted(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Submit failed", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allValid = rows.length > 0 && rowErrors.every(e => Object.keys(e).length === 0);

  return (
    <div className="space-y-4">
      {/* Column order hint */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Paste column order (fixed):</p>
        <div className="flex flex-wrap gap-1.5">
          {schema.map((col, i) => (
            <span key={col.key} className="inline-flex items-center gap-1 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
              <span className="text-slate-400">{i+1}.</span>
              <span className="text-slate-700 dark:text-slate-200">{col.key}</span>
              {col.required && <span className="text-red-500">*</span>}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Select your data in Excel / Google Sheets → Ctrl+C → click the area below → Ctrl+V.
          Headers are optional (auto-detected). Use semicolons (;) for arrays.
        </p>
      </div>

      {!isPasted ? (
        <div className="relative">
          <textarea
            onPaste={handlePaste}
            placeholder="Click here, then paste your copied cells (Ctrl+V)..."
            className="w-full h-32 px-4 py-3 text-sm font-mono border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 resize-none transition-colors"
            readOnly
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <ClipboardPaste className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Click above, then Ctrl+V to paste</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <PreviewGrid schema={schema} rows={rows} rowErrors={rowErrors} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5"
              onClick={() => { setRows([]); setRowErrors([]); setIsPasted(false); }}>
              <RotateCcw className="w-3.5 h-3.5" /> Paste Again
            </Button>
            <Button size="sm"
              disabled={!allValid || isSubmitting}
              onClick={handleSubmit}
              className={`flex-1 flex items-center justify-center gap-1.5 ${
                allValid ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              }`}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : allValid ? <><CheckCircle2 className="w-4 h-4" /> Submit {rows.length} rows <ArrowRight className="w-3.5 h-3.5" /></>
                : <><XCircle className="w-4 h-4" /> Fix errors first</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mode 3: Sheet Mode ───────────────────────────────────────────────────────
function SheetMode({ type, schema, onSuccess }: { type: "rooms"|"faculty"|"workloads"; schema: ColDef[]; onSuccess?: ()=>void }) {
  const emptyRow = () => Object.fromEntries(schema.map(c => [c.key, ""]));
  const [rows, setRows]           = useState<Record<string,string>[]>([emptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const supabase = createClient();

  const rowErrors = rows.map(r => validateRow(r, schema));
  const filledRows = rows.filter(r => schema.some(c => (r[c.key]||"").trim()));
  const allValid = filledRows.length > 0 && filledRows.every(r => Object.keys(validateRow(r, schema)).length === 0);

  const updateCell = (ri: number, key: string, val: string) => {
    setRows(prev => prev.map((r, i) => i === ri ? { ...r, [key]: val } : r));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const deleteRow = (ri: number) => {
    setRows(prev => prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== ri));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, ri: number, ci: number) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const nextCi = e.shiftKey ? ci - 1 : ci + 1;
      if (nextCi >= 0 && nextCi < schema.length) {
        inputRefs.current[ri]?.[nextCi]?.focus();
      } else if (!e.shiftKey && nextCi >= schema.length) {
        if (ri + 1 >= rows.length) {
          setRows(prev => [...prev, emptyRow()]);
          setTimeout(() => inputRefs.current[ri+1]?.[0]?.focus(), 30);
        } else {
          inputRefs.current[ri+1]?.[0]?.focus();
        }
      } else if (e.shiftKey && nextCi < 0 && ri > 0) {
        inputRefs.current[ri-1]?.[schema.length-1]?.focus();
      }
    }
    if (e.key === "Enter" && ci === schema.length - 1) {
      e.preventDefault();
      const isEmpty = schema.every(c => !(rows[ri][c.key]||"").trim());
      if (!isEmpty) {
        setRows(prev => [...prev, emptyRow()]);
        setTimeout(() => inputRefs.current[ri+1]?.[0]?.focus(), 30);
      }
    }
    if (e.key === "Delete" || (e.key === "Backspace" && e.metaKey)) {
      const isEmpty = schema.every(c => !(rows[ri][c.key]||"").trim());
      if (isEmpty && rows.length > 1) deleteRow(ri);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitRows(supabase, type, filledRows);
      setRows([emptyRow()]);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Submit failed", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Type directly into cells. <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono">Tab</kbd> moves across,{" "}
        <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono">Enter</kbd> adds a new row.
      </p>

      {/* Grid */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900">
                <th className="px-2 py-2 text-slate-400 font-normal w-8 text-center">#</th>
                {schema.map(col => (
                  <th key={col.key} className="px-2 py-2 text-left font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap min-w-[100px]">
                    {col.key}{col.required && <span className="text-red-500 ml-0.5">*</span>}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {rows.map((row, ri) => {
                const errors = rowErrors[ri] ?? {};
                if (!inputRefs.current[ri]) inputRefs.current[ri] = [];
                return (
                  <tr key={ri} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                    <td className="px-2 py-1 text-center text-slate-400 tabular-nums">{ri+1}</td>
                    {schema.map((col, ci) => {
                      const err = errors[col.key];
                      return (
                        <td key={col.key} className={`px-1 py-1 ${err ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                          <div className="relative">
                            <input
                              ref={el => { if (!inputRefs.current[ri]) inputRefs.current[ri] = []; inputRefs.current[ri][ci] = el; }}
                              value={row[col.key] ?? ""}
                              onChange={e => updateCell(ri, col.key, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, ri, ci)}
                              placeholder={col.hint}
                              className={`w-full px-2 py-1.5 text-xs font-mono bg-transparent border rounded focus:outline-none focus:ring-1 transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-700 ${
                                err
                                  ? "border-red-300 dark:border-red-700 focus:ring-red-400 dark:focus:ring-red-600 text-red-700 dark:text-red-400"
                                  : "border-transparent focus:border-blue-300 dark:focus:border-blue-700 focus:ring-blue-400 dark:focus:ring-blue-600 hover:border-slate-200 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200"
                              }`}
                            />
                            {err && (
                              <span className="absolute -top-4 left-0 z-10 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                                {err}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-1 py-1 text-center">
                      <button onClick={() => deleteRow(ri)}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={addRow} className="flex items-center gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add Row
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setRows([emptyRow()])} className="text-xs text-slate-400 hover:text-slate-600">
          <RotateCcw className="w-3 h-3 mr-1" /> Clear
        </Button>
        <Button size="sm"
          disabled={!allValid || isSubmitting}
          onClick={handleSubmit}
          className={`flex-1 flex items-center justify-center gap-1.5 ${
            allValid ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20"
              : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
          }`}>
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : allValid ? <><Upload className="w-4 h-4" /> Submit {filledRows.length} row{filledRows.length !== 1 ? "s" : ""} <ArrowRight className="w-3.5 h-3.5" /></>
            : <><XCircle className="w-4 h-4" /> Fill required fields</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Main SpreadsheetEditor ───────────────────────────────────────────────────
type Mode = "form" | "paste" | "sheet";

const MODE_TABS: { key: Mode; label: string; icon: ReactNode }[] = [
  { key: "form",  label: "Form",  icon: <PencilLine  className="w-3.5 h-3.5" /> },
  { key: "paste", label: "Paste", icon: <ClipboardPaste className="w-3.5 h-3.5" /> },
  { key: "sheet", label: "Sheet", icon: <Sheet className="w-3.5 h-3.5" /> },
];

export default function SpreadsheetEditor({
  type, onSuccess, children,
}: {
  type: "rooms" | "faculty" | "workloads";
  onSuccess?: () => void;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("form");
  const schema = SCHEMA[type];

  const typeLabel: Record<typeof type, string> = {
    rooms: "Room", faculty: "Faculty", workloads: "Workload",
  };

  return (
    <div className="space-y-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-0">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
            Add {typeLabel[type]}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose how you'd like to enter data
          </p>
        </div>
        {/* Mode tab switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg gap-0.5">
          {MODE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === tab.key
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode description strip */}
      <div className="mx-5 px-3 py-2 rounded-lg bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
        <p className="text-[11px] text-blue-700 dark:text-blue-400">
          {mode === "form"  && "📝 Fill the form to add a single entry. Great for quick additions or edits."}
          {mode === "paste" && "📋 Copy cells from Excel or Google Sheets and paste them here directly."}
          {mode === "sheet" && "🔢 Type row by row in this live spreadsheet. Tab across cells, Enter to add a new row."}
        </p>
      </div>

      {/* Mode content */}
      <div className="px-5 pb-5">
        {mode === "form"  && <>{children}</>}
        {mode === "paste" && <PasteMode type={type} schema={schema} onSuccess={onSuccess} />}
        {mode === "sheet" && <SheetMode type={type} schema={schema} onSuccess={onSuccess} />}
      </div>
    </div>
  );
}
