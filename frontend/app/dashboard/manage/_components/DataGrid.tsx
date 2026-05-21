"use client";

import { useState, useMemo } from "react";
import { Search, Trash2, Edit2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Column<T> {
    key: string;
    header: string;
    render: (row: T) => React.ReactNode;
    width?: string;
}

interface DataGridProps<T extends { id: string }> {
    data: T[];
    columns: Column<T>[];
    onDelete: (id: string) => Promise<void>;
    onEdit: (row: T) => void;
    searchKeys: (keyof T)[];
    emptyMessage?: string;
    pageSize?: number;
    customActions?: (row: T) => React.ReactNode;
}

export function DataGrid<T extends { id: string }>({
    data,
    columns,
    onDelete,
    onEdit,
    searchKeys,
    emptyMessage = "No records found.",
    pageSize = 12,
    customActions,
}: DataGridProps<T>) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter((row) =>
            searchKeys.some((key) => {
                const val = row[key];
                if (typeof val === "string") return val.toLowerCase().includes(q);
                if (Array.isArray(val)) return val.join(" ").toLowerCase().includes(q);
                return false;
            })
        );
    }, [data, search, searchKeys]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const handleDeleteClick = (id: string) => {
        if (confirmDeleteId === id) {
            // Second click = confirmed
            handleDeleteConfirm(id);
        } else {
            setConfirmDeleteId(id);
            // Auto-reset confirmation after 4 seconds
            setTimeout(() => setConfirmDeleteId(null), 4000);
        }
    };

    const handleDeleteConfirm = async (id: string) => {
        setDeletingId(id);
        setConfirmDeleteId(null);
        await onDelete(id);
        setDeletingId(null);
    };

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/60">
                <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search records..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="pl-9 h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${col.width ?? ""}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="py-16 text-center text-slate-400">
                                    {search ? `No results for "${search}"` : emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row) => {
                                const isDeleting = deletingId === row.id;
                                const isConfirming = confirmDeleteId === row.id;
                                return (
                                    <tr
                                        key={row.id}
                                        className={`group transition-colors ${isDeleting ? "opacity-40" : "hover:bg-slate-50/80 dark:hover:bg-slate-900/40"}`}
                                    >
                                        {columns.map((col) => (
                                            <td key={col.key} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                                {col.render(row)}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3">
                                            {customActions ? (
                                                customActions(row)
                                            ) : (
                                            <div className="flex items-center justify-end gap-1">
                                                {isConfirming ? (
                                                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                                        <span className="text-xs text-red-600 dark:text-red-400 font-medium whitespace-nowrap">Sure?</span>
                                                        <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => handleDeleteConfirm(row.id)}>Yes</Button>
                                                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setConfirmDeleteId(null)}>No</Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50" onClick={() => onEdit(row)} disabled={isDeleting} title="Edit record"><Edit2 className="w-3.5 h-3.5" /></Button>
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={() => handleDeleteClick(row.id)} disabled={isDeleting} title="Delete record">
                                                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {filtered.length > pageSize && (
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="px-2 font-medium text-slate-700 dark:text-slate-300">{page} / {totalPages}</span>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
