"use client";

import { useState } from "react";
import { PdfConfigFlow } from "@/components/tools/pdf-config-flow";
import { SelectField } from "@/components/tools/form-fields";
import type { NUpCount } from "@/lib/pdf/n-up";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";

const N_UP_OPTIONS: { value: string; label: string }[] = [
  { value: "2", label: "2 pages per sheet" },
  { value: "4", label: "4 pages per sheet" },
  { value: "6", label: "6 pages per sheet" },
  { value: "9", label: "9 pages per sheet" },
];

export function NUpForm() {
  const [n, setN] = useState("4");

  return (
    <PdfConfigFlow
      outputSuffix="-n-up"
      applyLabel="Combine pages"
      failureMessage="Couldn't combine those pages — please check the file."
      run={(bytes) => getPdfWorker().nUpPdf(bytes, Number(n) as NUpCount)}
    >
      <div className="max-w-xs">
        <SelectField id="n-up-count" label="Layout" value={n} onChange={setN} options={N_UP_OPTIONS} />
      </div>
      <p className="mt-2 text-xs text-foreground-subtle">
        Pages are placed left-to-right, top-to-bottom on each sheet, scaled to fit — handy for print-friendly handouts or thumbnails.
      </p>
    </PdfConfigFlow>
  );
}
