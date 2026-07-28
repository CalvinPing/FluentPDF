"use client";

import { useState } from "react";
import { PdfConfigFlow } from "@/components/tools/pdf-config-flow";
import { TextField } from "@/components/tools/form-fields";
import { getPdfWorker } from "@/lib/workers/pdf-worker-client";

export function HeaderFooterForm() {
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");

  return (
    <PdfConfigFlow
      outputSuffix="-headers"
      applyLabel="Add header & footer"
      applyDisabled={headerText.trim().length === 0 && footerText.trim().length === 0}
      failureMessage="Couldn't add that header/footer — please check the file."
      run={(bytes) => getPdfWorker().addHeaderFooter(bytes, { headerText, footerText })}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField id="header-text" label="Header text" value={headerText} onChange={setHeaderText} placeholder="Leave blank to skip" />
        <TextField id="footer-text" label="Footer text" value={footerText} onChange={setFooterText} placeholder="Leave blank to skip" />
      </div>
    </PdfConfigFlow>
  );
}
