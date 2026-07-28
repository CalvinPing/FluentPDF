"use client";

import { useState } from "react";
import { PdfConfigFlow } from "@/components/tools/pdf-config-flow";
import { TextField, NumberField } from "@/components/tools/form-fields";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";

export function WatermarkForm() {
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacityPercent, setOpacityPercent] = useState(18);
  const [rotationDegrees, setRotationDegrees] = useState(45);

  return (
    <PdfConfigFlow
      outputSuffix="-watermarked"
      applyLabel="Add watermark"
      applyDisabled={text.trim().length === 0}
      failureMessage="Couldn't add that watermark — please check the file."
      run={(bytes) =>
        getPdfWorker().addWatermark(bytes, { text, opacity: opacityPercent / 100, rotationDegrees })
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField id="watermark-text" label="Watermark text" value={text} onChange={setText} placeholder="e.g. CONFIDENTIAL" />
        </div>
        <NumberField id="watermark-opacity" label="Opacity (%)" value={opacityPercent} onChange={setOpacityPercent} min={5} max={100} />
        <NumberField id="watermark-rotation" label="Rotation (°)" value={rotationDegrees} onChange={setRotationDegrees} min={0} max={359} />
      </div>
    </PdfConfigFlow>
  );
}
