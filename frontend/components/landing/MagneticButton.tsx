"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  /** 0–1 multiplier for how strongly the button follows the cursor. Default 0.28 */
  strength?: number;
}

/**
 * §6 — Magnetic Button
 * Wraps any child element and makes it drift toward the cursor on hover,
 * snapping back with a spring on mouse leave.
 */
export function MagneticButton({
  children,
  className,
  strength = 0.28,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const x = useSpring(rawX, { stiffness: 180, damping: 14, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 180, damping: 14, mass: 0.6 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    rawX.set((e.clientX - rect.left - rect.width / 2) * strength);
    rawY.set((e.clientY - rect.top - rect.height / 2) * strength);
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
}
