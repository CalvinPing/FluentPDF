import { FileText, X } from "lucide-react";

export function LoadedFileBar({
  name,
  detail,
  actions,
  onChangeFile,
}: {
  name: string;
  detail?: string;
  /** Extra controls (e.g. Split's "Select all"/"Clear") rendered before "Change file", inside
   * the same action group — so every tool's file bar shares one consistent shape. */
  actions?: React.ReactNode;
  onChangeFile: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background-secondary px-4 py-3">
      <p className="flex items-center gap-2 text-sm text-foreground-muted">
        <FileText size={15} className="shrink-0 text-foreground-subtle" />
        <span className="font-medium text-foreground">{name}</span>
        {detail && <span>— {detail}</span>}
      </p>
      <div className="flex items-center gap-2">
        {actions}
        <button
          type="button"
          onClick={onChangeFile}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-muted hover:text-foreground"
        >
          <X size={13} /> Change file
        </button>
      </div>
    </div>
  );
}
