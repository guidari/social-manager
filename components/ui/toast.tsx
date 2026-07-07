"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border p-4 pr-8 shadow-lg transition-all",
  {
    variants: {
      variant: {
        success: "border-green-200 bg-green-50 text-green-900",
        error: "border-red-200 bg-red-50 text-red-900",
        info: "border-blue-200 bg-blue-50 text-blue-900",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

const iconMap = {
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />,
  error: <XCircle className="h-5 w-5 shrink-0 text-red-600" />,
  info: <Info className="h-5 w-5 shrink-0 text-blue-600" />,
};

export interface ToastProps extends VariantProps<typeof toastVariants> {
  message: string;
  duration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Toast({ message, variant = "info", duration = 4000, open, onOpenChange }: ToastProps) {
  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      duration={duration}
      className={cn(toastVariants({ variant }))}
    >
      {iconMap[variant ?? "info"]}
      <ToastPrimitive.Description className="flex-1 text-sm font-medium">
        {message}
      </ToastPrimitive.Description>
      <ToastPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-[380px] flex-col-reverse gap-2 p-4" />
    </ToastPrimitive.Provider>
  );
}

type ToastData = { id: string; message: string; variant: "success" | "error" | "info" };
type ToastContextValue = { show: (message: string, variant?: ToastData["variant"]) => void };

const ToastContext = React.createContext<ToastContextValue>({ show: () => {} });

function ToastManagerProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const show = React.useCallback((message: string, variant: ToastData["variant"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      <ToastProvider>
        {children}
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            variant={t.variant}
            open
            onOpenChange={(o) => !o && setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </ToastProvider>
    </ToastContext.Provider>
  );
}

function useToast() {
  return React.useContext(ToastContext);
}

export { Toast, ToastProvider, ToastManagerProvider, useToast };
