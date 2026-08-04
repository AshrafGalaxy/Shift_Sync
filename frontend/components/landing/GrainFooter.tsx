"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * §3 — Grain Footer Brand
 * "ShiftSync" in large display type with a mouse-tracking radial gradient
 * and a grain texture overlay using mix-blend-mode for that premium feel.
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
        {/* Radial ambient behind the text */}
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
          className="relative"
        >
          {/* Grain-texture headline — CSS approach: grain overlay div on top */}
          <div className="relative inline-block select-none">
            <h2
              className="font-black leading-none tracking-tighter"
              style={{
                fontSize: "clamp(3.5rem, 12vw, 9rem)",
                background:
                  "radial-gradient(ellipse at var(--mx, 50%) var(--my, 50%), #7dd3fc 0%, #38bdf8 25%, #818cf8 55%, #4f46e5 80%, #1e1b4b 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ShiftSync
            </h2>
            {/* Grain texture overlay on the text area */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none rounded-sm"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
                backgroundSize: "160px 160px",
                opacity: 0.18,
                mixBlendMode: "overlay",
              }}
            />
          </div>

          <p className="text-slate-500 text-base mt-3 mb-8">
            Intelligent timetable management for Indian engineering colleges.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link href="/register">
            <Button className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-sky-600/20 px-8 h-11 text-sm">
              Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white h-11 text-sm">
              Sign In
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* ── Links grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-slate-800/70">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(14,165,233,0.25)]">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-slate-200">ShiftSync</span>
            </div>
            <p className="text-xs text-slate-500">Built with ❤️ for Indian engineering colleges.</p>
          </div>

          <div>
            <p className="font-semibold text-sm text-slate-300 mb-3">Product</p>
            <ul className="space-y-2 text-sm text-slate-500">
              {["Features", "How it Works", "Pricing"].map((l) => (
                <li key={l}><a href={`#${l.toLowerCase().replace(/ /g, "-")}`} className="hover:text-slate-200 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-semibold text-sm text-slate-300 mb-3">Resources</p>
            <ul className="space-y-2 text-sm text-slate-500">
              {["Documentation", "Guide", "FAQ"].map((l) => (
                <li key={l}><a href="#" className="hover:text-slate-200 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-semibold text-sm text-slate-300 mb-3">Legal</p>
            <ul className="space-y-2 text-sm text-slate-500">
              {["Privacy Policy", "Terms of Service"].map((l) => (
                <li key={l}><a href="#" className="hover:text-slate-200 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/70 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between">
          <p className="text-xs text-slate-600">© 2026 ShiftSync. All rights reserved.</p>
          <div className="flex gap-5 mt-3 md:mt-0">
            {["GitHub", "Twitter", "LinkedIn"].map((l) => (
              <a key={l} href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
