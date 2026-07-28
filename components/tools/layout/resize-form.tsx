"use client";

import { useState } from "react";
import { PdfConfigFlow } from "@/components/tools/pdf-config-flow";
import { SelectField } from "@/components/tools/form-fields";
import { RESIZE_PRESETS, type ResizePreset } from "@/lib/pdf/resize";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";

const PRESET_OPTIONS: { value: ResizePreset; label: string }[] = (Object.keys(RESIZE_PRESETS) as ResizePreset[]).map(
  (preset) => ({ value: preset, label: preset }),
);

export function ResizeForm() {
  const [preset, setPreset] = useState<ResizePreset>("A4");

  return (
    <PdfConfigFlow
      outputSuffix="-resized"
      applyLabel="Resize"
      failureMessage="Couldn't resize that file — please check it's a valid PDF."
      run={(bytes) => {
        const [width, height] = RESIZE_PRESETS[preset];
        return getPdfWorker().resizePdf(bytes, width, height);
      }}
    >
      <div className="max-w-xs">
        <SelectField id="resize-preset" label="Target size" value={preset} onChange={setPreset} options={PRESET_OPTIONS} />
      </div>
      <p className="mt-2 text-xs text-foreground-subtle">
        Every page is scaled to fit the new size and centered — nothing is cropped or stretched out of proportion.
      </p>
    </PdfConfigFlow>
  );
}
