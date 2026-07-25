import { ImageResponse } from "next/og";
import { pwaIconMark } from "@/lib/pwa-icon";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export function GET() {
  return new ImageResponse(pwaIconMark({ size: 512, rounded: true, glyphScale: 0.55 }), size);
}
