"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * §8 — Ambient Cursor Glow
 * A large, soft radial glow that trails the cursor with spring lag.
 * Completely non-interactive (pointer-events: none).
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
      className="fixed top-0 left-0 pointer-events-none z-[9990] w-[350px] h-[350px] rounded-full"
      style={{
        x,
        y,
        background:
          "radial-gradient(circle at center, rgba(14,165,233,0.13) 0%, rgba(99,102,241,0.06) 50%, transparent 70%)",
      }}
    />
  );
}
