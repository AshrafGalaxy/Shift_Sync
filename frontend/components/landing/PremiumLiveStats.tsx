"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useInView } from "framer-motion";

function TickerNumber({ value }: { value: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat("en-US").format(Math.floor(latest));
      }
    });
  }, [springValue]);

  return <span ref={ref}>0</span>;
}

export function PremiumLiveStats() {
  const stats = [
    { label: "Timetables Generated",        value: 500,   suffix: "+", color: "bg-sky-500" },
    { label: "Institutions Onboarded",      value: 30,    suffix: "+", color: "bg-teal-500" },
    { label: "Avg. Generation Time",        value: 42,    suffix: "s", color: "bg-violet-500" },
    { label: "Constraint Conflicts Resolved", value: 10000, suffix: "+", color: "bg-amber-500" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-800/50 rounded-2xl overflow-hidden mt-20 border border-slate-800/80">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="relative bg-slate-950 p-8 flex flex-col justify-center transition-colors hover:bg-slate-900/80 group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-2 h-2 rounded-full ${stat.color} shadow-[0_0_8px_currentColor] opacity-60 group-hover:opacity-100 transition-opacity`} />
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">{stat.label}</p>
          </div>
          <div className="text-4xl font-black text-slate-100 font-mono tracking-tight flex items-baseline gap-1">
            <TickerNumber value={stat.value} />
            <span className="text-2xl text-slate-500 font-sans">{stat.suffix}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
