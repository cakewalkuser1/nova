"use client";

import { useEffect, useRef } from "react";

export function GradientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    // Color palette matching Tailwind config
    const colors = {
      sage: { r: 123, g: 158, b: 135 },
      lavender: { r: 184, g: 169, b: 201 },
      rose: { r: 212, g: 165, b: 165 },
      cream: { r: 250, g: 249, b: 246 },
    };

    const drawGradient = () => {
      time += 0.002;

      // Create dynamic mesh gradient
      const gradient = ctx.createRadialGradient(
        canvas.width * (0.3 + Math.sin(time) * 0.1),
        canvas.height * (0.3 + Math.cos(time * 0.7) * 0.1),
        0,
        canvas.width * 0.5,
        canvas.height * 0.5,
        canvas.width * 0.8
      );

      // Animated color stops
      const sageAlpha = 0.15 + Math.sin(time * 1.2) * 0.05;
      const lavenderAlpha = 0.15 + Math.cos(time * 0.8) * 0.05;
      const roseAlpha = 0.1 + Math.sin(time * 0.5) * 0.03;

      gradient.addColorStop(0, `rgba(${colors.sage.r}, ${colors.sage.g}, ${colors.sage.b}, ${sageAlpha})`);
      gradient.addColorStop(0.3, `rgba(${colors.lavender.r}, ${colors.lavender.g}, ${colors.lavender.b}, ${lavenderAlpha})`);
      gradient.addColorStop(0.6, `rgba(${colors.rose.r}, ${colors.rose.g}, ${colors.rose.b}, ${roseAlpha})`);
      gradient.addColorStop(1, `rgba(${colors.cream.r}, ${colors.cream.g}, ${colors.cream.b}, 0)`);

      // Clear and fill background
      ctx.fillStyle = "#F0F4F1";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply gradient overlay
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Second animated gradient layer
      const gradient2 = ctx.createRadialGradient(
        canvas.width * (0.7 + Math.cos(time * 0.6) * 0.15),
        canvas.height * (0.6 + Math.sin(time * 0.9) * 0.1),
        0,
        canvas.width * 0.5,
        canvas.height * 0.5,
        canvas.width * 0.6
      );

      gradient2.addColorStop(0, `rgba(${colors.lavender.r}, ${colors.lavender.g}, ${colors.lavender.b}, ${lavenderAlpha * 0.5})`);
      gradient2.addColorStop(0.5, `rgba(${colors.sage.r}, ${colors.sage.g}, ${colors.sage.b}, ${sageAlpha * 0.3})`);
      gradient2.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationId = requestAnimationFrame(drawGradient);
    };

    drawGradient();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10"
        style={{ 
          background: "linear-gradient(135deg, #F0F4F1 0%, #E8E6F0 50%, #FAF9F6 100%)",
        }}
      />
      {/* Noise overlay for organic texture */}
      <div 
        className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
}
