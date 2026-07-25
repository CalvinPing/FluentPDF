"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ListChecks, Loader2, Lock, Redo2, Sparkles, Undo2 } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { ToolIntro } from "@/components/tool-shell/tool-intro";
import { Button } from "@/components/ui/button";
import { FieldPalette } from "@/components/tools/field-palette";
import { FieldPageCanvas } from "@/components/tools/field-page-canvas";
import { FieldDetailsPanel } from "@/components/tools/field-details-panel";
import { FieldPageNav } from "@/components/tools/field-page-nav";
import { ZoomControls } from "@/components/tools/zoom-controls";
import { usePdfDocument } from "@/lib/hooks/use-pdf-document";
import type { FieldRect } from "@/lib/pdf/field-geometry";
import {
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_COLOR,
  DEFAULT_BORDER_COLOR,
  DEFAULT_BORDER_WIDTH,
  type EditableField,
  type NewFieldType,
} from "@/lib/pdf/fields";
import { detectVisualFieldCandidates } from "@/lib/pdf/detect-fields";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";
import { downloadBytes, readFileAsBytes, stripExtension } from "@/lib/download";
import { pluralize } from "@/lib/pluralize";
import { useToastStore } from "@/lib/toast-store";
import { LoadedFileBar } from "@/components/tool-shell/loaded-file-bar";

const MIN_CREATE_DRAG_RATIO = 0.008;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const DEFAULT_BASE_WIDTH = 448;
const DEFAULT_BASE_HEIGHT = 600;
const HISTORY_COALESCE_MS = 500;
const HISTORY_LIMIT = 100;
const OVERLAP_THRESHOLD = 0.15;

/** Intersection-over-union of two same-page fields' ratio rects. */
function overlapRatio(a: EditableField, b: EditableField): number {
  if (a.pageIndex !== b.pageIndex) return 0;
  const ax2 = a.xRatio + a.widthRatio;
  const ay2 = a.yRatio + a.heightRatio;
  const bx2 = b.xRatio + b.widthRatio;
  const by2 = b.yRatio + b.heightRatio;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.xRatio, b.xRatio));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.yRatio, b.yRatio));
  const intersection = ix * iy;
  if (intersection <= 0) return 0;
  const union = a.widthRatio * a.heightRatio + b.widthRatio * b.heightRatio - intersection;
  return union > 0 ? intersection / union : 0;
}

