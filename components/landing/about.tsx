import { Reveal } from "@/components/motion/reveal";

export function About() {
  return (
    <section id="about" className="border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <div className="mb-5 flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.14em] text-primary">
            <span className="h-px w-5 bg-primary" aria-hidden />
            About
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Why this exists
          </h2>

          <div className="mt-6 space-y-5 text-base leading-relaxed text-foreground-muted">
            <p>
              Most online PDF tools work the same way: you upload your file, a server
              somewhere processes it, and you download the result. That&apos;s a strange
              default for documents that are often someone&apos;s lease, ID, or signed
              contract — the exact files people are least eager to hand to a server they
              can&apos;t see.
            </p>
            <p>
              Fluent PDF was built the other way around. Merging, splitting, form
              detection, and password protection all run as real code in your browser
              tab — the same PDF and cryptography libraries a server would use, just
              never leaving your device. There&apos;s no upload step to skip, because
              there&apos;s nowhere for your file to go.
            </p>
            <p>
              No accounts, no watermark, no server to keep trusting. Install it as an
              app and it keeps working offline, because it was never depending on a
              connection in the first place.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
