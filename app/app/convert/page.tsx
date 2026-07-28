"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Repeat,
  FileImage,
  FileText,
  FileType,
  FileSpreadsheet,
  Presentation,
  Code2,
  ImagePlus,
} from "lucide-react";
import { ToolIntro } from "@/components/tool-shell/tool-intro";
import { PdfToXFlow } from "@/components/tools/convert/pdf-to-x-flow";
import { FileToPdfFlow } from "@/components/tools/convert/file-to-pdf-flow";
import { ImagesToPdfFlow } from "@/components/tools/convert/images-to-pdf-flow";
import { pdfToImages } from "@/lib/pdf/pdf-to-images";
import { pdfToText } from "@/lib/pdf/pdf-to-text";
import { pdfToDocx } from "@/lib/pdf/pdf-to-docx";
import { pdfToXlsx } from "@/lib/pdf/pdf-to-xlsx";
import { pdfToPptx } from "@/lib/pdf/pdf-to-pptx";
import { docxToPdf } from "@/lib/pdf/docx-to-pdf";
import { htmlStringToPdf } from "@/lib/pdf/html-to-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";

export type ConversionId =
  | "pdf-to-jpg"
  | "pdf-to-text"
  | "pdf-to-word"
  | "pdf-to-excel"
  | "pdf-to-pptx"
  | "html-to-pdf"
  | "jpg-to-pdf"
  | "word-to-pdf";

interface ConversionOption {
  id: ConversionId;
  direction: "from" | "to";
  label: string;
  icon: LucideIcon;
  summary: string;
  detail: string;
}

const CONVERSIONS: ConversionOption[] = [
  {
    id: "pdf-to-jpg",
    direction: "from",
    label: "PDF to JPG",
    icon: FileImage,
    summary: "One image per page, at print quality.",
    detail: "Renders every page as its own JPG image, at print-quality resolution. This is a real, high-fidelity conversion — it's a genuine picture of the page, not an approximation.",
  },
  {
    id: "pdf-to-text",
    direction: "from",
    label: "PDF to Text",
    icon: FileText,
    summary: "Plain text, reading order preserved.",
    detail: "Pulls every page's text out in reading order and reconstructs line breaks from where the text actually sits on the page. Reliable for any PDF with real (not scanned/image) text.",
  },
  {
    id: "pdf-to-word",
    direction: "from",
    label: "PDF to Word",
    icon: FileType,
    summary: "Best effort — great for simple documents.",
    detail: "Reflows the extracted text into paragraphs by spacing. A PDF doesn't store \"this is a paragraph\" as data, only positioned text, so this works well for simple, single-column documents but won't reconstruct multi-column layouts or tables as such.",
  },
  {
    id: "pdf-to-excel",
    direction: "from",
    label: "PDF to Excel",
    icon: FileSpreadsheet,
    summary: "Best effort — great for clean, simple tables.",
    detail: "Clusters text into rows and columns by position, one sheet per page. Works well on clean tabular PDFs like invoices or price lists; a PDF has no real table structure to read, so complex tables (merged cells, wrapped text) won't reconstruct reliably.",
  },
  {
    id: "pdf-to-pptx",
    direction: "from",
    label: "PDF to PowerPoint",
    icon: Presentation,
    summary: "Each page becomes one slide image.",
    detail: "Renders each page as an image and places it full-bleed on its own slide — looks exactly like the PDF, but the text on each slide is a picture, not an editable PowerPoint text box.",
  },
  {
    id: "html-to-pdf",
    direction: "to",
    label: "HTML to PDF",
    icon: Code2,
    summary: "Rendered with your browser's own engine.",
    detail: "Renders the HTML file with the browser's own layout engine and captures it as PDF pages — a real screenshot of the rendered page, so the result looks right, but the PDF's text is a picture of text, not selectable content.",
  },
  {
    id: "jpg-to-pdf",
    direction: "to",
    label: "JPG to PDF",
    icon: ImagePlus,
    summary: "One page per photo, drag to reorder.",
    detail: "Packs one or more PNG/JPEG images into a PDF, one page per image, sized to match each image exactly. A real, high-fidelity conversion.",
  },
  {
    id: "word-to-pdf",
    direction: "to",
    label: "Word to PDF",
    icon: FileText,
    summary: "Best effort — great for simple documents.",
    detail: "Converts the .docx to HTML first (picking up paragraphs, headings, bold/italic, simple lists), then renders that to PDF pages. Tables, multi-column layouts, and headers/footers won't survive the trip — this is for straightforward text documents, not a full Word layout engine.",
  },
];

