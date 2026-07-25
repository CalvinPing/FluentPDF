import { ImageResponse } from "next/og";
import { pwaIconMark } from "@/lib/pwa-icon";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export function GET() {
  return new ImageResponse(pwaIconMark({ size: 192, rounded: true, glyphScale: 0.55 }), size);
}
