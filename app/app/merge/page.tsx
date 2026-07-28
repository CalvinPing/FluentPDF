"use client";

import { useCallback, useState } from "react";
import { Reorder } from "framer-motion";
import { Combine, Loader2, Shuffle } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { ToolIntro } from "@/components/tool-shell/tool-intro";
import { Button } from "@/components/ui/button";
import { MergeFileRow, type MergeFile } from "@/components/tools/merge-file-row";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";
import { downloadBytes, readFileAsBytes } from "@/lib/download";
import { pluralize } from "@/lib/pluralize";
import { useToastStore } from "@/lib/toast-store";
import { cn } from "@/lib/cn";

type MergeMode = "merge" | "mix";

const MODES: { value: MergeMode; label: string; icon: typeof Combine }[] = [
  { value: "merge", label: "Merge", icon: Combine },
  { value: "mix", label: "Alternate & Mix", icon: Shuffle },
];

export default function MergePage() {
  const [mode, setMode] = useState<MergeMode>("merge");
  const [files, setFiles] = useState<MergeFile[]>([]);
  const [merging, setMerging] = useState(false);
  const push = useToastStore((s) => s.push);

  const changeMode = (next: MergeMode) => {
    setMode(next);
    setFiles([]);
  };

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      const loaded = await Promise.all(
        newFiles.map(async (f) => ({
          id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: f.name,
          bytes: await readFileAsBytes(f),
        })),
      );
      setFiles((prev) => [...prev, ...loaded]);
      push("success", `Added ${loaded.length} file${loaded.length === 1 ? "" : "s"}.`);
    },
    [push],
  );

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const moveFile = (id: string, dir: -1 | 1) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      push("error", "Add at least two PDFs to merge.");
      return;
    }
    setMerging(true);
    try {
      const merged = await getPdfWorker().mergePdfs(files.map((f) => ({ bytes: f.bytes })));
      downloadBytes(merged, "merged.pdf");
      push("success", "Merged PDF downloaded.");
    } catch {
      push("error", "Couldn't merge those files — check they're valid, unencrypted PDFs.");
    } finally {
      setMerging(false);
    }
  };

  const handleMix = async () => {
    if (files.length !== 2) {
      push("error", "Alternate & Mix needs exactly two PDFs.");
      return;
    }
    setMerging(true);
    try {
      const mixed = await getPdfWorker().alternateMix(files[0].bytes, files[1].bytes, "a");
      downloadBytes(mixed, "mixed.pdf");
      push("success", "Mixed PDF downloaded.");
    } catch {
      push("error", "Couldn't mix those files — check they're valid, unencrypted PDFs.");
    } finally {
      setMerging(false);
    }
  };

  const isMerge = mode === "merge";
  const canRun = isMerge ? files.length >= 2 : files.length === 2;

  return (
    <div>
      <ToolIntro
        icon={isMerge ? Combine : Shuffle}
        title="Merge & Mix"
        description={
          isMerge
            ? "Combine multiple PDFs into one — drag to reorder before you export."
            : "Interleave two PDFs page-for-page — first page of A, first of B, second of A, and so on."
        }
      />

      <div className="mb-6 inline-flex items-center gap-1 rounded-lg border border-border bg-background-secondary p-1">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => changeMode(m.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
              mode === m.value ? "bg-primary text-on-primary" : "text-foreground-muted hover:text-foreground",
            )}
          >
            <m.icon size={14} />
            {m.label}
          </button>
        ))}
      </div>

      <Dropzone
        multiple
        onFiles={addFiles}
        label="Drop PDFs here, or click to add"
        hint={
          files.length > 0
            ? `${files.length} file${files.length === 1 ? "" : "s"} added — drop more to add`
            : isMerge
              ? "Add two or more PDFs"
              : "Add exactly two PDFs to interleave"
        }
      />

      {files.length > 0 && (
        <>
          <Reorder.Group
            axis="y"
            values={files}
            onReorder={setFiles}
            className="mt-6 flex flex-col gap-3"
          >
            {files.map((file, i) => (
              <MergeFileRow
                key={file.id}
                file={file}
                index={i}
                total={files.length}
                onRemove={removeFile}
                onMove={moveFile}
              />
            ))}
          </Reorder.Group>

          <div className="mt-8 flex justify-end">
            <Button onClick={isMerge ? handleMerge : handleMix} disabled={!canRun || merging} size="lg">
              {merging ? <Loader2 size={18} className="animate-spin" /> : isMerge ? <Combine size={18} /> : <Shuffle size={18} />}
              {merging ? "Working…" : isMerge ? `Merge ${pluralize(files.length, "file")}` : "Mix pages"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
