"use client";

import { Square, SquareCheck } from "lucide-react";
import {
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DATE_PLACEHOLDER,
  FONT_CSS_STACK,
  type EditableField,
  type FieldKind,
} from "@/lib/pdf/fields";
import { moveRect, resizeRect, type HandlePosition } from "@/lib/pdf/field-geometry";
import { capturePointerDrag } from "@/lib/pointer-drag";
import { cn } from "@/lib/cn";

const MIN_PREVIEW_FONT_PX = 6;
const MAX_PREVIEW_FONT_PX = 64;

const placeholderLabel: Record<FieldKind, string> = {
  text: "Text",
  checkbox: "",
  date: DATE_PLACEHOLDER,
  signature: "Signature",
  dropdown: "Dropdown",
  radio: "Radio",
  other: "Field",
};

const HANDLES: { pos: HandlePosition; label: string; className: string; cursor: string }[] = [
  { pos: "nw", label: "Resize from top-left", className: "-top-1 -left-1", cursor: "cursor-nwse-resize" },
  { pos: "n", label: "Resize from top", className: "-top-1 left-1/2 -translate-x-1/2", cursor: "cursor-ns-resize" },
  { pos: "ne", label: "Resize from top-right", className: "-top-1 -right-1", cursor: "cursor-nesw-resize" },
  { pos: "e", label: "Resize from right", className: "top-1/2 -right-1 -translate-y-1/2", cursor: "cursor-ew-resize" },
  { pos: "se", label: "Resize from bottom-right", className: "-bottom-1 -right-1", cursor: "cursor-nwse-resize" },
  { pos: "s", label: "Resize from bottom", className: "-bottom-1 left-1/2 -translate-x-1/2", cursor: "cursor-ns-resize" },
  { pos: "sw", label: "Resize from bottom-left", className: "-bottom-1 -left-1", cursor: "cursor-nesw-resize" },
  { pos: "w", label: "Resize from left", className: "top-1/2 -left-1 -translate-y-1/2", cursor: "cursor-ew-resize" },
];

const CORNER_HANDLES = new Set<HandlePosition>(["nw", "ne", "se", "sw"]);
const MOVE_THRESHOLD_PX = 4;

export function FieldBox({
  field,
  selected,
  containerRef,
  pxPerPt,
  onSelect,
  onChange,
}: {
  field: EditableField;
  selected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  pxPerPt: number | null;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<EditableField>) => void;
}) {
  const onBodyPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(field.id);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startRect = {
      xRatio: field.xRatio,
      yRatio: field.yRatio,
      widthRatio: field.widthRatio,
      heightRatio: field.heightRatio,
    };
    let moved = false;

    capturePointerDrag(e.currentTarget as HTMLElement, e.pointerId, (ev) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dxPx = ev.clientX - startClientX;
      const dyPx = ev.clientY - startClientY;
      if (!moved && Math.hypot(dxPx, dyPx) < MOVE_THRESHOLD_PX) return;
      moved = true;
      onChange(field.id, moveRect(startRect, dxPx / rect.width, dyPx / rect.height));
    });
  };

  const onHandlePointerDown = (handle: HandlePosition) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(field.id);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startRect = {
      xRatio: field.xRatio,
      yRatio: field.yRatio,
      widthRatio: field.widthRatio,
      heightRatio: field.heightRatio,
    };

    capturePointerDrag(e.currentTarget as HTMLElement, e.pointerId, (ev) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dxRatio = (ev.clientX - startClientX) / rect.width;
      const dyRatio = (ev.clientY - startClientY) / rect.height;
      onChange(field.id, resizeRect(startRect, handle, dxRatio, dyRatio));
    });
  };

  const hasValue = field.value && field.value.trim().length > 0;
  const fontChoice = FONT_CSS_STACK[field.fontFamily ?? DEFAULT_FONT];
  const previewFontSizePx = pxPerPt
    ? Math.min(MAX_PREVIEW_FONT_PX, Math.max(MIN_PREVIEW_FONT_PX, (field.fontSize ?? DEFAULT_FONT_SIZE) * pxPerPt))
    : 11;
  // Custom appearance colors only ever exist on "new" fields (pdf-lib can't recolor an
  // already-existing "detected" widget), so this doubles as the WYSIWYG-preview gate.
  const hasCustomAppearance = field.origin === "new";
  const borderWidthPx = pxPerPt ? Math.max(1, (field.borderWidth ?? 1) * pxPerPt) : 1;

  return (
    <div
      onPointerDown={onBodyPointerDown}
      className={cn(
        "absolute cursor-move touch-none rounded-sm transition-shadow duration-100",
        hasCustomAppearance
          ? "border"
          : cn("border-2", selected ? "border-primary bg-primary/5" : "border-primary/40 bg-transparent hover:border-primary/70"),
        selected ? "z-20 ring-2 ring-primary" : "z-10",
      )}
      style={{
        left: `${field.xRatio * 100}%`,
        top: `${field.yRatio * 100}%`,
        width: `${field.widthRatio * 100}%`,
        height: `${field.heightRatio * 100}%`,
        ...(hasCustomAppearance
          ? {
              borderColor: field.borderColor,
              borderWidth: `${borderWidthPx}px`,
              backgroundColor: field.backgroundColor,
            }
          : {}),
      }}
    >
      {field.kind !== "checkbox" && (
        <span
          className={cn(
            "pointer-events-none flex h-full items-center overflow-hidden px-1.5 leading-none select-none",
            // The field sits on top of the rendered PDF page, which is always white paper
            // regardless of app theme — text-foreground would turn near-white in dark mode
            // and vanish, so this uses fixed "ink" colors instead of the themed ones (as a
            // fallback for when there's no custom appearance color to use instead).
            hasValue ? "text-pdf-ink" : "text-pdf-ink-subtle",
          )}
          style={{
            fontSize: `${previewFontSizePx}px`,
            fontFamily: fontChoice.family,
            fontWeight: hasValue ? fontChoice.weight : fontChoice.weight === "bold" ? "bold" : 500,
            fontStyle: fontChoice.style,
            color: hasValue && hasCustomAppearance ? field.textColor : undefined,
          }}
        >
          {hasValue ? field.value : placeholderLabel[field.kind]}
        </span>
      )}
      {field.kind === "checkbox" &&
        (() => {
          const CheckboxIcon = field.checked ? SquareCheck : Square;
          return (
            // Sized as a percentage of the field box itself (via the inset-% wrapper) rather
            // than a fixed pixel size, so the icon scales up and down as the box is resized.
            <div className="pointer-events-none absolute inset-[15%]">
              <CheckboxIcon
                style={{ width: "100%", height: "100%", color: hasCustomAppearance ? field.textColor : undefined }}
                className={hasCustomAppearance ? undefined : "text-primary/70"}
                strokeWidth={2}
              />
            </div>
          );
        })()}

      {selected &&
        HANDLES.filter((h) => field.kind !== "checkbox" || CORNER_HANDLES.has(h.pos)).map((h) => (
          <div
            key={h.pos}
            role="button"
            aria-label={h.label}
            onPointerDown={onHandlePointerDown(h.pos)}
            className={cn(
              "absolute z-30 h-2.5 w-2.5 touch-none rounded-[2px] border border-background bg-primary",
              h.className,
              h.cursor,
            )}
          />
        ))}
    </div>
  );
}
