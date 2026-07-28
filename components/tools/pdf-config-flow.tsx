"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { Button } from "@/components/ui/button";
import { LoadedFileBar } from "@/components/tool-shell/loaded-file-bar";
import { downloadBytes, readFileAsBytes, stripExtension } from "@/lib/download";
import { useToastStore } from "@/lib/toast-store";

/** Shared "load one PDF, apply a configured pdf-lib operation, download the result" flow for
 * every Stamp and Layout tool — they differ only in what config form renders (as `children`) and
 * what `run` actually does with the loaded bytes. */
export function PdfConfigFlow({
  run,
  outputSuffix,
  applyLabel = "Apply",
  applyDisabled = false,
  failureMessage = "Couldn't apply that — please check the file and your settings.",
  children,
}: {
  run: (bytes: Uint8Array) => Promise<Uint8Array>;
  /** Appended to the source filename for the downloaded PDF's name, e.g. "-watermarked". */
  outputSuffix: string;
  applyLabel?: string;
  applyDisabled?: boolean;
  failureMessage?: string;
  children?: React.ReactNode;
}) {
  const [name, setName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const push = useToastStore((s) => s.push);

  const changeFile = () => {
    setName(null);
    setBytes(null);
  };

  const onFiles = async ([file]: File[]) => {
    setName(file.name);
    setBytes(await readFileAsBytes(file));
  };

  const handleApply = async () => {
    if (!bytes) return;
    setBusy(true);
    try {
      const out = await run(bytes);
      downloadBytes(out, `${stripExtension(name ?? "document")}${outputSuffix}.pdf`);
      push("success", "PDF downloaded.");
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
          <LoadedFileBar name={name ?? "document.pdf"} onChangeFile={changeFile} />

          {children}

          <div className="flex justify-end">
            <Button onClick={handleApply} disabled={busy || applyDisabled} size="lg">
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
              {busy ? "Applying…" : applyLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
