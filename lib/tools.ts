import { Combine, Scissors, PenLine, ListChecks, Lock, ImagePlus, type LucideIcon } from "lucide-react";

export interface ToolMeta {
  slug: "merge" | "split" | "edit" | "fields" | "protect" | "images";
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

export const tools: ToolMeta[] = [
  {
    slug: "merge",
    label: "Merge PDFs",
    shortLabel: "Merge",
    description: "Combine multiple PDFs into a single document, in whatever order you choose.",
    icon: Combine,
  },
  {
    slug: "split",
    label: "Split PDFs",
    shortLabel: "Split",
    description: "Pull specific pages out, or break one PDF into several smaller files.",
    icon: Scissors,
  },
  {
    slug: "edit",
    label: "Edit Pages",
    shortLabel: "Edit",
    description: "Rotate, delete, and reorder pages, or drop in new text anywhere.",
    icon: PenLine,
  },
  {
    slug: "fields",
    label: "Form Fields",
    shortLabel: "Fields",
    description: "Auto-detect fillable fields, or place your own — text, checkbox, date, signature.",
    icon: ListChecks,
  },
  {
    slug: "protect",
    label: "Protect PDF",
    shortLabel: "Protect",
    description: "Add a password to lock a PDF, or remove one you already know.",
    icon: Lock,
  },
  {
    slug: "images",
    label: "Images to PDF",
    shortLabel: "Images",
    description: "Turn PNG or JPEG photos into a PDF — one page per image, drag to reorder.",
    icon: ImagePlus,
  },
];
