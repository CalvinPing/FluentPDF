"use client";

import { useState } from "react";
import { PdfConfigFlow } from "@/components/tools/pdf-config-flow";
import { TextField, NumberField, SelectField } from "@/components/tools/form-fields";
import type { StampPosition } from "@/lib/pdf/stamp";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";

const POSITIONS: { value: StampPosition; label: string }[] = [
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "top-right", label: "Top right" },
  { value: "top-center", label: "Top center" },
  { value: "top-left", label: "Top left" },
];

export function BatesForm() {
  const [prefix, setPrefix] = useState("DOC");
  const [digits, setDigits] = useState(6);
  const [startAt, setStartAt] = useState(1);
  const [position, setPosition] = useState<StampPosition>("bottom-right");

  return (
    <PdfConfigFlow
      outputSuffix="-bates"
      applyLabel="Add Bates numbering"
      failureMessage="Couldn't number those pages — please check the file."
      run={(bytes) => getPdfWorker().addBatesNumbering(bytes, { prefix, digits, startAt, position })}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <TextField id="bates-prefix" label="Prefix" value={prefix} onChange={setPrefix} placeholder="e.g. DOC" />
        <NumberField id="bates-digits" label="Digits" value={digits} onChange={setDigits} min={1} max={12} />
        <NumberField id="bates-start" label="Start at" value={startAt} onChange={setStartAt} min={0} max={999999} />
        <SelectField id="bates-position" label="Position" value={position} onChange={setPosition} options={POSITIONS} />
      </div>
    </PdfConfigFlow>
  );
}
