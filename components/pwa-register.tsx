"use client";

import { useEffect } from "react";

/** Registers the offline/precache service worker (public/sw.js). Renders nothing — this is a
 * side-effect-only component, mounted once in the root layout. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration can fail (unsupported browser, blocked by an extension/policy, etc.) —
      // the app works fine without offline support, so this is silently non-fatal.
    });
  }, []);

  return null;
}
