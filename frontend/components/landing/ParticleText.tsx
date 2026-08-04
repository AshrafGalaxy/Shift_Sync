"use client";

import React, { useRef, useEffect, useState } from "react";

interface ParticleTextProps {
  text: string;
}

class Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  density: number;
  color: string;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.size = Math.random() * 1.5 + 0.5;
    this.density = Math.random() * 30 + 1;
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  update(mouse: { x: number; y: number; radius: number }) {
    let dx = mouse.x - this.x;
    let dy = mouse.y - this.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    
    // Repel force
    let forceDirectionX = dx / distance;
    let forceDirectionY = dy / distance;
    let maxDistance = mouse.radius;
    let force = (maxDistance - distance) / maxDistance;
    let directionX = forceDirectionX * force * this.density;
    let directionY = forceDirectionY * force * this.density;

    if (distance < mouse.radius) {
      this.x -= directionX;
      this.y -= directionY;
    } else {
      // Spring back to base position
      if (this.x !== this.baseX) {
        let dx = this.x - this.baseX;
        this.x -= dx / 10;
      }
      if (this.y !== this.baseY) {
        let dy = this.y - this.baseY;
        this.y -= dy / 10;
      }
    }
  }
}

export function ParticleText({ text }: ParticleTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Fallback to static gradient text on mobile for performance
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsMobile(true);
    }
  }, []);

  useEffect(() => {
    if (isMobile) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let particlesArray: Particle[] = [];
    let animationFrameId: number;

    const mouse = {
      x: -1000,
      y: -1000,
      radius: 120, // Interaction radius
    };

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      // Increase resolution for crispness
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(2, 2);
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const init = () => {
      particlesArray = [];
      const width = canvas.width / 2;
      const height = canvas.height / 2;

      // Draw text to read pixels
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Dynamically measure and fit text to the canvas
      // Start with a large font and scale down until it fits with 10% padding
      let fontSize = 200;
      const padding = width * 0.1;
      const maxTextWidth = width - padding * 2;
      const maxTextHeight = height * 0.75; // Max 75% of container height to strictly prevent vertical clipping
      
      // Inherit the exact brand font from the page body to guarantee cohesive typography
      const computedFont = getComputedStyle(document.body).fontFamily;
      const fontFamily = computedFont || "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
      
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      let textMetrics = ctx.measureText(text);
      let textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
      
      while ((textMetrics.width > maxTextWidth || textHeight > maxTextHeight) && fontSize > 10) {
        fontSize -= 2;
        ctx.font = `900 ${fontSize}px ${fontFamily}`;
        textMetrics = ctx.measureText(text);
        textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
      }
      
      // Text gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#7dd3fc"); // sky-300
      gradient.addColorStop(0.3, "#38bdf8"); // sky-400
      gradient.addColorStop(0.6, "#818cf8"); // indigo-400
      gradient.addColorStop(1, "#4f46e5"); // indigo-600
      
      ctx.fillStyle = gradient;
      // Draw exactly in the center
      ctx.fillText(text, width / 2, height / 2);

      const textCoordinates = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Step determines particle density (lower = more particles)
      const step = 8; // Double the step because we are iterating over the 2x scaled buffer
      
      for (let y = 0, y2 = textCoordinates.height; y < y2; y += step) {
        for (let x = 0, x2 = textCoordinates.width; x < x2; x += step) {
          // Check opacity of pixel
          if (textCoordinates.data[(y * 4 * textCoordinates.width) + (x * 4) + 3] > 128) {
            let positionX = x / 2; // Map back to CSS pixel space
            let positionY = y / 2;
            // Get color from gradient pixel
            let r = textCoordinates.data[(y * 4 * textCoordinates.width) + (x * 4)];
            let g = textCoordinates.data[(y * 4 * textCoordinates.width) + (x * 4) + 1];
            let b = textCoordinates.data[(y * 4 * textCoordinates.width) + (x * 4) + 2];
            let color = `rgb(${r},${g},${b})`;
            
            particlesArray.push(new Particle(positionX, positionY, color));
          }
        }
      }

      // Add ambient scatter dust across the entire canvas for depth
      const numDust = 200;
      for (let i = 0; i < numDust; i++) {
         let px = Math.random() * width;
         let py = Math.random() * height;
         particlesArray.push(new Particle(px, py, "rgba(255,255,255,0.15)"));
      }
    };

    const animate = () => {
      const width = canvas.width / 2;
      const height = canvas.height / 2;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].draw(ctx);
        particlesArray[i].update(mouse);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    // Delay init slightly to ensure fonts are loaded
    document.fonts.ready.then(() => {
      handleResize();
      animate();
    });

    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [text, isMobile]);

  if (isMobile) {
    return (
      <h2
        className="font-black leading-none tracking-tighter"
        style={{
          fontSize: "clamp(3.5rem, 12vw, 9rem)",
          background: "linear-gradient(135deg, #7dd3fc 0%, #38bdf8 30%, #818cf8 70%, #4f46e5 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {text}
      </h2>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-[1200px] h-[150px] md:h-[250px] lg:h-[350px] mx-auto relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-default z-10"
        style={{ touchAction: "none" }}
      />
      {/* Fallback readable text for screen readers */}
      <span className="sr-only">{text}</span>
    </div>
  );
}
