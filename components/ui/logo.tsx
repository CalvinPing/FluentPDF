"use client";

import { Layers } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <Link
      href="/"
      onClick={(e) => {
        if (pathname === "/") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
      className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
        <Layers size={17} strokeWidth={2.25} />
      </span>
      <span className="text-[17px] text-foreground">Fluent PDF</span>
    </Link>
  );
}
