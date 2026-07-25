"use client";

import { useCallback, useState } from "react";
import { Reorder } from "framer-motion";
import { Combine, Loader2 } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { ToolIntro } from "@/components/tool-shell/tool-intro";
import { Button } from "@/components/ui/button";
import { MergeFileRow, type MergeFile } from "@/components/tools/merge-file-row";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";
import { downloadBytes, readFileAsBytes } from "@/lib/download";
import { pluralize } from "@/lib/pluralize";
import { useToastStore } from "@/lib/toast-store";

export default function MergePage() {
  const [files, setFiles] = useState<MergeFile[]>([]);
  const [merging, setMerging] = useState(false);
  const push = useToastStore((s) => s.push);

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

  return (
    <div>
      <ToolIntro
        icon={Combine}
        title="Merge PDFs"
        description="Combine multiple PDFs into one — drag to reorder before you export."
      />

      <Dropzone
        multiple
        onFiles={addFiles}
        label="Drop PDFs here, or click to add"
        hint={files.length > 0 ? `${files.length} file${files.length === 1 ? "" : "s"} added — drop more to add` : "Add two or more PDFs"}
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
            <Button onClick={handleMerge} disabled={files.length < 2 || merging} size="lg">
              {merging ? <Loader2 size={18} className="animate-spin" /> : <Combine size={18} />}
              {merging ? "Merging…" : `Merge ${pluralize(files.length, "file")}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
