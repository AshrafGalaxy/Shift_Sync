"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar, Github, Twitter, Linkedin } from "lucide-react";
import { ParticleText } from "./ParticleText";
import { PremiumButton } from "./PremiumButton";
import { PremiumLink } from "./PremiumLink";

/**
 * §3 — Premium Interactive Footer
 * Features a high-end HTML5 Canvas particle physics engine for the brand text,
 * paired with mathematical/deterministic SaaS copywriting.
 */
export function GrainFooter() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <footer className="mt-0 bg-slate-950 overflow-hidden relative">
      {/* ── Brand hero area ── */}
      <div
        ref={containerRef}
        className="relative py-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center overflow-hidden"
        style={{ 
          "--mx": "50%", 
          "--my": "50%",
          maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)"
        } as React.CSSProperties}
      >
        {/* Radial ambient background tracking mouse */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at var(--mx, 50%) var(--my, 50%), rgba(14,165,233,0.07) 0%, rgba(99,102,241,0.04) 50%, transparent 100%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative w-full flex flex-col items-center"
        >
          {/* Particle Physics Text Simulation */}
          <div className="w-full mb-6">
            <ParticleText text="ShiftSync" />
          </div>

          {/* Upgraded Premium Copywriting */}
          <p className="text-slate-400 text-lg md:text-xl font-medium tracking-tight max-w-2xl mx-auto mb-10">
            Deterministic scheduling infrastructure for modern educational institutions.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center gap-4 relative z-20"
        >
          <Link href="/register">
            <PremiumButton icon={<ArrowRight className="w-4 h-4" />}>
              Start Building Now
            </PremiumButton>
          </Link>
          <Link href="/login">
            <PremiumButton variant="secondary">
              Sign in to Dashboard
            </PremiumButton>
          </Link>
        </motion.div>
      </div>

      {/* ── Premium Glassmorphic Link Grid ── */}
      <div className="relative z-20 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto rounded-[2.5rem] bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-10 lg:p-14 shadow-2xl relative overflow-hidden">
          {/* Subtle top inner gradient border */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="font-black text-2xl tracking-tight text-white drop-shadow-md">ShiftSync</span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-xs mb-8">
                Engineered for absolute optimal efficiency. Replacing manual spreadsheets with deterministic constraint programming.
              </p>
              
              <div className="flex gap-4">
                <a href="#" className="relative group w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-sky-500/50 transition-all duration-300">
                  <div className="absolute inset-0 rounded-full bg-sky-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Github className="w-4 h-4 relative z-10" />
                </a>
                <a href="#" className="relative group w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-blue-400/50 transition-all duration-300">
                  <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Twitter className="w-4 h-4 relative z-10" />
                </a>
                <a href="#" className="relative group w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-blue-600/50 transition-all duration-300">
                  <div className="absolute inset-0 rounded-full bg-blue-600/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Linkedin className="w-4 h-4 relative z-10" />
                </a>
              </div>
            </div>
            
            <div>
              <p className="font-bold mb-6 text-xs text-slate-500 uppercase tracking-[0.2em]">Product</p>
              <ul className="space-y-4 text-sm text-slate-300 font-medium">
                <li><PremiumLink href="#features">Features</PremiumLink></li>
                <li><PremiumLink href="#how-it-works">How it Works</PremiumLink></li>
                <li><PremiumLink href="#pricing">Pricing</PremiumLink></li>
                <li><PremiumLink href="#changelog">Changelog</PremiumLink></li>
              </ul>
            </div>
            
            <div>
              <p className="font-bold mb-6 text-xs text-slate-500 uppercase tracking-[0.2em]">Resources</p>
              <ul className="space-y-4 text-sm text-slate-300 font-medium">
                <li><PremiumLink href="#">Documentation</PremiumLink></li>
                <li><PremiumLink href="#">Integration Guide</PremiumLink></li>
                <li><PremiumLink href="#faq">FAQ</PremiumLink></li>
                <li><PremiumLink href="#">API Reference</PremiumLink></li>
              </ul>
            </div>
            
            <div>
              <p className="font-bold mb-6 text-xs text-slate-500 uppercase tracking-[0.2em]">Legal</p>
              <ul className="space-y-4 text-sm text-slate-300 font-medium">
                <li><PremiumLink href="#">Privacy Policy</PremiumLink></li>
                <li><PremiumLink href="#">Terms of Service</PremiumLink></li>
                <li><PremiumLink href="#">Security</PremiumLink></li>
              </ul>
            </div>
          </div>

          <div className="mt-14 pt-8 border-t border-slate-800/60 flex flex-col md:flex-row items-center justify-between text-slate-500 text-xs font-medium">
            <p>© 2026 ShiftSync Inc. All rights reserved.</p>
            <p className="mt-2 md:mt-0">Designed in India. Built for the World.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
