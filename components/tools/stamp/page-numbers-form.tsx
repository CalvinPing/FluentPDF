"use client";

import { useState } from "react";
import { PdfConfigFlow } from "@/components/tools/pdf-config-flow";
import { TextField, NumberField, SelectField } from "@/components/tools/form-fields";
import type { StampPosition } from "@/lib/pdf/stamp";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";

const POSITIONS: { value: StampPosition; label: string }[] = [
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "top-left", label: "Top left" },
];

export function PageNumbersForm() {
  const [position, setPosition] = useState<StampPosition>("bottom-center");
  const [format, setFormat] = useState("Page {n} of {total}");
  const [startAt, setStartAt] = useState(1);

  return (
    <PdfConfigFlow
      outputSuffix="-numbered"
      applyLabel="Add page numbers"
      applyDisabled={format.trim().length === 0}
      failureMessage="Couldn't number those pages — please check the file."
      run={(bytes) => getPdfWorker().addPageNumbers(bytes, { position, format, startAt })}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <TextField id="page-number-format" label="Format" value={format} onChange={setFormat} placeholder="Page {n} of {total}" />
        </div>
        <NumberField id="page-number-start" label="Start at" value={startAt} onChange={setStartAt} min={0} max={9999} />
        <div className="sm:col-span-3">
          <SelectField id="page-number-position" label="Position" value={position} onChange={setPosition} options={POSITIONS} />
        </div>
      </div>
      <p className="mt-2 text-xs text-foreground-subtle">
        {"Use {n} for the page number and {total} for the page count."}
      </p>
    </PdfConfigFlow>
  );
}
