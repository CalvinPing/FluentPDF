"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Reorder } from "framer-motion";
import { Loader2, Repeat } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { Button } from "@/components/ui/button";
import { ImageFileRow, type ImageFile } from "@/components/tools/image-file-row";
import type { ImageFormat } from "@/lib/pdf/images-to-pdf";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";
import { downloadBytes, readFileAsBytes } from "@/lib/download";
import { useToastStore } from "@/lib/toast-store";
import { pluralize } from "@/lib/pluralize";

function formatOf(file: File): ImageFormat | null {
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  return null;
}

export function ImagesToPdfFlow() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [building, setBuilding] = useState(false);
  const push = useToastStore((s) => s.push);

  // Preview URLs are created per-file as they're added and must be revoked when this flow is
  // left, or the blobs leak for the life of the tab. Read through a ref (synced after every
  // render, never mutated during it) rather than closing over `files` directly, since a
  // mount-only effect would otherwise only ever see the empty array it started with.
  const filesRef = useRef<ImageFile[]>([]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => {
    return () => {
      for (const file of filesRef.current) URL.revokeObjectURL(file.previewUrl);
    };
  }, []);

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      const withFormat = newFiles
        .map((f) => ({ file: f, format: formatOf(f) }))
        .filter((f): f is { file: File; format: ImageFormat } => f.format !== null);
      if (withFormat.length === 0) {
        push("error", "Only PNG and JPEG images are supported.");
        return;
      }
      try {
        const loaded = await Promise.all(
          withFormat.map(async ({ file, format }) => {
            const bytes = await readFileAsBytes(file);
            return {
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: file.name,
              bytes,
              format,
              previewUrl: URL.createObjectURL(file),
            };
          }),
        );
        setFiles((prev) => [...prev, ...loaded]);
        push("success", `Added ${pluralize(loaded.length, "image")}.`);
      } catch {
        push("error", "Couldn't read one of those images — please try again.");
      }
    },
    [push],
  );

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

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

  const handleBuild = async () => {
    if (files.length === 0) {
      push("error", "Add at least one image first.");
      return;
    }
    setBuilding(true);
    try {
      const out = await getPdfWorker().imagesToPdf(files.map((f) => ({ bytes: f.bytes, format: f.format })));
      downloadBytes(out, "images.pdf");
      push("success", "PDF downloaded.");
    } catch {
      push("error", "Couldn't build a PDF from those images.");
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div>
      <Dropzone
        multiple
        accept="image/png,image/jpeg"
        onFiles={addFiles}
        label="Drop images here, or click to add"
        hint={files.length > 0 ? `${pluralize(files.length, "image")} added — drop more to add` : "PNG or JPEG images"}
      />

      {files.length > 0 && (
        <>
          <Reorder.Group axis="y" values={files} onReorder={setFiles} className="mt-6 flex flex-col gap-3">
            {files.map((file, i) => (
              <ImageFileRow
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
            <Button onClick={handleBuild} disabled={building} size="lg">
              {building ? <Loader2 size={18} className="animate-spin" /> : <Repeat size={18} />}
              {building ? "Building…" : `Create PDF from ${pluralize(files.length, "image")}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
