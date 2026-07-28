"use client";

import { useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Loader2, Repeat } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { Button } from "@/components/ui/button";
import { LoadedFileBar } from "@/components/tool-shell/loaded-file-bar";
import { usePdfDocument } from "@/lib/hooks/use-pdf-document";
import { downloadBytes, readFileAsBytes, stripExtension } from "@/lib/download";
import { zipFiles } from "@/lib/zip";
import { pluralize } from "@/lib/pluralize";
import { useToastStore } from "@/lib/toast-store";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  txt: "text/plain",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function mimeTypeForFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

/** Shared "load one PDF, run a pdfjs-based conversion, download the result" flow for every
 *  PDF→X conversion — they only differ in what `run` actually produces. A single-file result
 *  downloads directly; a multi-file result (PDF→JPG on a multi-page PDF) gets zipped, matching
 *  how the Split tool already handles "one output file per page." */
export function PdfToXFlow({
  run,
  failureMessage,
}: {
  run: (pdf: PDFDocumentProxy, pageCount: number, baseName: string) => Promise<{ name: string; bytes: Uint8Array }[]>;
  failureMessage: string;
}) {
  const [name, setName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const push = useToastStore((s) => s.push);

  const changeFile = () => {
    setName(null);
    setBytes(null);
  };

  const { pdf, pageCount } = usePdfDocument(bytes, changeFile);

  const onFiles = async ([file]: File[]) => {
    setName(file.name);
    setBytes(await readFileAsBytes(file));
  };

  const handleConvert = async () => {
    if (!pdf || pageCount === 0) return;
    setBusy(true);
    try {
      const outputs = await run(pdf, pageCount, stripExtension(name ?? "document"));
      if (outputs.length === 1) {
        downloadBytes(outputs[0].bytes, outputs[0].name, mimeTypeForFilename(outputs[0].name));
      } else {
        const zipped = await zipFiles(outputs);
        downloadBytes(zipped, `${stripExtension(name ?? "document")}-converted.zip`, "application/zip");
      }
      push("success", "Converted — check your downloads.");
    } catch {
      push("error", failureMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {!bytes && <Dropzone onFiles={onFiles} label="Drop a PDF here, or click to browse" />}

      {bytes && (
        <div className="flex flex-col gap-6">
          <LoadedFileBar
            name={name ?? "document.pdf"}
            detail={pageCount > 0 ? pluralize(pageCount, "page") : "Reading…"}
            onChangeFile={changeFile}
          />
          <div className="flex justify-end">
            <Button onClick={handleConvert} disabled={busy || pageCount === 0} size="lg">
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Repeat size={18} />}
              {busy ? "Converting…" : "Convert"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
