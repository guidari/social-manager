import * as React from "react";
import { cn } from "@/lib/utils";

function SkeletonBase({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      style={style}
    />
  );
}

export interface SkeletonProps {
  variant?: "card" | "row" | "chart" | "text";
  count?: number;
  className?: string;
}

function Skeleton({ variant = "text", count = 1, className }: SkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === "card") {
    return (
      <>
        {items.map((_, i) => (
          <div key={i} className={cn("rounded-xl border bg-card p-4 space-y-3", className)}>
            <SkeletonBase className="h-4 w-1/3" />
            <SkeletonBase className="h-8 w-1/2" />
            <SkeletonBase className="h-3 w-1/4" />
          </div>
        ))}
      </>
    );
  }

  if (variant === "row") {
    return (
      <>
        {items.map((_, i) => (
          <div key={i} className={cn("flex items-center gap-3 py-2", className)}>
            <SkeletonBase className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBase className="h-4 w-3/4" />
              <SkeletonBase className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </>
    );
  }

  if (variant === "chart") {
    return (
      <div className={cn("space-y-3", className)}>
        <SkeletonBase className="h-4 w-1/4" />
        <SkeletonBase className="h-[200px] w-full rounded-xl" />
        <div className="flex gap-2">
          {[40, 60, 80, 50, 70].map((w, i) => (
            <SkeletonBase key={i} className={`h-3`} style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {items.map((_, i) => (
        <SkeletonBase key={i} className={cn("h-4 w-full", className)} />
      ))}
    </>
  );
}

export { Skeleton };
