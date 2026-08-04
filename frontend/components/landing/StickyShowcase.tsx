"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import {
  Upload,
  Cpu,
  BarChart3,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  CalendarRange,
  FileText,
  ChevronRight,
} from "lucide-react";

// ─── Section definitions ──────────────────────────────────────────────────────

const sections = [
  {
    id: "configure",
    step: "01",
    title: "Configure",
    headline: "Upload in seconds",
    description:
      "Import your faculty list, room inventory, and workload assignments via CSV or the interactive web form. Set constraints — no clashes, min/max lectures, lab continuity — in plain language.",
    icon: Upload,
    accent: "from-sky-500 to-blue-600",
    accentColor: "text-sky-400",
  },
  {
    id: "generate",
    step: "02",
    title: "Generate",
    headline: "42 seconds flat",
    description:
      "Click Generate. The CP-SAT engine evaluates thousands of constraint combinations and produces a provably optimal, conflict-free timetable — or tells you exactly which constraint is impossible.",
    icon: Cpu,
    accent: "from-sky-500 to-blue-600",
    accentColor: "text-sky-400",
  },
  {
    id: "analyze",
    step: "03",
    title: "Analyze",
    headline: "Real-time insights",
    description:
      "View your resource heatmap — see which faculty are overloaded, which rooms sit empty all week, and which time-slots are bottlenecks. Drill into any constraint conflict.",
    icon: BarChart3,
    accent: "from-sky-500 to-blue-600",
    accentColor: "text-sky-400",
  },
  {
    id: "export",
    step: "04",
    title: "Export & Share",
    headline: "Every format",
    description:
      "Export to Excel, PDF, or iCal — or push directly to Google Calendar. Every faculty member has their personal schedule on their phone the same day you generate.",
    icon: Download,
    accent: "from-sky-500 to-blue-600",
    accentColor: "text-sky-400",
  },
] as const;

// ─── Laser Animations ────────────────────────────────────────────────────────

// Starts at top-middle (24, 0), splits down left/right sides, meets at bottom-middle (24, 48)
// Uses exact circular arcs (A 16 16) to flawlessly match Tailwind's rounded-2xl (16px border-radius)
const PILL_LEFT_PATH = "M 24 0 L 16 0 A 16 16 0 0 0 0 16 L 0 32 A 16 16 0 0 0 16 48 L 24 48";
const PILL_RIGHT_PATH = "M 24 0 L 32 0 A 16 16 0 0 1 48 16 L 48 32 A 16 16 0 0 1 32 48 L 24 48";

function PillCircuit({ active }: { active: boolean }) {
  if (!active) return null;
  const pathLengthVariants: any = {
    animate: {
      pathLength: [0, 0.3, 0.3, 0],
      pathOffset: [0, 0, 0.7, 1],
      opacity:    [0, 1, 1, 0],
      transition: { duration: 2, repeat: Infinity, ease: "linear" }
    }
  };
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 48 48" fill="none">
      <motion.path 
        d={PILL_LEFT_PATH} stroke="#38bdf8" strokeWidth="2" strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 6px #0ea5e9)" }}
        variants={pathLengthVariants} animate="animate"
      />
      <motion.path 
        d={PILL_RIGHT_PATH} stroke="#38bdf8" strokeWidth="2" strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 6px #0ea5e9)" }}
        variants={pathLengthVariants} animate="animate"
      />
    </svg>
  );
}

import { MotionValue, useTransform } from "framer-motion";

function ScrollLine({ scrollYProgress, idx, total }: { scrollYProgress: MotionValue<number>; idx: number; total: number }) {
  // Each segment represents a chunk of the total scroll progress
  const start = idx * (1 / total);
  const end = (idx + 1) * (1 / total);
  const height = useTransform(scrollYProgress, [start, end], ["0%", "100%"]);
  
  return (
    <motion.div 
      className="absolute top-0 left-0 w-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)] origin-top"
      style={{ height }}
    />
  );
}

// ─── Right-panel visuals ─────────────────────────────────────────────────────

