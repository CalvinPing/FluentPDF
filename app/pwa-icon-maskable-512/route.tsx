import { ImageResponse } from "next/og";
import { pwaIconMark } from "@/lib/pwa-icon";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export function GET() {
  // Full-bleed background + a smaller glyph confined to the safe zone — see pwaIconMark's doc
  // comment for why maskable icons can't just reuse the rounded/regular variant.
  return new ImageResponse(pwaIconMark({ size: 512, rounded: false, glyphScale: 0.38 }), size);
}
