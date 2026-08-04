"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "empty" | "generating" | "complete";

const COURSES = [
  { code: "CS301",   color: "from-sky-500 to-blue-600" },
  { code: "ML_LAB",  color: "from-teal-500 to-cyan-600" },
  { code: "DMS_TUT", color: "from-violet-500 to-purple-600" },
  { code: "OS_LAB",  color: "from-rose-500 to-pink-600" },
  { code: "MATH_II", color: "from-amber-500 to-orange-500" },
];

const DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TIMES = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM"];

/**
 * Fixed timetable grid layout — no Math.random(), SSR-safe.
 * Each entry is [dayIdx, timeIdx, courseIdx].
 */
const FINAL_GRID: [number, number, number][] = [
  [0, 0, 0], [0, 1, 0], [0, 3, 1], [0, 5, 2], [0, 7, 3],
  [1, 0, 1], [1, 2, 0], [1, 4, 4], [1, 6, 2],
  [2, 1, 3], [2, 2, 3], [2, 4, 0], [2, 6, 1],
  [3, 0, 2], [3, 3, 4], [3, 5, 0], [3, 7, 1],
  [4, 0, 0], [4, 2, 2], [4, 4, 3], [4, 6, 4],
];

/**
 * §10 — Morphing Timetable Demo
 * Cycles through three phases:
 *  1. Empty  — blank grid, "awaiting generation"
 *  2. Generating — cells fill one by one (CP-SAT solving animation)
 *  3. Complete — full grid, "Generated in 42s" badge
 * Then loops back silently.
 */
export function MorphingTimetable() {
  const [phase, setPhase]               = useState<Phase>("empty");
  const [visibleCells, setVisibleCells] = useState(0);
  const [showBadge, setShowBadge]       = useState(false);

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];

    const runCycle = () => {
      setPhase("empty");
      setVisibleCells(0);
      setShowBadge(false);

      // 1.8 s in empty state, then start generating
      timers.push(setTimeout(() => {
        setPhase("generating");

        // Fill each cell with a staggered delay
        FINAL_GRID.forEach((_, idx) => {
          timers.push(setTimeout(() => {
            setVisibleCells(idx + 1);
          }, idx * 110));
        });

        const fillDuration = FINAL_GRID.length * 110;

        // Complete state after all cells are filled
        timers.push(setTimeout(() => {
          setPhase("complete");
          setShowBadge(true);
        }, fillDuration + 350));

        // Restart cycle after 4 s in complete state
        timers.push(setTimeout(runCycle, fillDuration + 4500));
      }, 1800));
    };

    runCycle();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.6 }}
      className="mt-20 rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-5 max-w-4xl mx-auto shadow-[0_0_80px_rgba(14,165,233,0.06)]"
    >
      {/* Status bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full transition-colors duration-500 ${
              phase === "empty"
                ? "bg-slate-600"
                : phase === "generating"
                ? "bg-amber-400 animate-pulse"
                : "bg-teal-400"
            }`}
          />
          <span className="text-xs text-slate-500 font-medium tracking-wide">
            {phase === "empty"
              ? "Awaiting generation…"
              : phase === "generating"
              ? "CP-SAT solver running…"
              : "Conflict-free timetable ready"}
          </span>
        </div>
        {phase === "generating" && (
          <span className="text-xs text-amber-400/80 font-mono tabular-nums">
            {visibleCells} / {FINAL_GRID.length} slots
          </span>
        )}
      </div>

      {/* Grid */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "3.5rem repeat(5, 1fr)" }}
      >
        {/* Header row */}
        <div />
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-slate-400 pb-1.5">
            {d}
          </div>
        ))}

        {/* Body */}
        {TIMES.flatMap((time, timeIdx) => [
          <div
            key={`label-${timeIdx}`}
            className="text-[11px] text-slate-600 flex items-center h-10 pr-1"
          >
            {time}
          </div>,
          ...DAYS.map((_, dayIdx) => {
            const cellIdx = FINAL_GRID.findIndex(
              ([d, t]) => d === dayIdx && t === timeIdx
            );
            const isVisible =
              cellIdx !== -1 &&
              (phase === "complete" ||
                (phase === "generating" && cellIdx < visibleCells));
            const course =
              cellIdx !== -1 ? COURSES[FINAL_GRID[cellIdx][2]] : null;
            const isJustFilled =
              phase === "generating" && cellIdx === visibleCells - 1;

            return (
              <div key={`cell-${dayIdx}-${timeIdx}`} className="h-10 relative">
                <AnimatePresence>
                  {isVisible && course ? (
                    <motion.div
                      key="filled"
                      initial={{ opacity: 0, scale: 0.55 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.55 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      className={`absolute inset-0 rounded-lg bg-gradient-to-br ${course.color} flex items-center justify-center text-[10px] font-bold text-white select-none ${
                        isJustFilled
                          ? "ring-2 ring-white/40 shadow-[0_0_18px_rgba(14,165,233,0.55)]"
                          : ""
                      }`}
                    >
                      {course.code}
                    </motion.div>
                  ) : (
                    <div
                      key="empty"
                      className="absolute inset-0 rounded-lg bg-slate-800/50 border border-slate-700/40"
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          }),
        ])}
      </div>

      {/* Generation badge container (fixed height to prevent layout shift) */}
      <div className="h-10 flex items-center justify-center mt-2">
        <AnimatePresence>
          {showBadge && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <span className="inline-flex items-center gap-2 text-sm text-teal-400 font-medium tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Conflict-free timetable generated in 42s
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
