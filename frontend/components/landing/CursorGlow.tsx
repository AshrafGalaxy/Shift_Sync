"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * §8 — Ambient Cursor Glow
 * A large, soft radial glow that trails the cursor with spring lag.
 * Completely non-interactive (pointer-events: none).
 * Updated: Now features a moving, tactile SVG grain mask.
 */
export function CursorGlow() {
  const rawX = useMotionValue(-400);
  const rawY = useMotionValue(-400);

  const springConfig = { stiffness: 55, damping: 22, mass: 0.4 };
  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      rawX.set(e.clientX - 175);
      rawY.set(e.clientY - 175);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [rawX, rawY]);

  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 pointer-events-none z-[9990] w-[350px] h-[350px] rounded-full overflow-hidden"
      style={{
        x,
        y,
        background:
          "radial-gradient(circle at center, rgba(14,165,233,0.18) 0%, rgba(99,102,241,0.08) 50%, transparent 70%)",
      }}
    >
      {/* Moving SVG noise mask mapped only to the glow */}
      <div 
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
          backgroundSize: "100px 100px",
          // The background-position animates in CSS below if we add a style, or we can just rely on static texture moving with the cursor
        }}
      />
    </motion.div>
  );
}
