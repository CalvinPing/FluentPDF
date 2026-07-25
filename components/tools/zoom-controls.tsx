import { UnfoldHorizontal, UnfoldVertical } from "lucide-react";

export function ZoomControls({
  zoom,
  min,
  max,
  step,
  onZoomChange,
  onFitWidth,
  onFitHeight,
}: {
  zoom: number;
  min: number;
  max: number;
  step: number;
  onZoomChange: (zoom: number) => void;
  onFitWidth: () => void;
  onFitHeight: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-2 py-1.5">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={zoom}
        onChange={(e) => onZoomChange(Number(e.target.value))}
        aria-label="Zoom level"
        className="zoom-slider w-20 sm:w-28"
      />
      <span className="w-10 shrink-0 text-center text-xs font-medium text-foreground-muted">
        {Math.round(zoom * 100)}%
      </span>
      <div className="h-5 w-px bg-border" />
      <button
        type="button"
        onClick={onFitWidth}
        aria-label="Fit to width"
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-foreground-muted hover:bg-muted hover:text-foreground"
      >
        <UnfoldHorizontal size={13} />
        <span className="hidden sm:inline">Fit width</span>
      </button>
      <button
        type="button"
        onClick={onFitHeight}
        aria-label="Fit to height"
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-foreground-muted hover:bg-muted hover:text-foreground"
      >
        <UnfoldVertical size={13} />
        <span className="hidden sm:inline">Fit height</span>
      </button>
    </div>
  );
}
