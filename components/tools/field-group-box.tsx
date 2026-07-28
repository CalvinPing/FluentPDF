"use client";

import { groupBounds, remapRectToBounds, resizeRect, type FieldRect, type HandlePosition } from "@/lib/pdf/field-geometry";
import { capturePointerDrag } from "@/lib/pointer-drag";
import { HANDLES } from "@/components/tools/field-box";
import type { EditableField } from "@/lib/pdf/fields";
import { cn } from "@/lib/cn";

/**
 * The shared bounding box + resize handles shown in place of individual field handles once 2+
 * fields are selected on the same page — dragging a handle here scales every selected field's
 * position and size proportionally within the box (see `remapRectToBounds`), so resizing the box
 * resizes the whole group together rather than just its outer edge.
 */
export function FieldGroupBox({
  fields,
  containerRef,
  onUpdateField,
}: {
  fields: EditableField[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  onUpdateField: (id: string, patch: Partial<EditableField>) => void;
}) {
  const bounds = groupBounds(fields);

  const onHandlePointerDown = (handle: HandlePosition) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startBounds = bounds;
    const startRects = fields.map((f) => ({
      id: f.id,
      rect: { xRatio: f.xRatio, yRatio: f.yRatio, widthRatio: f.widthRatio, heightRatio: f.heightRatio } as FieldRect,
    }));

    capturePointerDrag(e.currentTarget as HTMLElement, e.pointerId, (ev) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dxRatio = (ev.clientX - startClientX) / rect.width;
      const dyRatio = (ev.clientY - startClientY) / rect.height;
      const newBounds = resizeRect(startBounds, handle, dxRatio, dyRatio);
      for (const { id, rect: startRect } of startRects) {
        onUpdateField(id, remapRectToBounds(startRect, startBounds, newBounds));
      }
    });
  };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20 rounded-sm border-2 border-primary"
      style={{
        left: `${bounds.xRatio * 100}%`,
        top: `${bounds.yRatio * 100}%`,
        width: `${bounds.widthRatio * 100}%`,
        height: `${bounds.heightRatio * 100}%`,
      }}
    >
      {HANDLES.map((h) => (
        <div
          key={h.pos}
          role="button"
          aria-label={`Resize selection: ${h.label.replace("Resize from ", "")}`}
          onPointerDown={onHandlePointerDown(h.pos)}
          className={cn(
            "pointer-events-auto absolute z-30 h-2.5 w-2.5 touch-none rounded-[2px] border border-background bg-primary",
            h.className,
            h.cursor,
          )}
        />
      ))}
    </div>
  );
}
