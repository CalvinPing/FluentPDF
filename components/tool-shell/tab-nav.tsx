"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { tools } from "@/lib/tools";
import { cn } from "@/lib/cn";

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border px-4 sm:px-6 lg:px-8">
      {tools.map((tool) => {
        const href = `/app/${tool.slug}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={tool.slug}
            href={href}
            className={cn(
              "relative flex shrink-0 items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors duration-150",
              active ? "text-primary" : "text-foreground-muted hover:text-foreground",
            )}
          >
            <tool.icon size={16} />
            {tool.shortLabel}
            {active && (
              <motion.span
                layoutId="active-tab-indicator"
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
