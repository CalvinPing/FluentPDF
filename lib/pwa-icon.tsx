import type { ReactElement } from "react";

// Matches components/ui/logo.tsx's mark (a rounded square in the app's --primary copper with a
// warm-white Lucide "Layers" glyph) so the installed app icon and the in-app logo read as the
// same brand, not two different marks. Paths copied verbatim from lucide-react's layers.mjs.
const LAYERS_PATHS = [
  "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
  "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
  "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
];

/**
 * @param rounded Regular app icons ("any" purpose) match the in-app logo's rounded square with
 * transparent corners. Maskable icons must be a full-bleed solid square instead — the OS applies
 * its own shape mask, and transparent corners would just show through as a hole.
 * @param glyphScale Fraction of the icon's size the glyph occupies. Maskable icons need a smaller
 * value to keep the glyph inside the ~80% "safe zone" that survives circular/squircle cropping.
 */
export function pwaIconMark({
  size,
  rounded,
  glyphScale,
}: {
  size: number;
  rounded: boolean;
  glyphScale: number;
}): ReactElement {
  const glyphSize = size * glyphScale;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#b8622a",
        borderRadius: rounded ? size * 0.22 : 0,
      }}
    >
      <svg
        width={glyphSize}
        height={glyphSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff8f0"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {LAYERS_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </div>
  );
}
