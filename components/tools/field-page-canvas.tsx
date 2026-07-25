"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfCanvas } from "@/components/pdf/pdf-canvas";
import { FieldBox } from "@/components/tools/field-box";
import { rectFromDrag, type FieldRect } from "@/lib/pdf/field-geometry";
import type { EditableField, NewFieldType } from "@/lib/pdf/fields";
import { cn } from "@/lib/cn";

export function FieldPageCanvas({
  pdf,
  pageNumber,
  pageIndex,
  width,
  fields,
  selectedFieldId,
  placingType,
  onSelectField,
  onDeselect,
  onUpdateField,
  onCreateField,
}: {
  pdf: PDFDocumentProxy | null;
  pageNumber: number;
  pageIndex: number;
  width: number;
  fields: EditableField[];
  selectedFieldId: string | null;
  placingType: NewFieldType | null;
  onSelectField: (id: string) => void;
  onDeselect: () => void;
  onUpdateField: (id: string, patch: Partial<EditableField>) => void;
  onCreateField: (pageIndex: number, rect: FieldRect) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [creatingRect, setCreatingRect] = useState<FieldRect | null>(null);
  const [pageWidthPts, setPageWidthPts] = useState<number | null>(null);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    pdf.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const [x0, , x1] = page.view;
      setPageWidthPts(x1 - x0);
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  const pxPerPt = pageWidthPts ? width / pageWidthPts : null;

  const startPan = (e: React.PointerEvent<HTMLDivElement>) => {
    const scrollEl = containerRef.current?.closest("[data-scroll-container]") as HTMLElement | null;
    if (!scrollEl) return;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startScrollLeft = scrollEl.scrollLeft;
    const startScrollTop = scrollEl.scrollTop;
    document.body.style.cursor = "grabbing";

    const move = (ev: PointerEvent) => {
      scrollEl.scrollLeft = startScrollLeft - (ev.clientX - startClientX);
      scrollEl.scrollTop = startScrollTop - (ev.clientY - startClientY);
    };
    const up = () => {
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 2) {
      e.preventDefault();
      startPan(e);
      return;
    }
    if (e.button !== 0) return;
    // Field boxes call stopPropagation on their own pointerdown, so any event that reaches
    // here genuinely originated from the page background (or the canvas rendered on top of
    // it) — there's no need to also require e.target to be this exact container element,
    // which a real click on the visible page never satisfies (the canvas is what's on top).
    if (!placingType || !containerRef.current) {
      onDeselect();
      return;
    }

    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    const startXRatio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const startYRatio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setCreatingRect({ xRatio: startXRatio, yRatio: startYRatio, widthRatio: 0, heightRatio: 0 });

    const move = (ev: PointerEvent) => {
      const currentXRatio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const currentYRatio = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      setCreatingRect(rectFromDrag(startXRatio, startYRatio, currentXRatio, currentYRatio));
    };
    const up = (ev: PointerEvent) => {
      const currentXRatio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const currentYRatio = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      onCreateField(pageIndex, rectFromDrag(startXRatio, startYRatio, currentXRatio, currentYRatio));
      setCreatingRect(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="mx-auto" style={{ width }}>
      <p className="mb-2 text-center text-xs font-medium text-foreground-subtle">Page {pageNumber}</p>
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onContextMenu={(e) => e.preventDefault()}
        className={cn("relative select-none", placingType && "cursor-crosshair")}
      >
        <PdfCanvas pdf={pdf} pageNumber={pageNumber} width={width} />
        {fields.map((f) => (
          <FieldBox
            key={f.id}
            field={f}
            selected={f.id === selectedFieldId}
            containerRef={containerRef}
            pxPerPt={pxPerPt}
            onSelect={onSelectField}
            onChange={onUpdateField}
          />
        ))}
        {creatingRect && (
          <div
            className="pointer-events-none absolute z-30 rounded-sm border-2 border-dashed border-primary bg-primary/10"
            style={{
              left: `${creatingRect.xRatio * 100}%`,
              top: `${creatingRect.yRatio * 100}%`,
              width: `${creatingRect.widthRatio * 100}%`,
              height: `${creatingRect.heightRatio * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