export default function FieldsPage() {
  const [name, setName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  // null = not checked yet. Kept separate from `bytes` so detection can't race ahead of the
  // check and run against a file we haven't confirmed is safe to touch yet.
  const [isEncrypted, setIsEncrypted] = useState<boolean | null>(null);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [placingType, setPlacingType] = useState<NewFieldType | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [baseWidth, setBaseWidth] = useState(DEFAULT_BASE_WIDTH);
  const [baseHeight, setBaseHeight] = useState(DEFAULT_BASE_HEIGHT);
  const [past, setPast] = useState<EditableField[][]>([]);
  const [future, setFuture] = useState<EditableField[][]>([]);
  const [shellHeight, setShellHeight] = useState<number | null>(null);
  const lastCommitRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const push = useToastStore((s) => s.push);

  const changeFile = () => {
    setName(null);
    setBytes(null);
    setIsEncrypted(null);
    setFields([]);
    setSelectedFieldId(null);
    setZoom(1);
    setPast([]);
    setFuture([]);
  };

  const { pdf, pageCount } = usePdfDocument(bytes, changeFile, true);

  // On desktop, size the whole workspace to exactly fill the remaining viewport height so the
  // page itself never scrolls — only the PDF canvas (and side columns, as a safety net) do.
  // Below the lg breakpoint the columns stack, so natural page scroll is left alone instead.
  useEffect(() => {
    if (!bytes) return;
    const el = shellRef.current;
    if (!el) return;
    const recompute = () => {
      if (window.innerWidth < 1024) {
        setShellHeight(null);
        return;
      }
      const top = el.getBoundingClientRect().top;
      // `main`'s own bottom padding sits after the shell in the box model, so it has to be
      // subtracted too — otherwise the page ends up exactly that much taller than the viewport.
      const mainEl = el.closest("main");
      const bottomPadding = mainEl ? parseFloat(getComputedStyle(mainEl).paddingBottom) || 0 : 0;
      setShellHeight(Math.max(420, window.innerHeight - top - bottomPadding));
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [bytes, pageCount]);

  // Records `prevFields` as an undo checkpoint. Rapid-fire changes (dragging, resizing, typing)
  // within HISTORY_COALESCE_MS of each other collapse into a single checkpoint — otherwise every
  // pointermove during a drag would be its own undo step. `force` bypasses coalescing for
  // discrete actions (create/remove/detect) that should always be their own step.
  const commit = (prevFields: EditableField[], force = false) => {
    const now = Date.now();
    if (force || now - lastCommitRef.current > HISTORY_COALESCE_MS) {
      setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), prevFields]);
      setFuture([]);
    }
    lastCommitRef.current = now;
  };

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      setFuture((f) => [...f, fields]);
      setFields(p[p.length - 1]);
      setSelectedFieldId(null);
      lastCommitRef.current = 0;
      return p.slice(0, -1);
    });
  }, [fields]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      setPast((p) => [...p, fields]);
      setFields(f[f.length - 1]);
      setSelectedFieldId(null);
      lastCommitRef.current = 0;
      return f.slice(0, -1);
    });
  }, [fields]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isEditable) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect?.width) setBaseWidth(rect.width);
      if (rect?.height) setBaseHeight(rect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
    // wrapperRef's element only exists once a file is loaded — re-run so the observer
    // actually attaches once the gray box appears, instead of only on initial mount.
  }, [bytes, pageCount]);

  const fitToWidth = () => setZoom(1);

  const fitToHeight = () => {
    const canvas = wrapperRef.current?.querySelector("canvas");
    const pageBlock = canvas?.closest(".mx-auto");
    if (!canvas || !pageBlock || !baseWidth || !baseHeight) return;
    const canvasRect = canvas.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height) return;
    // The "Page N" label sits above the canvas inside the same block, so the canvas can't
    // claim the full available height for itself — subtract the label's measured height first.
    const chromeHeight = pageBlock.getBoundingClientRect().height - canvasRect.height;
    const aspectRatio = canvasRect.height / canvasRect.width;
    const nextZoom = (baseHeight - chromeHeight) / (baseWidth * aspectRatio);
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoom)));
  };

  const onFiles = async ([file]: File[]) => {
    const fileBytes = await readFileAsBytes(file);
    setName(file.name);
    setBytes(fileBytes);
    setIsEncrypted(null);
    setFields([]);
    setSelectedFieldId(null);
    setZoom(1);
    setPast([]);
    setFuture([]);
  };

  // Checked separately from parsing/rendering (which pdfjs handles fine even for encrypted
  // files) so field detection and placement can be locked down the instant we know, rather than
  // only failing later at save time.
  useEffect(() => {
    if (!bytes) return;
    let cancelled = false;
    getPdfWorker().isPdfEncrypted(bytes).then((encrypted) => {
      if (!cancelled) setIsEncrypted(encrypted);
    });
    return () => {
      cancelled = true;
    };
  }, [bytes]);

  // Runs automatically the instant a file loads — finds fields that genuinely already exist
  // in the PDF's AcroForm. This never touches the layout-guessing scan; that only happens
  // when the user deliberately asks for it via the Smart Detect button below.
  const detectExistingFields = useCallback(async () => {
    if (!bytes || !pdf || pageCount === 0 || isEncrypted !== false) return;
    setDetecting(true);
    try {
      const found = await getPdfWorker().detectFormFields(bytes);
      commit(fields, true);
      setFields((prev) => [...prev.filter((f) => f.origin !== "detected"), ...found]);
      push(
        found.length > 0 ? "success" : "info",
        found.length > 0
          ? `Found ${found.length} existing field${found.length === 1 ? "" : "s"} — click one to adjust it.`
          : "No embedded fields — click Smart Detect to suggest some from the page layout.",
      );
    } catch {
      push("error", "Couldn't scan that file for fields.");
    } finally {
      setDetecting(false);
    }
  }, [bytes, pdf, pageCount, isEncrypted, fields, push]);

  const autoDetectedRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!bytes || !pdf || pageCount === 0 || isEncrypted !== false) return;
    if (autoDetectedRef.current === bytes) return;
    autoDetectedRef.current = bytes;
    detectExistingFields();
  }, [bytes, pdf, pageCount, isEncrypted, detectExistingFields]);

  // The Smart Detect button: guesses where fields belong from the page's text layout
  // (checkbox brackets/glyphs, radio parens/glyphs, underscore blanks, "Label:" gaps).
  // Re-clicking replaces only the fields still marked `autoDetected` from the last run —
  // untouched suggestions get refreshed, but anything the user has since edited (which
  // clears the flag — see `updateField`) is left alone. Suggestions that would land on top
  // of a kept field are dropped too, so promoting a suggestion doesn't leave a duplicate
  // sitting right under it on the next scan.
  const runSmartDetect = async () => {
    if (!bytes || !pdf || pageCount === 0 || isEncrypted !== false) return;
    setDetecting(true);
    try {
      const rawSuggestions = await detectVisualFieldCandidates(pdf, pageCount);
      const kept = fields.filter((f) => !f.autoDetected);
      const suggestions = rawSuggestions.filter(
        (s) => !kept.some((k) => overlapRatio(k, s) > OVERLAP_THRESHOLD),
      );
      commit(fields, true);
      setFields((prev) => [...prev.filter((f) => !f.autoDetected), ...suggestions]);
      push(
        suggestions.length > 0 ? "success" : "info",
        suggestions.length > 0
          ? `Suggested ${suggestions.length} field${suggestions.length === 1 ? "" : "s"} from the page layout — review and adjust as needed.`
          : "No likely fields found — place your own manually.",
      );
    } catch {
      push("error", "Couldn't scan that file for fields.");
    } finally {
      setDetecting(false);
    }
  };

  const onCreateField = (pageIndex: number, rect: FieldRect) => {
    if (!placingType || isEncrypted !== false) return;
    // A plain click (no meaningful drag) places nothing — only an actual drag defines a field's size.
    if (rect.widthRatio < MIN_CREATE_DRAG_RATIO || rect.heightRatio < MIN_CREATE_DRAG_RATIO) return;

    const newCount = fields.filter((f) => f.origin === "new").length;
    const field: EditableField = {
      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      origin: "new",
      kind: placingType,
      name: `${placingType}_${newCount + 1}`,
      pageIndex,
      value: placingType === "radio" ? "Option 1" : "",
      options: placingType === "dropdown" ? ["Option 1", "Option 2"] : undefined,
      fontFamily: DEFAULT_FONT,
      fontSize: DEFAULT_FONT_SIZE,
      textColor: DEFAULT_TEXT_COLOR,
      borderColor: DEFAULT_BORDER_COLOR,
      borderWidth: DEFAULT_BORDER_WIDTH,
      ...rect,
    };
    commit(fields, true);
    setFields((prev) => [...prev, field]);
    setSelectedFieldId(field.id);
  };

  const updateField = (id: string, patch: Partial<EditableField>) => {
    commit(fields);
    // Any manual touch — drag, resize, or a details-panel edit — "promotes" a suggested field
    // to a normal one, so the next Smart Detect run leaves it alone instead of replacing it.
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch, autoDetected: false } : f)));
  };

  const removeField = (id: string) => {
    commit(fields, true);
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedFieldId((prev) => (prev === id ? null : prev));
  };

  const handleSave = async () => {
    if (!bytes || fields.length === 0) {
      push("error", "Detect or place at least one field first.");
      return;
    }
    setSaving(true);
    try {
      const out = await getPdfWorker().applyFieldEdits(bytes, fields);
      downloadBytes(out, `${stripExtension(name ?? "document")}-fillable.pdf`);
      push("success", "Fillable PDF downloaded.");
    } catch (err) {
      // Comlink reconstructs thrown errors as plain Error instances on this side of the worker
      // boundary — the original EncryptedPdfError class identity doesn't survive, but its .name
      // (set in the constructor) does, so that's what has to be checked instead of instanceof.
      push(
        "error",
        err instanceof Error && err.name === "EncryptedPdfError"
          ? "This PDF is password-protected, so it can't be saved with new fields. Remove the password/security in a tool like Adobe Acrobat first, then re-upload."
          : "Couldn't save those fields — please check the file.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onJumpToPage = (pageIndex: number) => {
    document.getElementById(`field-page-${pageIndex}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;
  const pageWidth = Math.round(baseWidth * zoom);
  const fieldCountByPage = Array.from(
    { length: pageCount },
    (_, i) => fields.filter((f) => f.pageIndex === i).length,
  );

  return (
    <div>
      <ToolIntro
        icon={ListChecks}
        title="Form Fields"
        description="Auto-detect fillable fields already in the PDF, or place your own — click a field to edit its details."
      />

      {!bytes && <Dropzone onFiles={onFiles} label="Drop a PDF here, or click to browse" />}

      {bytes && (pageCount > 0 || isEncrypted === true) && (
        <div
          ref={shellRef}
          className="flex flex-col overflow-hidden"
          style={{ height: shellHeight ?? undefined }}
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <LoadedFileBar
              name={name ?? "document.pdf"}
              detail={pageCount > 0 ? pluralize(pageCount, "page") : undefined}
              onChangeFile={changeFile}
            />

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={runSmartDetect} disabled={detecting || isEncrypted !== false} size="sm">
                {detecting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {detecting ? "Scanning…" : "Smart detect"}
              </Button>
              <Button onClick={handleSave} disabled={saving || fields.length === 0 || isEncrypted !== false} size="sm">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <ListChecks size={15} />}
                {saving ? "Saving…" : "Save PDF"}
              </Button>
            </div>
          </div>

          <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background-secondary p-1">
              <button
                type="button"
                onClick={undo}
                disabled={past.length === 0}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
                className="rounded-md p-1.5 text-foreground-muted hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <Undo2 size={15} />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={future.length === 0}
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
                className="rounded-md p-1.5 text-foreground-muted hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <Redo2 size={15} />
              </button>
            </div>

            <ZoomControls
              zoom={zoom}
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={ZOOM_STEP}
              onZoomChange={setZoom}
              onFitWidth={fitToWidth}
              onFitHeight={fitToHeight}
            />
          </div>

          {placingType && (
            <p className="mt-2 shrink-0 text-xs text-foreground-subtle">
              {`Click and drag on any page to place a ${placingType} field. Right-click drag to pan.`}
            </p>
          )}

          <div className="mt-3 flex min-h-0 flex-1 flex-col items-stretch gap-4 lg:flex-row">
            <div className="w-full shrink-0 lg:h-full lg:w-24 lg:overflow-y-auto">
              <FieldPalette active={placingType} onSelect={setPlacingType} disabled={isEncrypted !== false} />
            </div>

            <div className="relative min-w-0 flex-1 lg:h-full">
              <div
                ref={wrapperRef}
                data-scroll-container
                // overflow-y is always "scroll" (not "auto") so the scrollbar's width is reserved
                // whether or not it's needed — otherwise, right at the zoom level where a page's
                // height crosses the "needs scroll" threshold, the scrollbar toggling on/off
                // changes this element's own measured width (picked up by the ResizeObserver
                // below), which recomputes the zoomed page width, which can toggle the scrollbar
                // back — an infinite layout feedback loop that keeps the canvas re-rendering and
                // never lets its fade-in finish.
                className={`max-h-[65vh] w-full overflow-x-auto overflow-y-scroll rounded-xl border border-border bg-background-secondary/40 p-4 transition-[filter,opacity] duration-200 lg:h-full lg:max-h-none ${
                  isEncrypted === true ? "pointer-events-none opacity-50 grayscale" : ""
                }`}
              >
                <div className="flex flex-col gap-8">
                  {Array.from({ length: pageCount }, (_, i) => (
                    <div key={i} id={`field-page-${i}`}>
                      <FieldPageCanvas
                        pdf={pdf}
                        pageNumber={i + 1}
                        pageIndex={i}
                        width={pageWidth}
                        fields={fields.filter((f) => f.pageIndex === i)}
                        selectedFieldId={selectedFieldId}
                        placingType={placingType}
                        onSelectField={setSelectedFieldId}
                        onDeselect={() => setSelectedFieldId(null)}
                        onUpdateField={updateField}
                        onCreateField={onCreateField}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {isEncrypted === true && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-destructive shadow-sm ring-1 ring-border">
                    <Lock size={20} />
                  </div>
                  <div className="max-w-xs rounded-xl border border-border bg-background px-5 py-4 shadow-lg">
                    <p className="font-medium text-foreground">This PDF is password-protected</p>
                    <p className="mt-1 text-sm text-foreground-muted">
                      Fields can&apos;t be detected or added to an encrypted PDF. Remove its
                      password/security in a tool like Adobe Acrobat, then re-upload.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full shrink-0 lg:h-full lg:w-52 lg:overflow-y-auto">
              <AnimatePresence mode="wait">
                {selectedField ? (
                  <motion.div
                    key={selectedField.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <FieldDetailsPanel
                      field={selectedField}
                      onChange={updateField}
                      onRemove={selectedField.origin === "new" ? removeField : undefined}
                      onClose={() => setSelectedFieldId(null)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="nav"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <FieldPageNav
                      pdf={pdf}
                      pageCount={pageCount}
                      fieldCountByPage={fieldCountByPage}
                      onJumpToPage={onJumpToPage}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
