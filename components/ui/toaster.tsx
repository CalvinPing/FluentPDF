"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleCheckBig, CircleAlert, Info, X } from "lucide-react";
import { useToastStore } from "@/lib/toast-store";
import { cn } from "@/lib/cn";

const icons = {
  success: CircleCheckBig,
  error: CircleAlert,
  info: Info,
};

const iconColor = {
  success: "text-success",
  error: "text-destructive",
  info: "text-accent",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-100 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:right-6 sm:left-auto"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border",
                "bg-background-elevated px-4 py-3 shadow-lg shadow-black/10",
              )}
            >
              <Icon size={18} className={cn("mt-0.5 shrink-0", iconColor[toast.type])} />
              <p className="flex-1 text-sm text-foreground">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 text-foreground-subtle hover:text-foreground cursor-pointer"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
