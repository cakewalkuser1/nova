"use client";

import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "light" | "dark" | "colored";
  color?: "sage" | "lavender" | "rose";
  animate?: boolean;
}

export function GlassCard({ 
  children, 
  className = "", 
  variant = "light",
  color = "sage",
  animate = false 
}: GlassCardProps) {
  const baseStyles = "rounded-2xl backdrop-blur-[20px] border transition-all duration-300";
  
  const variantStyles = {
    light: "bg-white/70 border-white/40 shadow-lg shadow-black/5",
    dark: "bg-textPrimary/5 border-white/20 shadow-lg shadow-black/10",
    colored: {
      sage: "bg-sage-muted border-sage/30 shadow-lg shadow-sage/10",
      lavender: "bg-lavender-muted border-lavender/30 shadow-lg shadow-lavender/10",
      rose: "bg-rose-muted border-rose/30 shadow-lg shadow-rose/10",
    }[color],
  };

  const animationClass = animate ? "animate-slide-up" : "";

  return (
    <div 
      className={`${baseStyles} ${variantStyles} ${animationClass} ${className}`}
      style={{
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {children}
    </div>
  );
}

// Specialized card variants for common use cases
export function MessageCard({ 
  children, 
  type = "default",
  className = "" 
}: { 
  children: ReactNode; 
  type?: "user" | "nova" | "reminder" | "nudge" | "checkin";
  className?: string;
}) {
  const typeStyles = {
    user: "bg-sage-muted border-sage/30 rounded-bubble rounded-tl-none",
    nova: "bg-white/60 border-white/40 rounded-bubble rounded-tr-none",
    reminder: "bg-sage-muted border-sage/40 rounded-bubble rounded-tr-none border-l-4",
    nudge: "bg-lavender-muted border-lavender/40 rounded-bubble rounded-tr-none border-l-4",
    checkin: "bg-rose-muted border-rose/40 rounded-bubble rounded-tr-none shadow-rose/20 shadow-lg",
  };

  return (
    <div 
      className={`backdrop-blur-[12px] px-5 py-3.5 ${typeStyles[type]} ${className}`}
      style={{ WebkitBackdropFilter: "blur(12px)" }}
    >
      {children}
    </div>
  );
}

export function SectionCard({ 
  children, 
  title,
  icon,
  className = "" 
}: { 
  children: ReactNode; 
  title?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard className={`overflow-hidden ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/20">
          {icon && <span className="text-sage">{icon}</span>}
          {title && <h3 className="font-medium text-textPrimary">{title}</h3>}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </GlassCard>
  );
}
