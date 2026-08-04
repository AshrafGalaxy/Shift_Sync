"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar, Github, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticleText } from "./ParticleText";

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
    <footer className="mt-32 border-t border-slate-800/70 bg-slate-950 overflow-hidden">
      {/* ── Brand hero area ── */}
      <div
        ref={containerRef}
        className="relative py-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center overflow-hidden"
        style={{ "--mx": "50%", "--my": "50%" } as React.CSSProperties}
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
            <Button className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-sky-600/20 px-8 h-12 text-sm font-semibold rounded-full transition-transform hover:scale-105 active:scale-95">
              Start Building Now <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white px-8 h-12 text-sm font-semibold rounded-full transition-transform hover:scale-105 active:scale-95">
              Sign in to Dashboard
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* ── Standard footer links ── */}
      <div className="border-t border-slate-800/70 bg-slate-950/80 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(14,165,233,0.3)]">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-slate-100 tracking-tight">ShiftSync</span>
              </div>
              <p className="text-sm text-slate-500">Engineered for absolute optimal efficiency.</p>
            </div>
            <div>
              <p className="font-semibold mb-4 text-sm text-slate-200">Product</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-sky-400 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-sky-400 transition-colors">How it Works</a></li>
                <li><a href="#pricing" className="hover:text-sky-400 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-4 text-sm text-slate-200">Resources</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-sky-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Guide</a></li>
                <li><a href="#faq" className="hover:text-sky-400 transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-4 text-sm text-slate-200">Legal</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-sky-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800/70 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">© 2026 ShiftSync. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-slate-400 hover:text-sky-400 transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-sky-400 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-sky-400 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
