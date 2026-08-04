"use client";

import React from "react";
import { motion } from "framer-motion";
import { Upload, Play, Download, LucideIcon } from "lucide-react";

/**
 * 12-second total infinite loop.
 * We use 6 stages, each taking 1.5s (12.5% of total time).
 */
const TOTAL_DURATION = 5;

interface StageTiming {
  start: number; // 0.0 to 1.0
  end: number;
}

const STAGES = {
  node1: { start: 0, end: 0.125 },
  track1: { start: 0.125, end: 0.25 },
  node2: { start: 0.25, end: 0.375 },
  track2: { start: 0.375, end: 0.5 },
  node3: { start: 0.5, end: 0.625 },
};

// Top and Bottom SVG paths for a 96x96 box with 16px border radius
// Starts left-middle (0, 48), goes up/down, to right-middle (96, 48)
const TOP_PATH = "M 0 48 L 0 16 Q 0 0 16 0 L 80 0 Q 96 0 96 16 L 96 48";
const BOTTOM_PATH = "M 0 48 L 0 80 Q 0 96 16 96 L 80 96 Q 96 96 96 80 L 96 48";

function NodeCircuit({ timing }: { timing: StageTiming }) {
  const { start, end } = timing;
  const length = end - start;
  
  // Break down the node stage into: appear/grow, travel, shrink/disappear
  const t0 = start;
  const t1 = start + length * 0.2;
  const t2 = start + length * 0.8;
  const t3 = end;

  const keyframeTimes = [0, t0, t1, t2, t3, 1];

  const pathLengthVariants: any = {
    animate: {
      pathLength: [0, 0, 0.4, 0.4, 0, 0],
      pathOffset: [0, 0, 0, 0.6, 1, 1],
      opacity:    [0, 0, 1, 1, 0, 0],
      transition: { duration: TOTAL_DURATION, times: keyframeTimes, repeat: Infinity, ease: "linear" as const }
    }
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 96 96" fill="none">
      <motion.path 
        d={TOP_PATH} stroke="#ffffff" strokeWidth="2" strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 6px #0ea5e9)" }}
        variants={pathLengthVariants} animate="animate"
      />
      <motion.path 
        d={BOTTOM_PATH} stroke="#ffffff" strokeWidth="2" strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 6px #0ea5e9)" }}
        variants={pathLengthVariants} animate="animate"
      />
    </svg>
  );
}

function TrackCircuit({ timing }: { timing: StageTiming }) {
  const { start, end } = timing;
  const length = end - start;
  
  const t0 = start;
  const t1 = start + length * 0.2;
  const t2 = start + length * 0.8;
  const t3 = end;

  const keyframeTimes = [0, t0, t1, t2, t3, 1];

  const trackVariants: any = {
    animate: {
      pathLength: [0, 0, 0.3, 0.3, 0, 0],
      pathOffset: [0, 0, 0, 0.7, 1, 1],
      opacity:    [0, 0, 1, 1, 0, 0],
      transition: { duration: TOTAL_DURATION, times: keyframeTimes, repeat: Infinity, ease: "linear" as const }
    }
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" preserveAspectRatio="none">
      <motion.line 
        x1="0%" y1="50%" x2="100%" y2="50%" 
        stroke="#ffffff" strokeWidth="2" strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 6px #0ea5e9)" }}
        variants={trackVariants} 
        animate="animate"
      />
    </svg>
  );
}

