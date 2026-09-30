import React from "react";
import panalLogo from "@/assets/panal-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: "w-8 h-8", text: "text-base" },
  md: { box: "w-10 h-10", text: "text-xl" },
  lg: { box: "w-14 h-14", text: "text-2xl" },
  xl: { box: "w-20 h-20", text: "text-4xl" },
};

const Logo = ({ size = "md", showText = true, className }: LogoProps) => {
  const s = sizeMap[size];
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div className={cn("flex items-center justify-center shrink-0 overflow-hidden rounded-full drop-shadow-[0_2px_10px_rgba(245,158,11,0.35)]", s.box)}>
        <img
          src={panalLogo}
          alt="Panal"
          className="w-full h-full object-cover rounded-full"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={cn("font-black tracking-tight bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent", s.text)}>
              Panal
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
              BETA
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
