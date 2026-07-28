"use client";

import { useState } from "react";
import { PdfConfigFlow } from "@/components/tools/pdf-config-flow";
import { NumberField } from "@/components/tools/form-fields";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";

// 1 inch = 72 PDF points — the margin inputs are shown in points since that's what the crop
// actually operates in, but this is worth keeping in mind when picking a value (72 ~= 1").
const DEFAULT_MARGIN = 36;

export function CropForm() {
  const [top, setTop] = useState(DEFAULT_MARGIN);
  const [right, setRight] = useState(DEFAULT_MARGIN);
  const [bottom, setBottom] = useState(DEFAULT_MARGIN);
  const [left, setLeft] = useState(DEFAULT_MARGIN);

  return (
    <PdfConfigFlow
      outputSuffix="-cropped"
      applyLabel="Crop"
      failureMessage="Couldn't crop that file — please check it's a valid PDF."
      run={(bytes) => getPdfWorker().cropPdf(bytes, { top, right, bottom, left })}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <NumberField id="crop-top" label="Top (pt)" value={top} onChange={setTop} min={0} max={500} />
        <NumberField id="crop-right" label="Right (pt)" value={right} onChange={setRight} min={0} max={500} />
        <NumberField id="crop-bottom" label="Bottom (pt)" value={bottom} onChange={setBottom} min={0} max={500} />
        <NumberField id="crop-left" label="Left (pt)" value={left} onChange={setLeft} min={0} max={500} />
      </div>
      <p className="mt-2 text-xs text-foreground-subtle">72 points ≈ 1 inch. This trims the visible page area — nothing is deleted or redrawn.</p>
    </PdfConfigFlow>
  );
}
