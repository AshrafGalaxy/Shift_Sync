"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface PremiumLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function PremiumLink({ href, children, className = "" }: PremiumLinkProps) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden inline-flex whitespace-nowrap transition-colors ${className}`}
    >
      <motion.div
        className="flex flex-col relative"
        initial="initial"
        whileHover="hover"
      >
        <motion.span
          variants={{
            initial: { y: 0 },
            hover: { y: "100%", opacity: 0 },
          }}
          transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
          className="flex items-center"
        >
          {children}
        </motion.span>
        <motion.span
          variants={{
            initial: { y: "-100%", position: "absolute", opacity: 0 },
            hover: { y: 0, position: "absolute", opacity: 1 },
          }}
          transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
          className="flex items-center text-sky-400 font-medium w-full h-full"
        >
          {children}
        </motion.span>
      </motion.div>
    </Link>
  );
}