function ConfigureVisual({ active }: { active: boolean }) {
  const fields = [
    { label: "Faculty Name",    value: "Dr. Priya Sharma",     width: "w-4/5" },
    { label: "Subject Code",    value: "CS-301",               width: "w-2/5" },
    { label: "Weekly Lectures", value: "4",                    width: "w-1/4" },
    { label: "Lab Continuity",  value: "Yes — 2-slot blocks",  width: "w-3/4" },
  ];
  return (
    <div className="space-y-3">
      {fields.map((f, i) => (
        <motion.div
          key={f.label}
          initial={{ opacity: 0, x: 20 }}
          animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3"
        >
          <p className="text-[11px] text-slate-500 mb-1">{f.label}</p>
          <div className={`h-2 rounded-full bg-gradient-to-r from-sky-500/60 to-blue-600/60 ${f.width}`} />
          <p className="text-xs text-slate-300 mt-1.5 font-mono">{f.value}</p>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30"
      >
        <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
        <span className="text-xs text-sky-300">CSV validated — 42 faculty, 18 rooms, 156 workloads</span>
      </motion.div>
    </div>
  );
}

function GenerateVisual({ active }: { active: boolean }) {
  const rows = [
    ["from-sky-500 to-blue-600",     null,                          "from-violet-500 to-purple-600"],
    [null,                            "from-teal-500 to-cyan-600",   "from-teal-500 to-cyan-600"  ],
    ["from-sky-500 to-blue-600",     "from-amber-500 to-orange-500", null                         ],
    ["from-violet-500 to-purple-600", null,                          "from-sky-500 to-blue-600"   ],
    [null,                            "from-rose-500 to-pink-600",   "from-amber-500 to-orange-500"],
  ] as (string | null)[][];

  return (
    <div className="space-y-3">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {rows.flatMap((row, ri) =>
          row.map((color, ci) =>
            color ? (
              <motion.div
                key={`${ri}-${ci}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                transition={{ delay: (ri * 3 + ci) * 0.04, type: "spring", stiffness: 280 }}
                className={`h-9 rounded-lg bg-gradient-to-br ${color} border border-white/10`}
              />
            ) : (
              <div key={`${ri}-${ci}`} className="h-9 rounded-lg bg-slate-800/50 border border-slate-700/40" />
            )
          )
        )}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <span className="inline-flex items-center gap-2 text-sm text-teal-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          Generated in 42s — 0 conflicts
        </span>
      </motion.div>
    </div>
  );
}

function AnalyzeVisual({ active }: { active: boolean }) {
  const labels = ["Dr. Sharma", "Prof. Mehta", "Ms. Joshi", "Dr. Rao"];
  const intensities = [
    [0.9, 0.2, 0.8, 0.5, 0.4],
    [0.1, 0.7, 0.6, 0.3, 0.9],
    [0.6, 0.5, 0.1, 0.8, 0.2],
    [0.4, 0.9, 0.3, 0.7, 0.5],
  ];

  const getColor = (v: number) =>
    v > 0.7
      ? "bg-rose-500/70"
      : v > 0.4
      ? "bg-amber-500/60"
      : "bg-teal-500/50";

  return (
    <div className="space-y-2">
      {labels.map((label, ri) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, x: -10 }}
          animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
          transition={{ delay: ri * 0.08 }}
          className="flex items-center gap-2"
        >
          <span className="text-[11px] text-slate-500 w-20 flex-shrink-0 text-right">{label}</span>
          <div className="flex gap-1 flex-1">
            {intensities[ri].map((v, ci) => (
              <motion.div
                key={ci}
                initial={{ scaleY: 0 }}
                animate={active ? { scaleY: 1 } : { scaleY: 0 }}
                transition={{ delay: ri * 0.08 + ci * 0.03, type: "spring" }}
                style={{ transformOrigin: "bottom" }}
                className={`flex-1 h-7 rounded-md ${getColor(v)}`}
              />
            ))}
          </div>
        </motion.div>
      ))}
      <div className="flex justify-end gap-3 mt-1">
        {[["rose", "High"], ["amber", "Medium"], ["teal", "Low"]].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className={`w-2 h-2 rounded-sm bg-${c}-500/60`} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function ExportVisual({ active }: { active: boolean }) {
  const formats = [
    { icon: FileSpreadsheet, label: "Excel (.xlsx)", color: "text-teal-400",  bg: "bg-teal-500/10  border-teal-500/30" },
    { icon: FileText,        label: "PDF",           color: "text-red-400",   bg: "bg-red-500/10   border-red-500/30"  },
    { icon: CalendarRange,   label: "iCal (.ics)",   color: "text-sky-400",   bg: "bg-sky-500/10   border-sky-500/30"  },
    { icon: CalendarRange,   label: "Google Cal",    color: "text-green-400", bg: "bg-green-500/10 border-green-500/30"},
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {formats.map(({ icon: Icon, label, color, bg }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
          className={`flex items-center gap-2.5 p-3 rounded-xl border ${bg} cursor-default`}
        >
          <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
          <span className={`text-xs font-medium ${color}`}>{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * §2 — Sticky Scroll Storytelling
 * Container is 4 × 100vh tall. The inner panel sticks at top: 0 / h-screen.
 * Left: section nav (active highlight + gradient indicator).
 * Right: swaps animated visual per active section.
 */
export function StickyShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(
      Math.floor(v * sections.length),
      sections.length - 1
    );
    setActiveIdx(idx);
  });

  const activeSection = sections[activeIdx];
  const Icon = activeSection.icon;

  return (
    <div
      id="how-it-works"
      ref={containerRef}
      style={{ height: `${sections.length * 100}vh` }}
      className="relative mt-20"
    >
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Section label */}
          <motion.p
            key={activeIdx + "label"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs uppercase tracking-widest text-slate-600 font-semibold mb-6 text-center lg:text-left"
          >
            How ShiftSync works
          </motion.p>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* ── Left: navigation ── */}
            <div className="relative order-2 lg:order-1 pl-4 lg:pl-0">
              <div className="relative z-10">
              {sections.map((sec, idx) => {
                const SIcon = sec.icon;
                const isActive = idx === activeIdx;
                return (
                  <div
                    key={sec.id}
                    className={`flex gap-6 lg:gap-8 items-stretch relative z-10 ${idx < sections.length - 1 ? 'pb-12' : ''}`}
                  >
                    {/* Step pill and connecting segment */}
                    <div className="w-12 flex flex-col items-center flex-shrink-0 hidden lg:flex relative z-20">
                      <motion.div
                        animate={{
                          scale: isActive ? 1.15 : 1,
                        }}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? `bg-gradient-to-br ${sec.accent} shadow-[0_0_24px_rgba(14,165,233,0.5)] ring-1 ring-white/20`
                            : "bg-slate-800/50 backdrop-blur-md border border-slate-700/50 shadow-lg"
                        }`}
                      >
                        <SIcon className={`w-5 h-5 transition-colors duration-500 ${isActive ? "text-white" : "text-slate-500"}`} />
                        <PillCircuit active={isActive} />
                      </motion.div>

                      {/* Line Segment behind the Icons */}
                      {idx < sections.length - 1 && (
                        <div 
                          className="absolute w-[2px] bg-slate-800/80 z-0 overflow-hidden"
                          style={{ top: '24px', bottom: '-24px', left: '50%', transform: 'translateX(-50%)' }}
                        >
                          <ScrollLine scrollYProgress={scrollYProgress} idx={idx} total={sections.length} />
                        </div>
                      )}
                    </div>

                    {/* Text */}
                    <motion.div 
                      className="pb-4"
                      animate={{ opacity: isActive ? 1 : 0.4 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-mono font-bold ${isActive ? sec.accentColor : "text-slate-600"}`}>
                          {sec.step}
                        </span>
                        <span className={`font-bold text-base ${isActive ? "text-slate-100" : "text-slate-500"}`}>
                          {sec.title}
                        </span>
                      </div>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <p className={`text-3xl lg:text-4xl font-black mb-4 gradient-sky-text`}>{sec.headline}</p>
                          <p className="text-slate-300 text-base lg:text-lg leading-relaxed max-w-md">{sec.description}</p>
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

            {/* ── Right: animated visual ── */}
            <div className="order-1 lg:order-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIdx}
                  initial={{ opacity: 0, x: 30, filter: "blur(8px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -30, filter: "blur(8px)" }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="bg-slate-900/40 border border-slate-700/60 rounded-3xl p-8 lg:p-12 shadow-[0_0_80px_rgba(14,165,233,0.1)] w-full h-[400px] lg:h-[500px] flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-xl"
                >
                  {/* Visual header */}
                  <div className="absolute top-8 left-8 flex items-center gap-3 z-20">
                    <Icon className={`w-5 h-5 ${activeSection.accentColor}`} />
                    <span className="text-sm uppercase tracking-widest text-slate-300 font-bold">{activeSection.title}</span>
                  </div>

                  {/* Responsive fluid content visual */}
                  <div className="w-full max-w-full z-10 relative px-2 lg:px-4 flex items-center justify-center">
                    <div className="w-full max-w-sm lg:max-w-md">
                      {activeIdx === 0 && <ConfigureVisual active />}
                      {activeIdx === 1 && <GenerateVisual active />}
                      {activeIdx === 2 && <AnalyzeVisual active />}
                      {activeIdx === 3 && <ExportVisual active />}
                    </div>
                  </div>
                  
                  {/* Ambient Glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${activeSection.accent} opacity-5 blur-3xl`} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

