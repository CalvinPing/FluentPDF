"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfCanvas } from "@/components/pdf/pdf-canvas";
import { cn } from "@/lib/cn";

export function PageThumb({
  pdf,
  pageNumber,
  selected,
  onDragStart,
  onDragEnter,
  rotation = 0,
}: {
  pdf: PDFDocumentProxy | null;
  pageNumber: number;
  selected: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  rotation?: number;
}) {
  return (
    <motion.button
      type="button"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        onDragStart();
      }}
      onPointerEnter={onDragEnter}
      aria-pressed={selected}
      aria-label={`Page ${pageNumber}${selected ? ", selected" : ""}`}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group relative flex touch-none flex-col items-center gap-2 rounded-xl border-2 p-2 text-left transition-colors duration-150 cursor-pointer select-none",
        selected ? "border-primary bg-primary/5" : "border-transparent hover:border-border-strong",
      )}
    >
      <div className="relative w-full overflow-hidden rounded-lg border border-border shadow-sm">
        <PdfCanvas pdf={pdf} pageNumber={pageNumber} width={220} rotation={rotation} />
        <span
          className={cn(
            "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-150",
            selected
              ? "border-primary bg-primary text-on-primary"
              : "border-border-strong bg-background-elevated/80 text-transparent",
          )}
        >
          <Check size={12} strokeWidth={3} />
        </span>
      </div>
      <span className="text-xs font-medium text-foreground-muted">Page {pageNumber}</span>
    </motion.button>
  );
}
