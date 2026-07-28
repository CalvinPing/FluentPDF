"use client";

import { useRef, useState } from "react";
import { Reorder } from "framer-motion";
import { PenLine, Loader2, Type, Info } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { ToolIntro } from "@/components/tool-shell/tool-intro";
import { Button } from "@/components/ui/button";
import { PdfCanvas } from "@/components/pdf/pdf-canvas";
import { EditPageRow, type EditPageState } from "@/components/tools/edit-page-row";
import { AnnotationOverlay, type AnnotationDraft } from "@/components/tools/annotation-overlay";
import { LoadedFileBar } from "@/components/tool-shell/loaded-file-bar";
import { TextField } from "@/components/tools/form-fields";
import { usePdfDocument } from "@/lib/hooks/use-pdf-document";
import type { TextAnnotation } from "@/lib/pdf/edit";
import type { PdfMetadata } from "@/lib/pdf/metadata";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";
import { downloadBytes, readFileAsBytes, stripExtension } from "@/lib/download";
import { pluralize } from "@/lib/pluralize";
import { useToastStore } from "@/lib/toast-store";

const FONT_SIZE = 14;
const EMPTY_METADATA: PdfMetadata = { title: "", author: "", subject: "", keywords: "" };

export default function EditPage() {
  const [name, setName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<EditPageState[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Record<string, AnnotationDraft[]>>({});
  const [metadata, setMetadata] = useState<PdfMetadata>(EMPTY_METADATA);
  const [exporting, setExporting] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [initSnapshot, setInitSnapshot] = useState<{ bytes: Uint8Array | null; pageCount: number }>({
    bytes: null,
    pageCount: 0,
  });
  const push = useToastStore((s) => s.push);

  const changeFile = () => {
    setName(null);
    setBytes(null);
    setAnnotations({});
    setMetadata(EMPTY_METADATA);
  };

  const { pdf, pageCount } = usePdfDocument(bytes, changeFile);

  const onFiles = async ([file]: File[]) => {
    const loaded = await readFileAsBytes(file);
    setName(file.name);
    setAnnotations({});
    setBytes(loaded);
    getPdfWorker()
      .getMetadata(loaded)
      .then(setMetadata)
      .catch(() => {});
  };

  // Re-initialize the editable page list whenever a new document loads or its page count
  // becomes known (React's "adjust state during render" pattern — `pages` is derived from
  // `pageCount` but then locally mutable, so it can't just be computed inline).
  if (bytes !== initSnapshot.bytes || pageCount !== initSnapshot.pageCount) {
    setInitSnapshot({ bytes, pageCount });
    if (pageCount > 0) {
      const initial = Array.from({ length: pageCount }, (_, i) => ({
        id: `p-${i}`,
        originalIndex: i,
        rotation: 0,
      }));
      setPages(initial);
      setSelectedId(initial[0].id);
    } else {
      setPages([]);
      setSelectedId(null);
    }
  }

  const rotatePage = (id: string) =>
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p)));

  const deletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    setAnnotations((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedId((prev) => (prev === id ? null : prev));
  };

  const selectedPage = pages.find((p) => p.id === selectedId) ?? null;
  const selectedAnnotations = selectedId ? (annotations[selectedId] ?? []) : [];

  const addAnnotation = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedId || !canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const xRatio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const yRatio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    const draft: AnnotationDraft = {
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      xRatio,
      yRatio,
      text: "",
    };
    setAnnotations((prev) => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), draft] }));
  };

  const updateAnnotation = (id: string, patch: Partial<AnnotationDraft>) => {
    if (!selectedId) return;
    setAnnotations((prev) => ({
      ...prev,
      [selectedId]: (prev[selectedId] ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };

  const removeAnnotation = (id: string) => {
    if (!selectedId) return;
    setAnnotations((prev) => ({
      ...prev,
      [selectedId]: (prev[selectedId] ?? []).filter((a) => a.id !== id),
    }));
  };

  const handleExport = async () => {
    if (!bytes || pages.length === 0) return;
    setExporting(true);
    try {
      const order = pages.map((p) => ({ originalIndex: p.originalIndex, rotationDelta: p.rotation }));
      const textAnnotations: TextAnnotation[] = pages.flatMap((p, pageIndex) =>
        (annotations[p.id] ?? [])
          .filter((a) => a.text.trim().length > 0)
          .map((a) => ({
            pageIndex,
            xRatio: a.xRatio,
            yRatio: a.yRatio,
            text: a.text,
            fontSize: FONT_SIZE,
          })),
      );
      const edited = await getPdfWorker().applyPageEdits(bytes, order, textAnnotations);
      const out = await getPdfWorker().setMetadata(edited, metadata);
      downloadBytes(out, `${stripExtension(name ?? "document")}-edited.pdf`);
      push("success", "Edited PDF downloaded.");
    } catch {
      push("error", "Couldn't apply those edits — please check the file.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <ToolIntro
        icon={PenLine}
        title="Edit Pages"
        description="Rotate, delete, and reorder pages — click a page below to drop in text."
      />

      {!bytes && <Dropzone onFiles={onFiles} label="Drop a PDF here, or click to browse" />}

      {bytes && pages.length > 0 && (
        <>
          <LoadedFileBar name={name ?? "document.pdf"} detail={pluralize(pages.length, "page")} onChangeFile={changeFile} />

          <Reorder.Group
            axis="x"
            values={pages}
            onReorder={setPages}
            className="no-scrollbar mt-6 flex gap-3 overflow-x-auto pb-2"
          >
            {pages.map((page, i) => (
              <EditPageRow
                key={page.id}
                page={page}
                pdf={pdf}
                index={i}
                selected={page.id === selectedId}
                onSelect={setSelectedId}
                onRotate={rotatePage}
                onDelete={deletePage}
              />
            ))}
          </Reorder.Group>

          <div className="mt-8 rounded-xl border border-border bg-background-secondary/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Info size={15} className="text-foreground-subtle" />
              Document details
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField id="meta-title" label="Title" value={metadata.title} onChange={(v) => setMetadata((m) => ({ ...m, title: v }))} placeholder="Untitled" />
              <TextField id="meta-author" label="Author" value={metadata.author} onChange={(v) => setMetadata((m) => ({ ...m, author: v }))} placeholder="Unknown" />
              <TextField id="meta-subject" label="Subject" value={metadata.subject} onChange={(v) => setMetadata((m) => ({ ...m, subject: v }))} placeholder="Optional" />
              <TextField id="meta-keywords" label="Keywords" value={metadata.keywords} onChange={(v) => setMetadata((m) => ({ ...m, keywords: v }))} placeholder="Comma-separated" />
            </div>
          </div>

          {selectedPage && (
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-2 text-sm text-foreground-muted">
                <Type size={15} />
                Click anywhere on the page to add text
              </div>
              <div
                ref={canvasContainerRef}
                onClick={addAnnotation}
                className="relative mx-auto w-full max-w-md cursor-crosshair"
              >
                <PdfCanvas
                  pdf={pdf}
                  pageNumber={selectedPage.originalIndex + 1}
                  width={640}
                  rotation={selectedPage.rotation}
                />
                {selectedAnnotations.map((a) => (
                  <AnnotationOverlay
                    key={a.id}
                    annotation={a}
                    containerRef={canvasContainerRef}
                    onChange={updateAnnotation}
                    onRemove={removeAnnotation}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <Button onClick={handleExport} disabled={exporting} size="lg">
              {exporting ? <Loader2 size={18} className="animate-spin" /> : <PenLine size={18} />}
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