export function PremiumHowItWorks() {
  const steps: { number: string; title: string; description: string; icon: LucideIcon; timing: StageTiming }[] = [
    {
      number: "01", title: "Configure",
      description: "Upload your faculty, rooms, and workloads via CSV or the web form.",
      icon: Upload, timing: STAGES.node1
    },
    {
      number: "02", title: "Generate",
      description: "The CP-SAT engine applies constraints to produce a conflict-free timetable.",
      icon: Play, timing: STAGES.node2
    },
    {
      number: "03", title: "Export & Share",
      description: "Export to Excel, PDF, or push directly to Google Calendar.",
      icon: Download, timing: STAGES.node3
    },
  ];

  return (
    <div id="how-it-works" className="mt-32 relative">
      <div className="text-center mb-20 px-4">
        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
          From setup to schedule in 3 steps
        </h2>
        <p className="text-slate-400 text-lg">No training required. Start generating in minutes.</p>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        
        {/* Z-0: Background Tracks connecting the boxes */}
        {/* We place these absolutely between the columns */}
        <div className="hidden md:block absolute top-[48px] left-[16%] w-[34%] h-[2px] bg-slate-800 z-0" />
        <div className="hidden md:block absolute top-[48px] left-[16%] w-[34%] h-[20px] -mt-[9px] z-0">
           <TrackCircuit timing={STAGES.track1} />
        </div>

        <div className="hidden md:block absolute top-[48px] left-[50%] w-[34%] h-[2px] bg-slate-800 z-0" />
        <div className="hidden md:block absolute top-[48px] left-[50%] w-[34%] h-[20px] -mt-[9px] z-0">
           <TrackCircuit timing={STAGES.track2} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-20">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            
            // Generate a synchronized internal glow pulse matching the node timing
            const t0 = step.timing.start;
            const t1 = step.timing.start + 0.05;
            const t2 = step.timing.end - 0.05;
            const t3 = step.timing.end;
            const times = [0, t0, t1, t2, t3, 1];

            return (
              <div key={idx} className="relative flex flex-col items-center text-center">
                
                {/* 96x96 Container */}
                <div className="w-24 h-24 mb-8 relative flex items-center justify-center">
                  
                  {/* The solid physical box (Z-10 Content) */}
                  <div className="absolute inset-0 rounded-2xl border border-slate-800 bg-slate-950 z-10 flex items-center justify-center overflow-hidden">
                    {/* Subtle micro-circuit pin matrix (Always on) */}
                    <div 
                      className="absolute inset-0 opacity-20"
                      style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '8px 8px' }}
                    />

                    {/* Power-up node grid glow */}
                    <motion.div 
                      className="absolute inset-0"
                      style={{ backgroundImage: 'radial-gradient(rgba(56,189,248,0.5) 1px, transparent 1px)', backgroundSize: '8px 8px' }}
                      animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
                      transition={{ duration: TOTAL_DURATION, times, repeat: Infinity, ease: "linear" }}
                    />
                    
                    {/* Central Processor Core (Glows and expands when hit) */}
                    <motion.div 
                      className="absolute inset-0"
                      style={{ background: "radial-gradient(circle at center, rgba(56,189,248,0.3) 0%, transparent 65%)" }}
                      animate={{ opacity: [0, 0, 1, 1, 0, 0], scale: [0.5, 0.5, 1.2, 1.2, 0.5, 0.5] }}
                      transition={{ duration: TOTAL_DURATION, times, repeat: Infinity, ease: "linear" }}
                    />
                    
                    {/* The Icon itself, lighting up bright cyan when powered */}
                    <motion.div
                      animate={{ 
                        color: ["#94a3b8", "#94a3b8", "#38bdf8", "#38bdf8", "#94a3b8", "#94a3b8"],
                        filter: ["drop-shadow(0 0 0px transparent)", "drop-shadow(0 0 0px transparent)", "drop-shadow(0 0 10px rgba(56,189,248,0.8))", "drop-shadow(0 0 10px rgba(56,189,248,0.8))", "drop-shadow(0 0 0px transparent)", "drop-shadow(0 0 0px transparent)"]
                      }}
                      transition={{ duration: TOTAL_DURATION, times, repeat: Infinity, ease: "linear" }}
                      className="relative z-20"
                    >
                      <Icon className="w-8 h-8" />
                    </motion.div>
                  </div>

                  {/* Z-30: The Circuit Trace Layer (Renders OVER the solid box) */}
                  <NodeCircuit timing={step.timing} />
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xs uppercase font-mono tracking-widest text-slate-500 mb-4">
                    Step {step.number}
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 mb-3">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed max-w-[280px]">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
