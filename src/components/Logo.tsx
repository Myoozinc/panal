import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: "w-8 h-8", text: "text-base", icon: 20 },
  md: { box: "w-10 h-10", text: "text-xl", icon: 26 },
  lg: { box: "w-14 h-14", text: "text-2xl", icon: 34 },
  xl: { box: "w-20 h-20", text: "text-4xl", icon: 48 },
};

export const HoneycombIcon = ({ size = 28, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("drop-shadow-[0_2px_10px_rgba(245,158,11,0.45)]", className)}
  >
    <defs>
      <linearGradient id="honeyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <linearGradient id="honeyGlow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#EAB308" stopOpacity="0.4" />
      </linearGradient>
    </defs>
    {/* Main central Hexagon */}
    <path
      d="M24 4L41.32 14V34L24 44L6.68 34V14L24 4Z"
      stroke="url(#honeyGrad)"
      strokeWidth="3"
      strokeLinejoin="round"
      fill="#1A1505"
      fillOpacity="0.9"
    />
    {/* Inner decorative honeycomb lines / cell nodes */}
    <path
      d="M24 13L32 18V28L24 33L16 28V18L24 13Z"
      fill="url(#honeyGrad)"
      fillOpacity="0.85"
    />
    {/* Network connection points (collab synergy nodes) */}
    <circle cx="24" cy="4" r="2.5" fill="#FDE047" />
    <circle cx="41.32" cy="14" r="2.5" fill="#F59E0B" />
    <circle cx="41.32" cy="34" r="2.5" fill="#F59E0B" />
    <circle cx="24" cy="44" r="2.5" fill="#D97706" />
    <circle cx="6.68" cy="34" r="2.5" fill="#F59E0B" />
    <circle cx="6.68" cy="14" r="2.5" fill="#FDE047" />
  </svg>
);

const Logo = ({ size = "md", showText = true, className }: LogoProps) => {
  const s = sizeMap[size];
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div className={cn("flex items-center justify-center shrink-0", s.box)}>
        <HoneycombIcon size={s.icon} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={cn("font-black tracking-tight bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent", s.text)}>
              Panal
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              BETA
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
