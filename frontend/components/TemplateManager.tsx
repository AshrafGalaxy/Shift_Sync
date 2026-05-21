"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
    BookmarkPlus, FolderOpen, Loader2, Trash2, Clock, CheckCircle2,
    AlertTriangle, Building, Users, BookOpen, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

interface Template {
    id: string;
    name: string;
    created_at: string;
    snapshot: {
        rooms: any[];
        faculty: any[];
        workloads: any[];
    };
}

interface Props {
    institutionId: string;
    onTemplateLoaded: () => void;
}

export default function TemplateManager({ institutionId, onTemplateLoaded }: Props) {
    const supabase = createClient();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [isLoadOpen, setIsLoadOpen] = useState(false);
    const [isDiffOpen, setIsDiffOpen] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const fetchTemplates = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from("constraint_templates")
            .select("*")
            .eq("institution_id", institutionId)
            .order("created_at", { ascending: false });
        setTemplates((data ?? []) as Template[]);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchTemplates();
    }, [institutionId]);

    // ── Save current config as template ───────────────────────────────
    const handleSave = async () => {
        if (!templateName.trim()) return;
        setIsSaving(true);
        try {
            const [roomsRes, facultyRes, workloadsRes] = await Promise.all([
                supabase.from("rooms").select("*").eq("institution_id", institutionId),
                supabase.from("faculty_settings").select("*"),
                supabase.from("workloads").select("*"),
            ]);

            const snapshot = {
                rooms: roomsRes.data ?? [],
                faculty: facultyRes.data ?? [],
                workloads: workloadsRes.data ?? [],
            };

            const { error } = await supabase.from("constraint_templates").insert({
                institution_id: institutionId,
                name: templateName.trim(),
                snapshot,
            });

            if (error) throw error;
            setTemplateName("");
            setIsSaveOpen(false);
            fetchTemplates();
            showToast(`✓ Template "${templateName.trim()}" saved`);
        } catch (err: any) {
            alert("Save failed: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Apply a template (with diff preview) ─────────────────────────
    const handleSelectTemplate = (t: Template) => {
        setSelectedTemplate(t);
        setIsLoadOpen(false);
        setIsDiffOpen(true);
    };

    const handleApplyTemplate = async () => {
        if (!selectedTemplate) return;
        setIsApplying(true);
        try {
            const snap = selectedTemplate.snapshot;

            // 1. Delete existing data
            await Promise.all([
                supabase.from("rooms").delete().eq("institution_id", institutionId),
                supabase.from("faculty_settings").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
                supabase.from("workloads").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
            ]);

            // 2. Re-insert from snapshot (strip IDs so Supabase auto-generates new ones)
            const strip = (arr: any[]) => arr.map(({ id, created_at, ...rest }) => rest);

            if (snap.rooms.length > 0) await supabase.from("rooms").insert(strip(snap.rooms));
            if (snap.faculty.length > 0) await supabase.from("faculty_settings").insert(strip(snap.faculty));
            if (snap.workloads.length > 0) await supabase.from("workloads").insert(strip(snap.workloads));

            setIsDiffOpen(false);
            setSelectedTemplate(null);
            onTemplateLoaded();
            showToast(`✓ Template "${selectedTemplate.name}" applied`);
        } catch (err: any) {
            alert("Apply failed: " + err.message);
        } finally {
            setIsApplying(false);
        }
    };

    // ── Delete template ───────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        setDeletingId(id);
        await supabase.from("constraint_templates").delete().eq("id", id);
        setTemplates(prev => prev.filter(t => t.id !== id));
        setDeletingId(null);
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    return (
        <>
            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 duration-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
                    {toast}
                </div>
            )}

            {/* ── Template bar ─────────────────────────────────────────── */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Constraint Templates</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {templates.length === 0
                            ? "No saved templates. Save current rooms/faculty/workloads as a reusable semester config."
                            : `${templates.length} saved template${templates.length !== 1 ? "s" : ""} — restore any semester config instantly.`}
                    </p>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLoadOpen(true)}
                    disabled={templates.length === 0}
                    className="text-slate-600 border-slate-200 dark:border-slate-700"
                >
                    <FolderOpen className="w-4 h-4 mr-1.5" /> Load
                </Button>
                <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setIsSaveOpen(true)}
                >
                    <BookmarkPlus className="w-4 h-4 mr-1.5" /> Save as Template
                </Button>
            </div>

            {/* ── Save Dialog ──────────────────────────────────────────── */}
            <Dialog open={isSaveOpen} onOpenChange={o => !o && setIsSaveOpen(false)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookmarkPlus className="w-4 h-4 text-blue-500" /> Save Current Config
                        </DialogTitle>
                        <DialogDescription>
                            All current rooms, faculty settings, and workloads will be saved as a named snapshot.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label>Template Name</Label>
                        <Input
                            autoFocus
                            placeholder="e.g. Semester 5 — 2024-25"
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSave()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSaveOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !templateName.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Snapshot
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Load / Browse Templates Dialog ───────────────────────── */}
            <Dialog open={isLoadOpen} onOpenChange={o => !o && setIsLoadOpen(false)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-slate-500" /> Saved Templates
                        </DialogTitle>
                        <DialogDescription>Select a template to preview before applying.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2 max-h-[400px] overflow-y-auto pr-1">
                        {isLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                        ) : templates.length === 0 ? (
                            <p className="text-center text-slate-400 py-8 text-sm">No templates saved yet.</p>
                        ) : (
                            templates.map(t => (
                                <div
                                    key={t.id}
                                    className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-blue-300 dark:hover:border-blue-500/40 transition-colors group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{t.name}</p>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <Badge variant="secondary" className="text-[10px] gap-1 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20">
                                                <Building className="w-3 h-3" /> {t.snapshot.rooms?.length ?? 0} rooms
                                            </Badge>
                                            <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                                                <Users className="w-3 h-3" /> {t.snapshot.faculty?.length ?? 0} faculty
                                            </Badge>
                                            <Badge variant="secondary" className="text-[10px] gap-1 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20">
                                                <BookOpen className="w-3 h-3" /> {t.snapshot.workloads?.length ?? 0} workloads
                                            </Badge>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-auto">
                                                <Clock className="w-3 h-3" /> {formatDate(t.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            size="sm"
                                            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                            onClick={() => handleSelectTemplate(t)}
                                        >
                                            Load <ChevronRight className="w-3 h-3 ml-1" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                                            onClick={() => handleDelete(t.id)}
                                            disabled={deletingId === t.id}
                                        >
                                            {deletingId === t.id
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <Trash2 className="w-3.5 h-3.5" />}
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Diff / Confirm Dialog ────────────────────────────────── */}
            <Dialog open={isDiffOpen} onOpenChange={o => !o && setIsDiffOpen(false)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Confirm Template Load
                        </DialogTitle>
                        <DialogDescription>
                            Loading <strong>"{selectedTemplate?.name}"</strong> will replace all current configuration.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedTemplate && (
                        <div className="space-y-3 py-2">
                            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-800 dark:text-amber-200">
                                <p className="font-semibold mb-2">This will overwrite:</p>
                                <ul className="space-y-1 text-xs">
                                    <li className="flex items-center gap-2"><Building className="w-3.5 h-3.5" /> All rooms → replaced with <strong>{selectedTemplate.snapshot.rooms?.length ?? 0}</strong> rooms from snapshot</li>
                                    <li className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> All faculty settings → replaced with <strong>{selectedTemplate.snapshot.faculty?.length ?? 0}</strong> records</li>
                                    <li className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> All workloads → replaced with <strong>{selectedTemplate.snapshot.workloads?.length ?? 0}</strong> workloads</li>
                                </ul>
                            </div>
                            <p className="text-xs text-slate-500">This action cannot be undone. Make sure to save a snapshot of your current config first if needed.</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDiffOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleApplyTemplate}
                            disabled={isApplying}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {isApplying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Yes, Apply Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
