"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Upload, Play, Download } from "lucide-react";

export function PremiumHowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track scroll progress through the container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const steps = [
    {
      number: "01",
      title: "Configure",
      description: "Upload your faculty, rooms, and workloads via CSV or the web form.",
      icon: Upload,
      activeRange: [0, 0.33],
    },
    {
      number: "02",
      title: "Generate",
      description: "The CP-SAT engine applies constraints to produce a conflict-free timetable.",
      icon: Play,
      activeRange: [0.33, 0.66],
    },
    {
      number: "03",
      title: "Export & Share",
      description: "Export to Excel, PDF, or push directly to Google Calendar.",
      icon: Download,
      activeRange: [0.66, 1],
    },
  ];

  return (
    <div id="how-it-works" className="mt-32 relative" ref={containerRef}>
      <div className="text-center mb-20">
        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
          From setup to schedule in 3 steps
        </h2>
        <p className="text-slate-400 text-lg">No training required. Start generating in minutes.</p>
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* The Track */}
        <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[1px] bg-slate-800" />
        
        {/* The Laser */}
        <motion.div 
          className="hidden md:block absolute top-[40px] left-[15%] h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
          style={{ 
            width: useTransform(scrollYProgress, [0, 1], ["0%", "70%"]),
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={idx}
                className="relative group text-center md:text-left flex flex-col items-center md:items-start"
              >
                {/* Monochromatic technical icon box */}
                <motion.div 
                  className="w-20 h-20 mb-8 rounded-2xl border border-slate-800 bg-slate-900/50 flex items-center justify-center transition-all duration-500 relative overflow-hidden"
                  style={{
                    borderColor: useTransform(
                      scrollYProgress,
                      [step.activeRange[0] - 0.1, step.activeRange[0], step.activeRange[1], step.activeRange[1] + 0.1],
                      ["rgba(30,41,59,1)", "rgba(56,189,248,0.5)", "rgba(56,189,248,0.5)", "rgba(30,41,59,1)"]
                    ) as any,
                    boxShadow: useTransform(
                      scrollYProgress,
                      [step.activeRange[0] - 0.1, step.activeRange[0], step.activeRange[1], step.activeRange[1] + 0.1],
                      ["0px 0px 0px transparent", "0px 0px 30px rgba(56,189,248,0.15)", "0px 0px 30px rgba(56,189,248,0.15)", "0px 0px 0px transparent"]
                    ) as any,
                  }}
                >
                  {/* Ambient idle pulse (always on) */}
                  <motion.div 
                    className="absolute inset-0 rounded-2xl border border-sky-500/10"
                    animate={{ opacity: [0.1, 0.5, 0.1] }}
                    transition={{ duration: 3 + idx * 0.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  
                  <Icon className="w-8 h-8 text-slate-400 group-hover:text-sky-400 transition-colors duration-300 relative z-10" />
                  
                  {/* Internal ambient glow that turns on when laser hits */}
                  <motion.div 
                    className="absolute inset-0 bg-sky-500/10 blur-xl"
                    style={{
                      opacity: useTransform(
                        scrollYProgress,
                        [step.activeRange[0] - 0.1, step.activeRange[0], step.activeRange[1], step.activeRange[1] + 0.1],
                        [0, 1, 1, 0]
                      )
                    }}
                  />
                </motion.div>

                <div className="flex flex-col items-center md:items-start">
                  <span className="text-xs uppercase font-mono tracking-widest text-slate-500 mb-4">
                    Step {step.number}
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 mb-3">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed max-w-[280px]">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
