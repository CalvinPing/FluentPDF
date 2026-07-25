import { Upload, MousePointerClick, Download } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

const steps = [
  {
    icon: Upload,
    title: "Drop in your file",
    description: "Drag a PDF into any tool, or click to browse. Nothing uploads to a server.",
  },
  {
    icon: MousePointerClick,
    title: "Make your changes",
    description: "Merge, split, rotate, annotate, or place fields — see every edit instantly.",
  },
  {
    icon: Download,
    title: "Export instantly",
    description: "Download the finished PDF straight from your browser. No account needed.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-background-secondary py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <div className="mb-5 flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.14em] text-primary">
            <span className="h-px w-5 bg-primary" aria-hidden />
            Process
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Three steps. No learning curve.
          </h2>
        </Reveal>

        <RevealGroup className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3">
          {steps.map((step, i) => (
            <RevealItem key={step.title} className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary">
                <step.icon size={20} />
              </div>
              <span className="mt-5 block font-mono text-xs tracking-wide text-foreground-subtle">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                {step.description}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
