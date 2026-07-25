"use client";

import { GripVertical, X } from "lucide-react";
import { capturePointerDrag } from "@/lib/pointer-drag";

export interface AnnotationDraft {
  id: string;
  xRatio: number;
  yRatio: number;
  text: string;
}

export function AnnotationOverlay({
  annotation,
  containerRef,
  onChange,
  onRemove,
}: {
  annotation: AnnotationDraft;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onChange: (id: string, patch: Partial<AnnotationDraft>) => void;
  onRemove: (id: string) => void;
}) {
  const onDragPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    capturePointerDrag(e.currentTarget as HTMLElement, e.pointerId, (ev) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const xRatio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const yRatio = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      onChange(annotation.id, { xRatio, yRatio });
    });
  };

  return (
    <div
      className="absolute z-10 flex items-center gap-1 rounded-md border border-primary bg-background-elevated px-1.5 py-1 shadow-md"
      style={{
        left: `${annotation.xRatio * 100}%`,
        top: `${annotation.yRatio * 100}%`,
        transform: "translateY(-50%)",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onPointerDown={onDragPointerDown}
        className="cursor-grab touch-none text-foreground-subtle active:cursor-grabbing"
        aria-label="Drag to move text"
      >
        <GripVertical size={12} />
      </button>
      <input
        value={annotation.text}
        onChange={(e) => onChange(annotation.id, { text: e.target.value })}
        placeholder="Text…"
        className="w-28 bg-transparent text-xs text-foreground outline-none"
      />
      <button
        type="button"
        onClick={() => onRemove(annotation.id)}
        aria-label="Remove text"
        className="text-foreground-subtle hover:text-destructive"
      >
        <X size={12} />
      </button>
    </div>
  );
}
