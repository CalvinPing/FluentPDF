"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, LayoutGrid, Crop as CropIcon, Maximize2, Grid3x3 } from "lucide-react";
import { ToolIntro } from "@/components/tool-shell/tool-intro";
import { CropForm } from "@/components/tools/layout/crop-form";
import { ResizeForm } from "@/components/tools/layout/resize-form";
import { NUpForm } from "@/components/tools/layout/n-up-form";

type LayoutToolId = "crop" | "resize" | "n-up";

interface LayoutOption {
  id: LayoutToolId;
  label: string;
  icon: LucideIcon;
  summary: string;
  detail: string;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: "crop",
    label: "Crop",
    icon: CropIcon,
    summary: "Trim margins off every page.",
    detail: "Trims a fixed margin off each edge of every page — useful for cutting away scanner borders or wasted whitespace before printing or sharing.",
  },
  {
    id: "resize",
    label: "Resize",
    icon: Maximize2,
    summary: "Change every page to a standard size.",
    detail: "Rebuilds every page at a standard size (A4, Letter, Legal, Tabloid), scaling the original content down or up to fit without distorting it.",
  },
  {
    id: "n-up",
    label: "N-up",
    icon: Grid3x3,
    summary: "Combine several pages onto one sheet.",
    detail: "Arranges several original pages onto each output sheet in a grid — a common print-friendly layout for handouts, proofs, or thumbnail overviews.",
  },
];

export default function LayoutToolPage() {
  const [selected, setSelected] = useState<LayoutOption | null>(null);

  if (!selected) {
    return (
      <div>
        <ToolIntro
          icon={LayoutGrid}
          title="Page Layout"
          description="Crop margins, change the page size, or combine multiple pages onto one sheet — every page, right in your browser."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option)}
              className="group flex items-start gap-3 rounded-2xl border border-border bg-background-elevated p-5 text-left transition-colors duration-150 hover:border-primary/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <option.icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{option.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{option.summary}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setSelected(null)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted hover:text-foreground"
      >
        <ArrowLeft size={15} />
        All layout tools
      </button>

      <ToolIntro icon={selected.icon} title={selected.label} description={selected.detail} />

      {selected.id === "crop" && <CropForm />}
      {selected.id === "resize" && <ResizeForm />}
      {selected.id === "n-up" && <NUpForm />}
    </div>
  );
}
