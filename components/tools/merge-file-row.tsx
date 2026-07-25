"use client";

import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, X, ChevronUp, ChevronDown } from "lucide-react";
import { PdfCanvas } from "@/components/pdf/pdf-canvas";
import { usePdfDocument } from "@/lib/hooks/use-pdf-document";

export interface MergeFile {
  id: string;
  name: string;
  bytes: Uint8Array;
}

export function MergeFileRow({
  file,
  index,
  total,
  onRemove,
  onMove,
}: {
  file: MergeFile;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const controls = useDragControls();
  const { pdf } = usePdfDocument(file.bytes);

  return (
    <Reorder.Item
      value={file}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-4 rounded-xl border border-border bg-background-elevated p-3"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="cursor-grab touch-none text-foreground-subtle hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={18} />
      </button>

      <div className="w-12 shrink-0">
        <PdfCanvas pdf={pdf} pageNumber={1} width={96} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
        <p className="text-xs text-foreground-subtle">Position {index + 1}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onMove(file.id, -1)}
          disabled={index === 0}
          className="rounded-md p-1.5 text-foreground-subtle hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Move up"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => onMove(file.id, 1)}
          disabled={index === total - 1}
          className="rounded-md p-1.5 text-foreground-subtle hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Move down"
        >
          <ChevronDown size={16} />
        </button>
        <button
          type="button"
          onClick={() => onRemove(file.id)}
          className="rounded-md p-1.5 text-foreground-subtle hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Remove ${file.name}`}
        >
          <X size={16} />
        </button>
      </div>
    </Reorder.Item>
  );
}
