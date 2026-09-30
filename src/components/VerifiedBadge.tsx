import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const VerifiedBadge = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <BadgeCheck
    className={cn("text-primary fill-primary/20 inline-block shrink-0", className)}
    style={{ width: size, height: size }}
    aria-label="Artista verificado"
  />
);

export default VerifiedBadge;
