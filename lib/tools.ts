import { Combine, Scissors, PenLine, ListChecks, Lock, Repeat, Stamp, LayoutGrid, type LucideIcon } from "lucide-react";

export interface ToolMeta {
  slug: "merge" | "split" | "edit" | "fields" | "stamp" | "layout" | "protect" | "convert";
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

export const tools: ToolMeta[] = [
  {
    slug: "merge",
    label: "Merge & Mix",
    shortLabel: "Merge",
    description: "Combine PDFs in order, or alternate pages between two files — like interleaving front/back scans.",
    icon: Combine,
  },
  {
    slug: "split",
    label: "Split PDFs",
    shortLabel: "Split",
    description: "Pull specific pages out, break a file into even chunks, split it in half, or one PDF per page.",
    icon: Scissors,
  },
  {
    slug: "edit",
    label: "Edit Pages",
    shortLabel: "Edit",
    description: "Rotate, delete, and reorder pages, drop in new text, or update the document's title and author.",
    icon: PenLine,
  },
  {
    slug: "fields",
    label: "Form Fields",
    shortLabel: "Fields",
    description: "Auto-detect fillable fields, place your own, or flatten a filled form into a static, non-editable PDF.",
    icon: ListChecks,
  },
  {
    slug: "stamp",
    label: "Stamp Pages",
    shortLabel: "Stamp",
    description: "Add a watermark, running header or footer, page numbers, or Bates numbering to every page.",
    icon: Stamp,
  },
  {
    slug: "layout",
    label: "Page Layout",
    shortLabel: "Layout",
    description: "Crop the margins, change the page size, or combine several pages onto one sheet.",
    icon: LayoutGrid,
  },
  {
    slug: "protect",
    label: "Protect PDF",
    shortLabel: "Protect",
    description: "Add a password to lock a PDF, or remove one you already know.",
    icon: Lock,
  },
  {
    slug: "convert",
    label: "Convert",
    shortLabel: "Convert",
    description: "Turn a PDF into JPG, Text, Word, Excel, or PowerPoint — or build one from HTML, Word, or images.",
    icon: Repeat,
  },
];
