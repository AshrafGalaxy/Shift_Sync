"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface PremiumButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
}

export function PremiumButton({
  children,
  icon,
  className,
  variant = "primary",
  ...props
}: PremiumButtonProps) {
  return (
    <motion.button
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative group overflow-hidden rounded-full font-semibold transition-all duration-300",
        "h-12 px-6 text-sm flex items-center justify-center gap-2",
        variant === "primary"
          ? "bg-slate-900 text-slate-300 border border-slate-700/80 hover:text-white hover:border-slate-500 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
          : "bg-transparent text-slate-400 border border-transparent hover:text-slate-200",
        className
      )}
      {...props}
    >
      {/* Linear-style angled light beam sweep */}
      {variant === "primary" && (
        <motion.div
          className="absolute inset-0 z-0 bg-[linear-gradient(110deg,transparent,45%,rgba(255,255,255,0.1),55%,transparent)] bg-[length:250%_100%]"
          initial={{ backgroundPosition: "150% 50%" }}
          variants={{
            hover: {
              backgroundPosition: "-50% 50%",
              transition: { duration: 0.8, ease: "easeInOut" },
            },
          }}
        />
      )}

      {/* Button Content */}
      <div className="relative z-10 flex items-center gap-2">
        <span>{children}</span>
        {icon && (
          <motion.div
            variants={{
              hover: { x: 4, transition: { duration: 0.3, ease: "easeOut" } },
            }}
          >
            {icon}
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}
