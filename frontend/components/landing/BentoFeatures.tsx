"use client";

import { motion } from "framer-motion";
import {
  Brain,
  AlertTriangle,
  Search,
  Download,
  Building2,
  UserCheck,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  CalendarRange,
} from "lucide-react";

/** §9 — Bento Grid Feature Layout */

// ─── Mini visuals ────────────────────────────────────────────────────────────

function MiniTimetable() {
  const rows = [
    ["from-sky-500 to-blue-600",   null,                         "from-violet-500 to-purple-600"],
    [null,                         "from-teal-500 to-cyan-600",  "from-teal-500 to-cyan-600"  ],
    ["from-sky-500 to-blue-600",   "from-amber-500 to-orange-500", null                       ],
    [null,                         "from-violet-500 to-purple-600", "from-sky-500 to-blue-600"],
  ] as (string | null)[][];

  return (
    <div className="grid gap-1 mt-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
      {rows.flatMap((row, ri) =>
        row.map((color, ci) =>
          color ? (
            <motion.div
              key={`${ri}-${ci}`}
              initial={{ opacity: 0, scale: 0.7 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (ri * 3 + ci) * 0.04, type: "spring", stiffness: 300, damping: 22 }}
              className={`h-8 rounded-md bg-gradient-to-br ${color} border border-white/10`}
            />
          ) : (
            <div key={`${ri}-${ci}`} className="h-8 rounded-md bg-slate-800/60 border border-slate-700/40" />
          )
        )
      )}
    </div>
  );
}

