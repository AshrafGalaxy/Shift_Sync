"use client";

/**
 * §1 — Grain Texture Overlay
 * A fixed SVG-noise overlay at ~3.5% opacity that gives the dark page
 * physical material depth — just barely visible, subconsciously felt.
 */
export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[9980]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "220px 220px",
        backgroundRepeat: "repeat",
        opacity: 0.036,
        mixBlendMode: "overlay",
      }}
    />
  );
}