export default function ConvertPage() {
  const [selected, setSelected] = useState<ConversionOption | null>(null);

  if (!selected) {
    return (
      <div>
        <ToolIntro
          icon={Repeat}
          title="Convert"
          description="Turn a PDF into another format, or build one from something else — every conversion runs on your device, nothing is uploaded."
        />
        <ConversionGrid onSelect={setSelected} />
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
        All conversions
      </button>

      <ToolIntro icon={selected.icon} title={selected.label} description={selected.detail} />

      {selected.id === "jpg-to-pdf" && <ImagesToPdfFlow />}

      {selected.id === "word-to-pdf" && (
        <FileToPdfFlow
          accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          dropLabel="Drop a .docx file here, or click to browse"
          dropHint="Word (.docx) files only"
          outputSuffix=""
          convert={(bytes) => docxToPdf(bytes)}
        />
      )}

      {selected.id === "html-to-pdf" && (
        <FileToPdfFlow
          accept="text/html"
          dropLabel="Drop an .html file here, or click to browse"
          dropHint="HTML files only"
          outputSuffix=""
          convert={async (bytes) => htmlStringToPdf(new TextDecoder().decode(bytes))}
        />
      )}

      {(selected.id === "pdf-to-jpg" ||
        selected.id === "pdf-to-text" ||
        selected.id === "pdf-to-word" ||
        selected.id === "pdf-to-excel" ||
        selected.id === "pdf-to-pptx") && <PdfConversion id={selected.id} />}
    </div>
  );
}

function ConversionGrid({ onSelect }: { onSelect: (option: ConversionOption) => void }) {
  const fromPdf = CONVERSIONS.filter((c) => c.direction === "from");
  const toPdf = CONVERSIONS.filter((c) => c.direction === "to");

  return (
    <div className="flex flex-col gap-10">
      <ConversionSection title="Convert from PDF" options={fromPdf} onSelect={onSelect} />
      <ConversionSection title="Convert to PDF" options={toPdf} onSelect={onSelect} />
    </div>
  );
}

function ConversionSection({
  title,
  options,
  onSelect,
}: {
  title: string;
  options: ConversionOption[];
  onSelect: (option: ConversionOption) => void;
}) {
  return (
    <div>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option)}
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

// Shared "load one PDF, then run a pdfjs-based conversion" flow for the five PDF→X conversions —
// they differ only in what the actual conversion function produces (one file vs several, and the
// output extension/MIME type), which this switches on.
function PdfConversion({ id }: { id: "pdf-to-jpg" | "pdf-to-text" | "pdf-to-word" | "pdf-to-excel" | "pdf-to-pptx" }) {
  const config: Record<
    typeof id,
    {
      run: (pdf: PDFDocumentProxy, pageCount: number, baseName: string) => Promise<{ name: string; bytes: Uint8Array }[]>;
      failureMessage: string;
    }
  > = {
    "pdf-to-jpg": {
      run: async (pdf, pageCount, baseName) => {
        const images = await pdfToImages(pdf, pageCount, "jpg");
        return images.map((bytes, i) => ({
          name: images.length === 1 ? `${baseName}.jpg` : `${baseName}-page-${i + 1}.jpg`,
          bytes,
        }));
      },
      failureMessage: "Couldn't render that PDF as images.",
    },
    "pdf-to-text": {
      run: async (pdf, pageCount, baseName) => {
        const text = await pdfToText(pdf, pageCount);
        return [{ name: `${baseName}.txt`, bytes: new TextEncoder().encode(text) }];
      },
      failureMessage: "Couldn't extract text from that PDF.",
    },
    "pdf-to-word": {
      run: async (pdf, pageCount, baseName) => [{ name: `${baseName}.docx`, bytes: await pdfToDocx(pdf, pageCount) }],
      failureMessage: "Couldn't convert that PDF to Word.",
    },
    "pdf-to-excel": {
      run: async (pdf, pageCount, baseName) => [{ name: `${baseName}.xlsx`, bytes: await pdfToXlsx(pdf, pageCount) }],
      failureMessage: "Couldn't convert that PDF to Excel.",
    },
    "pdf-to-pptx": {
      run: async (pdf, pageCount, baseName) => [{ name: `${baseName}.pptx`, bytes: await pdfToPptx(pdf, pageCount) }],
      failureMessage: "Couldn't convert that PDF to PowerPoint.",
    },
  };

  return <PdfToXFlow {...config[id]} />;
}
