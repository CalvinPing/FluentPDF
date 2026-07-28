"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Stamp as StampIcon, Type, Hash, FileDigit } from "lucide-react";
import { ToolIntro } from "@/components/tool-shell/tool-intro";
import { WatermarkForm } from "@/components/tools/stamp/watermark-form";
import { HeaderFooterForm } from "@/components/tools/stamp/header-footer-form";
import { PageNumbersForm } from "@/components/tools/stamp/page-numbers-form";
import { BatesForm } from "@/components/tools/stamp/bates-form";

type StampId = "watermark" | "header-footer" | "page-numbers" | "bates";

interface StampOption {
  id: StampId;
  label: string;
  icon: LucideIcon;
  summary: string;
  detail: string;
}

const STAMP_OPTIONS: StampOption[] = [
  {
    id: "watermark",
    label: "Watermark",
    icon: StampIcon,
    summary: "Large, translucent text across every page.",
    detail: "Draws your text large, rotated, and semi-transparent across the center of every page — the standard \"DRAFT\" or \"CONFIDENTIAL\" treatment.",
  },
  {
    id: "header-footer",
    label: "Header & Footer",
    icon: Type,
    summary: "A repeating line at the top and/or bottom.",
    detail: "Draws the same line of text along the top and/or bottom edge of every page — a document title, a company name, anything you need repeated throughout.",
  },
  {
    id: "page-numbers",
    label: "Page Numbers",
    icon: Hash,
    summary: "Numbered pages, in the format you choose.",
    detail: "Numbers every page using a format you control — \"Page 1 of 12\", a bare number, starting from any value, in any corner of the page.",
  },
  {
    id: "bates",
    label: "Bates Numbering",
    icon: FileDigit,
    summary: "Sequential legal-style document numbering.",
    detail: "Stamps a fixed prefix plus a zero-padded, ever-increasing number on every page — the standard legal/discovery document-numbering scheme.",
  },
];

export default function StampPage() {
  const [selected, setSelected] = useState<StampOption | null>(null);

  if (!selected) {
    return (
      <div>
        <ToolIntro
          icon={StampIcon}
          title="Stamp Pages"
          description="Add a watermark, header/footer, page numbers, or Bates numbering — every page, right in your browser."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STAMP_OPTIONS.map((option) => (
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
        All stamp types
      </button>

      <ToolIntro icon={selected.icon} title={selected.label} description={selected.detail} />

      {selected.id === "watermark" && <WatermarkForm />}
      {selected.id === "header-footer" && <HeaderFooterForm />}
      {selected.id === "page-numbers" && <PageNumbersForm />}
      {selected.id === "bates" && <BatesForm />}
    </div>
  );
}
