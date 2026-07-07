import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const PLATFORM_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  youtube: {
    label: "YouTube",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  tiktok: {
    label: "TikTok",
    className: "bg-neutral-900 text-white border-neutral-700",
    dot: "bg-white",
  },
};

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  scheduled: {
    label: "Scheduled",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  published: {
    label: "Published",
    className: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  draft: {
    label: "Draft",
    className: "bg-neutral-100 text-neutral-600 border-neutral-200",
    dot: "bg-neutral-400",
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  needs_review: {
    label: "Needs Review",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
};

export interface PlatformBadgeProps {
  value: "youtube" | "tiktok" | string;
  className?: string;
}

function PlatformBadge({ value, className }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[value.toLowerCase()] ?? {
    label: value,
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export interface StatusBadgeProps {
  value: "scheduled" | "published" | "draft" | "failed" | "needs_review" | string;
  className?: string;
}

function StatusBadge({ value, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[value.toLowerCase()] ?? {
    label: value,
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export { Badge, badgeVariants, PlatformBadge, StatusBadge };
