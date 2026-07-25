"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Scissors, Loader2, CheckSquare, Square, FileOutput, FolderOutput } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { ToolIntro } from "@/components/tool-shell/tool-intro";
import { Button } from "@/components/ui/button";
import { LoadedFileBar } from "@/components/tool-shell/loaded-file-bar";
import { PageThumb } from "@/components/tools/page-thumb";
import { usePdfDocument } from "@/lib/hooks/use-pdf-document";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";
import { downloadBytes, readFileAsBytes, stripExtension } from "@/lib/download";
import { zipFiles } from "@/lib/zip";
import { pluralize } from "@/lib/pluralize";
import { useToastStore } from "@/lib/toast-store";

export default function SplitPage() {
  const [name, setName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<"extract" | "split" | null>(null);
  const push = useToastStore((s) => s.push);

  const changeFile = () => {
    setName(null);
    setBytes(null);
    setSelected(new Set());
  };

  const { pdf, pageCount } = usePdfDocument(bytes, changeFile);

  const onFiles = async ([file]: File[]) => {
    setName(file.name);
    setSelected(new Set());
    setBytes(await readFileAsBytes(file));
  };

  const isDraggingRef = useRef(false);
  const dragAddsRef = useRef(true);

  useEffect(() => {
    const stopDrag = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => {
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, []);

  const startDrag = (index: number) => {
    isDraggingRef.current = true;
    setSelected((prev) => {
      const willAdd = !prev.has(index);
      dragAddsRef.current = willAdd;
      const next = new Set(prev);
      if (willAdd) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  const dragEnter = (index: number) => {
    if (!isDraggingRef.current) return;
    setSelected((prev) => {
      if (prev.has(index) === dragAddsRef.current) return prev;
      const next = new Set(prev);
      if (dragAddsRef.current) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  const selectNone = () => setSelected(new Set());

  const sortedSelected = useMemo(() => Array.from(selected).sort((a, b) => a - b), [selected]);

  const extractSelected = async () => {
    if (!bytes || sortedSelected.length === 0) {
      push("error", "Select at least one page first.");
      return;
    }
    setBusy("extract");
    try {
      const [out] = await getPdfWorker().splitPdf(bytes, [sortedSelected]);
      downloadBytes(out, `${stripExtension(name ?? "document")}-selected.pdf`);
      push("success", `Extracted ${sortedSelected.length} page${sortedSelected.length === 1 ? "" : "s"}.`);
    } catch {
      push("error", "Couldn't extract those pages — please check the file.");
    } finally {
      setBusy(null);
    }
  };

  const splitEveryPage = async () => {
    if (!bytes || pageCount === 0) return;
    setBusy("split");
    try {
      const ranges = Array.from({ length: pageCount }, (_, i) => [i]);
      const outputs = await getPdfWorker().splitPdf(bytes, ranges);
      const base = stripExtension(name ?? "document");
      if (outputs.length === 1) {
        downloadBytes(outputs[0], `${base}-page-1.pdf`);
      } else {
        const zipped = await zipFiles(
          outputs.map((bytesOut, i) => ({ name: `${base}-page-${i + 1}.pdf`, bytes: bytesOut })),
        );
        downloadBytes(zipped, `${base}-split.zip`, "application/zip");
      }
      push("success", `Split into ${pluralize(pageCount, "file")}.`);
    } catch {
      push("error", "Couldn't split that file — please check it's a valid PDF.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <ToolIntro
        icon={Scissors}
        title="Split PDFs"
        description="Pull specific pages out, or break the whole file into one PDF per page."
      />

      {!bytes && <Dropzone onFiles={onFiles} label="Drop a PDF here, or click to browse" />}

      {bytes && pageCount > 0 && (
        <>
          <LoadedFileBar
            name={name ?? "document.pdf"}
            detail={`${pluralize(pageCount, "page")}, ${selected.size} selected`}
            onChangeFile={changeFile}
            actions={
              <>
                <button
                  type="button"
                  onClick={selectAll}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-muted hover:text-foreground"
                >
                  <CheckSquare size={14} /> Select all
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-muted hover:text-foreground"
                >
                  <Square size={14} /> Clear
                </button>
              </>
            }
          />

          <p className="mt-4 text-xs text-foreground-subtle">
            Click a page to select it, or click and drag across several to select many at once.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: pageCount }, (_, i) => (
              <PageThumb
                key={i}
                pdf={pdf}
                pageNumber={i + 1}
                selected={selected.has(i)}
                onDragStart={() => startDrag(i)}
                onDragEnter={() => dragEnter(i)}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button variant="outline" onClick={splitEveryPage} disabled={busy !== null} size="lg">
              {busy === "split" ? <Loader2 size={18} className="animate-spin" /> : <FolderOutput size={18} />}
              {busy === "split" ? "Splitting…" : "Split every page"}
            </Button>
            <Button onClick={extractSelected} disabled={busy !== null || selected.size === 0} size="lg">
              {busy === "extract" ? <Loader2 size={18} className="animate-spin" /> : <FileOutput size={18} />}
              {busy === "extract" ? "Extracting…" : `Extract ${selected.size > 0 ? `${selected.size} ` : ""}selected`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
