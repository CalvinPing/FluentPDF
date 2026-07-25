"use client";

import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, RotateCw, Trash2 } from "lucide-react";
import { PdfCanvas } from "@/components/pdf/pdf-canvas";
import { cn } from "@/lib/cn";
import type { PDFDocumentProxy } from "pdfjs-dist";

export interface EditPageState {
  id: string;
  originalIndex: number;
  rotation: number;
}

export function EditPageRow({
  page,
  pdf,
  index,
  selected,
  onSelect,
  onRotate,
  onDelete,
}: {
  page: EditPageState;
  pdf: PDFDocumentProxy | null;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={page}
      dragListener={false}
      dragControls={controls}
      onClick={() => onSelect(page.id)}
      className={cn(
        "flex shrink-0 flex-col items-center gap-2 rounded-xl border-2 p-2 transition-colors duration-150 cursor-pointer",
        selected ? "border-primary bg-primary/5" : "border-transparent hover:border-border-strong",
      )}
      style={{ width: 108 }}
    >
      <div className="w-full">
        <PdfCanvas pdf={pdf} pageNumber={page.originalIndex + 1} width={200} rotation={page.rotation} />
      </div>

      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            controls.start(e);
          }}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab touch-none rounded p-1 text-foreground-subtle hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
        <span className="text-xs font-medium text-foreground-muted">{index + 1}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRotate(page.id);
            }}
            className="rounded p-1 text-foreground-subtle hover:bg-muted hover:text-foreground"
            aria-label="Rotate page 90 degrees"
          >
            <RotateCw size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(page.id);
            }}
            className="rounded p-1 text-foreground-subtle hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete page"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}
