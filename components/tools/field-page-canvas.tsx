"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfCanvas } from "@/components/pdf/pdf-canvas";
import { FieldBox } from "@/components/tools/field-box";
import { FieldGroupBox } from "@/components/tools/field-group-box";
import { rectFromDrag, rectsIntersect, type FieldRect, type SnapGuide } from "@/lib/pdf/field-geometry";
import type { EditableField, NewFieldType } from "@/lib/pdf/fields";
import { cn } from "@/lib/cn";

const SELECT_DRAG_THRESHOLD_PX = 4;

export function FieldPageCanvas({
  pdf,
  pageNumber,
  pageIndex,
  width,
  fields,
  selectedFieldIds,
  placingType,
  onSelectFields,
  onDeselect,
  onUpdateField,
  onCreateField,
}: {
  pdf: PDFDocumentProxy | null;
  pageNumber: number;
  pageIndex: number;
  width: number;
  fields: EditableField[];
  selectedFieldIds: string[];
  placingType: NewFieldType | null;
  onSelectFields: (ids: string[]) => void;
  onDeselect: () => void;
  onUpdateField: (id: string, patch: Partial<EditableField>) => void;
  onCreateField: (pageIndex: number, rect: FieldRect) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [creatingRect, setCreatingRect] = useState<FieldRect | null>(null);
  const [selectionRect, setSelectionRect] = useState<FieldRect | null>(null);
  const [pageWidthPts, setPageWidthPts] = useState<number | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  // Captured once per group-drag gesture (on its first move past the threshold), so every field
  // in the group is translated relative to where IT started rather than accumulating error by
  // re-reading already-updated positions on each subsequent pointermove tick.
  const groupDragStartRef = useRef<{ id: string; rect: FieldRect }[] | null>(null);

  // Only treat this page's selected fields as a "group" once every currently-selected field
  // (across the whole document) lives on this page — a selection split across pages falls back
  // to each field behaving independently, since a shared bounding box wouldn't mean anything
  // spanning two separate page coordinate systems.
  const selectedOnThisPage = fields.filter((f) => selectedFieldIds.includes(f.id));
  const isGroupPage = selectedOnThisPage.length > 1 && selectedOnThisPage.length === selectedFieldIds.length;

  const handleGroupMoveStep = (dxRatio: number, dyRatio: number) => {
    if (!groupDragStartRef.current) {
      groupDragStartRef.current = selectedOnThisPage.map((f) => ({
        id: f.id,
        rect: { xRatio: f.xRatio, yRatio: f.yRatio, widthRatio: f.widthRatio, heightRatio: f.heightRatio },
      }));
    }
    for (const { id, rect } of groupDragStartRef.current) {
      onUpdateField(id, {
        xRatio: Math.min(1 - rect.widthRatio, Math.max(0, rect.xRatio + dxRatio)),
        yRatio: Math.min(1 - rect.heightRatio, Math.max(0, rect.yRatio + dyRatio)),
      });
    }
  };

  const handleGroupMoveEnd = () => {
    groupDragStartRef.current = null;
  };

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
    if (e.button !== 0 || !containerRef.current) return;
    // Field boxes call stopPropagation on their own pointerdown, so any event that reaches
    // here genuinely originated from the page background (or the canvas rendered on top of
    // it) — there's no need to also require e.target to be this exact container element,
    // which a real click on the visible page never satisfies (the canvas is what's on top).
    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    const startXRatio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const startYRatio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    if (placingType) {
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
      return;
    }

    // Rubber-band select: a plain click (no meaningful drag) just clears the selection,
    // matching the old click-to-deselect behavior — only an actual drag turns into a
    // selection box, so a single click still feels instantaneous rather than always
    // needing the drag threshold to register anything.
    let dragged = false;
    setSelectionRect({ xRatio: startXRatio, yRatio: startYRatio, widthRatio: 0, heightRatio: 0 });

    const move = (ev: PointerEvent) => {
      const currentXRatio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const currentYRatio = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      if (!dragged && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < SELECT_DRAG_THRESHOLD_PX) return;
      dragged = true;
      const box = rectFromDrag(startXRatio, startYRatio, currentXRatio, currentYRatio);
      setSelectionRect(box);
      onSelectFields(fields.filter((f) => rectsIntersect(f, box)).map((f) => f.id));
    };
    const up = () => {
      setSelectionRect(null);
      if (!dragged) onDeselect();
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
            selected={selectedFieldIds.includes(f.id)}
            groupMode={isGroupPage && selectedFieldIds.includes(f.id)}
            containerRef={containerRef}
            pxPerPt={pxPerPt}
            siblingRects={fields.filter((sf) => sf.id !== f.id)}
            onSelect={(id) => onSelectFields([id])}
            onChange={onUpdateField}
            onSnapGuides={setSnapGuides}
            onGroupMoveStep={handleGroupMoveStep}
            onGroupMoveEnd={handleGroupMoveEnd}
          />
        ))}
        {isGroupPage && (
          <FieldGroupBox fields={selectedOnThisPage} containerRef={containerRef} onUpdateField={onUpdateField} />
        )}
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
        {selectionRect && (
          <div
            className="pointer-events-none absolute z-30 rounded-sm border border-primary bg-primary/10"
            style={{
              left: `${selectionRect.xRatio * 100}%`,
              top: `${selectionRect.yRatio * 100}%`,
              width: `${selectionRect.widthRatio * 100}%`,
              height: `${selectionRect.heightRatio * 100}%`,
            }}
          />
        )}
        {snapGuides.map((g) => (
          <div
            key={`${g.axis}-${g.ratio}`}
            aria-hidden
            className="pointer-events-none absolute z-40 bg-primary"
            style={
              g.axis === "x"
                ? { left: `${g.ratio * 100}%`, top: 0, bottom: 0, width: "1px" }
                : { top: `${g.ratio * 100}%`, left: 0, right: 0, height: "1px" }
            }
          />
        ))}
      </div>
    </div>
  );
}
