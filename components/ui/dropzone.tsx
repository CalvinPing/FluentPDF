"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { motion } from "framer-motion";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  /** Comma-separated MIME types/patterns, e.g. "application/pdf" or "image/png,image/jpeg".
   * Supports the "type/*" wildcard form. */
  accept?: string;
  label?: string;
  hint?: string;
  className?: string;
}

function matchesAccept(file: File, accept: string): boolean {
  return accept.split(",").some((pattern) => {
    const trimmed = pattern.trim();
    if (trimmed.endsWith("/*")) return file.type.startsWith(trimmed.slice(0, -1));
    return file.type === trimmed;
  });
}

export function Dropzone({
  onFiles,
  multiple = false,
  accept = "application/pdf",
  label = "Drop a PDF here, or click to browse",
  hint = "PDF files only",
  className,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const matched = Array.from(fileList).filter((f) => matchesAccept(f, accept));
      if (matched.length > 0) onFiles(multiple ? matched : [matched[0]]);
    },
    [multiple, accept, onFiles],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors duration-200",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border-strong bg-background-secondary hover:border-primary/50",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-200",
          isDragging ? "bg-primary text-on-primary" : "bg-muted text-foreground-muted",
        )}
      >
        <UploadCloud size={22} />
      </span>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-foreground-subtle">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </motion.div>
  );
}
