"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfCanvas } from "@/components/pdf/pdf-canvas";

const THUMB_WIDTH = 80;

export function FieldPageNav({
  pdf,
  pageCount,
  fieldCountByPage,
  onJumpToPage,
}: {
  pdf: PDFDocumentProxy | null;
  pageCount: number;
  fieldCountByPage: number[];
  onJumpToPage: (pageIndex: number) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-background-elevated p-4 shadow-xl shadow-black/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
        Pages <span className="font-normal normal-case text-foreground-subtle/70">({pageCount})</span>
      </p>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onJumpToPage(i)}
            className="group flex flex-col items-center gap-1.5"
          >
            <div className="overflow-hidden rounded-md border border-border shadow-sm transition-colors group-hover:border-primary">
              <PdfCanvas pdf={pdf} pageNumber={i + 1} width={THUMB_WIDTH} />
            </div>
            <span className="text-[11px] font-medium text-foreground-subtle group-hover:text-foreground">
              Page {i + 1}
              {fieldCountByPage[i] ? ` · ${fieldCountByPage[i]}` : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
