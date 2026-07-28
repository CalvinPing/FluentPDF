"use client";

import { useState } from "react";
import { Loader2, Repeat } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";
import { Button } from "@/components/ui/button";
import { LoadedFileBar } from "@/components/tool-shell/loaded-file-bar";
import { downloadBytes, readFileAsBytes, stripExtension } from "@/lib/download";
import { useToastStore } from "@/lib/toast-store";

/** Shared "load one non-PDF file, convert it, download a PDF" flow for Word→PDF and HTML→PDF —
 *  they only differ in accepted file type and the actual conversion function. */
export function FileToPdfFlow({
  accept,
  dropLabel,
  dropHint,
  outputSuffix,
  convert,
}: {
  accept: string;
  dropLabel: string;
  dropHint: string;
  /** Appended to the source filename for the downloaded PDF's name, e.g. "-converted". */
  outputSuffix: string;
  convert: (bytes: Uint8Array) => Promise<Uint8Array>;
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

  const handleConvert = async () => {
    if (!bytes) return;
    setBusy(true);
    try {
      const out = await convert(bytes);
      downloadBytes(out, `${stripExtension(name ?? "document")}${outputSuffix}.pdf`);
      push("success", "PDF downloaded.");
    } catch {
      push("error", "Couldn't convert that file — please check it's valid and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {!bytes && <Dropzone onFiles={onFiles} accept={accept} label={dropLabel} hint={dropHint} />}

      {bytes && (
        <div className="flex flex-col gap-6">
          <LoadedFileBar name={name ?? "document"} onChangeFile={changeFile} />
          <div className="flex justify-end">
            <Button onClick={handleConvert} disabled={busy} size="lg">
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Repeat size={18} />}
              {busy ? "Converting…" : "Convert to PDF"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
