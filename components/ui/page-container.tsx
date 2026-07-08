import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: "md" | "lg" | "xl";
  className?: string;
}

const MAX_WIDTH_CLASSES: Record<NonNullable<PageContainerProps["maxWidth"]>, string> = {
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
};

function PageContainer({ children, maxWidth = "xl", className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-6 py-8 lg:px-8", MAX_WIDTH_CLASSES[maxWidth], className)}>
      {children}
    </div>
  );
}

export { PageContainer };
