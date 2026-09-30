import { Skeleton } from "@/components/ui/skeleton";

export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <ul className="space-y-2" aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      <li key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </li>
    ))}
  </ul>
);

export const CardSkeleton = ({ cards = 3 }: { cards?: number }) => (
  <div className="space-y-4" aria-hidden>
    {Array.from({ length: cards }).map((_, i) => (
      <div key={i} className="rounded-3xl overflow-hidden bg-card border border-border/40">
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="p-4 space-y-2.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const SwipeSkeleton = () => (
  <div className="w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden" aria-hidden>
    <Skeleton className="w-full h-full rounded-3xl" />
  </div>
);
