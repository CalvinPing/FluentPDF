import { ShieldCheck, Cloud, Lock } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

const points = [
  {
    icon: Cloud,
    title: "Nothing is uploaded",
    description: "Every merge, split, and edit runs locally in your browser using WebAssembly-grade PDF libraries.",
  },
  {
    icon: Lock,
    title: "No accounts, no tracking",
    description: "Open a tool and start working. We don't store your documents or require a login.",
  },
  {
    icon: ShieldCheck,
    title: "Safe for sensitive files",
    description: "Contracts, forms, IDs — since files never leave your device, there's nothing to leak.",
  },
];

export function PrivacyCallout() {
  return (
    <section id="privacy" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
      <Reveal className="max-w-2xl">
        <div className="mb-5 flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.14em] text-primary">
          <span className="h-px w-5 bg-primary" aria-hidden />
          Privacy
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Private by architecture, not by policy
        </h2>
        <p className="mt-4 text-lg text-foreground-muted">
          Most online PDF tools ship your document to a server. Fluent PDF does the work directly
          in your browser tab — so your files simply never travel anywhere.
        </p>
      </Reveal>

      <RevealGroup className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {points.map((point) => (
          <RevealItem key={point.title} className="flex flex-col items-start">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <point.icon size={20} />
            </span>
            <h3 className="mt-5 text-base font-semibold text-foreground">{point.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
              {point.description}
            </p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
