import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { tools } from "@/lib/tools";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export function FeatureGrid() {
  return (
    <section id="tools" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
      <Reveal className="max-w-2xl">
        <div className="mb-5 flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.14em] text-primary">
          <span className="h-px w-5 bg-primary" aria-hidden />
          Tools
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          One workspace, every PDF task
        </h2>
        <p className="mt-4 text-lg text-foreground-muted">
          Six focused tools that cover the vast majority of what people actually need to do
          with a PDF — no bloated feature list, no confusing menus.
        </p>
      </Reveal>

      <RevealGroup className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {tools.map((tool, i) => (
          <RevealItem key={tool.slug}>
            <Link
              href={`/app/${tool.slug}`}
              className="group relative flex h-full flex-col rounded-xl border border-border bg-background-elevated p-7 transition-colors duration-200 hover:border-primary/40"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <tool.icon size={20} strokeWidth={2} />
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-foreground-subtle">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <ArrowUpRight
                    size={18}
                    className="text-foreground-subtle opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                  />
                </div>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{tool.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                {tool.description}
              </p>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
