import panalLogo from "@/assets/panal-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: "w-8 h-8", text: "text-lg" },
  md: { box: "w-10 h-10", text: "text-xl" },
  lg: { box: "w-14 h-14", text: "text-2xl" },
  xl: { box: "w-20 h-20", text: "text-4xl" },
};

const Logo = ({ size = "md", showText = true, className }: LogoProps) => {
  const s = sizeMap[size];
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-black/5 shadow-[0_4px_14px_-4px_rgba(217,119,6,0.45)]",
          s.box,
        )}
      >
        {/* The source PNG has padding around the badge; scale it so the circle fills the frame. */}
        <img src={panalLogo} alt="Panal" className="w-full h-full object-cover scale-[1.46]" />
      </div>
      {showText && (
        <div className="flex items-center gap-2">
          <span className={cn("font-display font-extrabold tracking-tight text-foreground", s.text)}>
            Panal
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25">
            Beta
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