function GhostRoomVisual() {
  return (
    <div className="mt-4 space-y-2">
      {[1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <span className="text-[11px] text-amber-300/80 font-mono truncate">
            CS-301 → Ghost Room (TBD) · Slot {i === 1 ? "Wed 10AM" : "Fri 2PM"}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function ExportVisual() {
  const formats = [
    { icon: FileSpreadsheet, label: "XLSX", color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/30" },
    { icon: FileText,        label: "PDF",  color: "text-red-400",  bg: "bg-red-500/10  border-red-500/30"  },
    { icon: CalendarRange,   label: "iCal", color: "text-sky-400",  bg: "bg-sky-500/10  border-sky-500/30"  },
  ];
  return (
    <div className="mt-4 flex gap-2">
      {formats.map(({ icon: Icon, label, color, bg }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ y: -3, transition: { type: "spring", stiffness: 300 } }}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border ${bg} cursor-default`}
        >
          <Icon className={`w-5 h-5 ${color}`} />
          <span className={`text-[11px] font-semibold ${color}`}>{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function ConflictVisual() {
  const lines = [
    { label: "Faculty overlap · Dr. Sharma",        ok: false },
    { label: "Room capacity · Lab-301 (42 > 40)",   ok: false },
    { label: "Time slot · Mon 9AM resolved",        ok: true  },
  ];
  return (
    <div className="mt-4 space-y-1.5">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2"
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${line.ok ? "bg-teal-400" : "bg-red-400"}`} />
          <span className={`text-[11px] font-mono ${line.ok ? "text-teal-400/70" : "text-red-400/70"}`}>{line.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function MultiTenantVisual() {
  return (
    <div className="mt-4 flex items-center justify-around">
      {["SATIS", "VIT", "BITS"].map((inst, i) => (
        <motion.div
          key={inst}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="flex flex-col items-center gap-1.5"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-[10px] text-slate-500 font-mono">{inst}</span>
        </motion.div>
      ))}
    </div>
  );
}

function SubstitutionVisual() {
  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
        <UserCheck className="w-5 h-5 text-rose-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">
          <span className="text-rose-400 font-semibold">Dr. Sharma</span> absent ·{" "}
          <span className="text-teal-400 font-semibold">Prof. Mehta</span> auto-assigned
        </p>
        <p className="text-[11px] text-slate-600 mt-0.5">Conflict check passed · Bell notified</p>
      </div>
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0"
      />
    </div>
  );
}

// ─── Card component ───────────────────────────────────────────────────────────

interface CardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  iconGradient: string;
  iconShadow: string;
  hoverClass: string;
  children?: React.ReactNode;
  className?: string;
  delay?: number;
}

function BentoCard({
  icon: Icon,
  title,
  description,
  iconGradient,
  iconShadow,
  hoverClass,
  children,
  className = "",
  delay = 0,
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className={`group relative bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 overflow-hidden ${hoverClass} ${className}`}
    >
      {/* Subtle top shimmer on hover */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconGradient} ${iconShadow} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="font-semibold text-slate-100 mb-1.5">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
      {children}
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function BentoFeatures() {
  return (
    <div id="features" className="mt-32">
      <div className="text-center mb-12">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-bold mb-4"
        >
          Everything your scheduling team needs
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-slate-400 max-w-2xl mx-auto"
        >
          From faculty shifts to lab continuity — every constraint, handled.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Row 1 — AI Solver hero (spans 2 cols on lg) + Ghost Room */}
        <BentoCard
          icon={Brain}
          title="AI Constraint Solver"
          description="Google OR-Tools CP-SAT engine solves thousands of constraint variables in seconds — faculty clashes, room limits, workload quotas, all at once."
          iconGradient="from-sky-500 to-blue-600"
          iconShadow="shadow-[0_0_18px_rgba(14,165,233,0.4)]"
          hoverClass="hover:card-glow-blue hover:border-sky-500/50"
          className="md:col-span-2 min-h-[220px]"
          delay={0}
        >
          <MiniTimetable />
        </BentoCard>

        <BentoCard
          icon={AlertTriangle}
          title="Ghost Resource Layer"
          description="Never crash on overflow. Ghost rooms absorb excess slots and flag them amber for manual resolution."
          iconGradient="from-amber-500 to-orange-500"
          iconShadow="shadow-[0_0_18px_rgba(245,158,11,0.4)]"
          hoverClass="hover:card-glow-amber hover:border-amber-500/50"
          delay={0.08}
        >
          <GhostRoomVisual />
        </BentoCard>

        {/* Row 2 — Export · Conflict · Multi-Tenant */}
        <BentoCard
          icon={Download}
          title="Multi-Format Export"
          description="Excel, PDF, iCal or directly push to Google Calendar — one click."
          iconGradient="from-teal-500 to-emerald-500"
          iconShadow="shadow-[0_0_18px_rgba(20,184,166,0.4)]"
          hoverClass="hover:card-glow-teal hover:border-teal-500/50"
          delay={0.12}
        >
          <ExportVisual />
        </BentoCard>

        <BentoCard
          icon={Search}
          title="Conflict Refiner"
          description="When generation fails, the refiner pinpoints the exact impossible constraint so you can fix it — not just a generic error."
          iconGradient="from-violet-500 to-purple-600"
          iconShadow="shadow-[0_0_18px_rgba(139,92,246,0.4)]"
          hoverClass="hover:card-glow-violet hover:border-violet-500/50"
          delay={0.16}
        >
          <ConflictVisual />
        </BentoCard>

        <BentoCard
          icon={Building2}
          title="Multi-Tenant Architecture"
          description="Row-level security ensures each institution sees only its own data. Register and go in minutes."
          iconGradient="from-indigo-500 to-blue-600"
          iconShadow="shadow-[0_0_18px_rgba(99,102,241,0.4)]"
          hoverClass="hover:card-glow-indigo hover:border-indigo-500/50"
          delay={0.2}
        >
          <MultiTenantVisual />
        </BentoCard>

        {/* Row 3 — Substitution full-width */}
        <BentoCard
          icon={UserCheck}
          title="Real-Time Substitution"
          description="Faculty absent? The substitute finder checks conflicts in real-time, auto-assigns the best match, and notifies via the bell system — all within seconds."
          iconGradient="from-rose-500 to-pink-600"
          iconShadow="shadow-[0_0_18px_rgba(244,63,94,0.4)]"
          hoverClass="hover:card-glow-rose hover:border-rose-500/50"
          className="lg:col-span-3"
          delay={0.24}
        >
          <SubstitutionVisual />
        </BentoCard>
      </div>
    </div>
  );
}
