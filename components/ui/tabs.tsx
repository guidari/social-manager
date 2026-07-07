"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
  children?: React.ReactNode;
}

function Tabs({
  items,
  value,
  onChange,
  orientation = "horizontal",
  className,
  children,
}: TabsProps) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onChange}
      orientation={orientation}
      className={cn(orientation === "vertical" && "flex gap-4", className)}
    >
      <TabsPrimitive.List
        className={cn(
          "inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
          orientation === "vertical" && "h-fit flex-col",
        )}
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.id}
            value={item.id}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
            )}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent };
