"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, FileText } from "lucide-react";

const MotionLink = motion.create(Link);

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const fieldTags = [
  { label: "field", top: "10%", right: "6%", delay: 0.2 },
  { label: "signature", top: "80%", left: "6%", delay: 1.1 },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--color-border) 60%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-border) 60%, transparent) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 90%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(560px circle at 12% 8%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 60%)",
        }}
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={container}
        className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-4 py-24 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-32 lg:px-8"
      >
        <div>
          <motion.div
            variants={item}
            className="mb-7 flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.14em] text-primary"
          >
            <span className="h-px w-5 bg-primary" aria-hidden />
            Runs entirely in your browser
          </motion.div>

          <motion.h1
            variants={item}
            className="max-w-xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-[3.4rem]"
          >
            Precision tools for every <span className="text-primary">PDF</span>, zero uploads.
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-foreground-muted"
          >
            Merge, split, fill, and lock documents with the exactness of a drafting table — nothing
            ever leaves your device.
          </motion.p>

          <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-2">
            <MotionLink
              href="/app/merge"
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-[15px] font-semibold text-on-primary transition-colors hover:bg-primary-hover"
            >
              Open the app
              <ArrowRight size={17} />
            </MotionLink>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center gap-1.5 rounded-lg px-4 font-mono text-sm text-foreground-muted transition-colors hover:text-foreground"
            >
              See how it works
            </a>
          </motion.div>
        </div>

        <motion.div
          variants={item}
          className="relative rounded-xl border border-border bg-background-elevated"
          style={{
            boxShadow:
              "0 30px 60px -20px color-mix(in srgb, var(--color-primary) 15%, transparent), 0 25px 50px -12px rgba(0,0,0,0.25)",
          }}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground-subtle">
              <FileText size={13} className="text-primary" aria-hidden />
              PDF preview
            </div>
            <div className="flex gap-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-border-strong" />
              ))}
            </div>
          </div>

          <div className="relative m-5 flex flex-col gap-2.5 rounded-lg border border-border bg-background p-6">
            <div className="h-2 w-[45%] rounded-full bg-foreground-muted/60" />
            <div className="mt-1 h-1.5 w-[85%] rounded-full bg-border-strong" />
            <div className="h-1.5 w-[70%] rounded-full bg-border-strong" />
            <div className="h-1.5 w-[78%] rounded-full bg-border-strong" />

            <div className="mt-1.5 flex items-center rounded-md bg-primary/10 px-2.5 py-2">
              <div className="h-1.5 w-[50%] rounded-full bg-primary/70" />
            </div>

            <div className="h-1.5 w-[60%] rounded-full bg-border-strong" />
            <div className="h-1.5 w-[80%] rounded-full bg-border-strong" />

            {fieldTags.map(({ label, top, left, right, delay }) => (
              <motion.span
                key={label}
                className="absolute rounded-md border border-primary/35 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary"
                style={{ top, left, right }}
                animate={{
                  boxShadow: [
                    "0 0 0 0 color-mix(in srgb, var(--color-primary) 25%, transparent)",
                    "0 0 0 5px color-mix(in srgb, var(--color-primary) 0%, transparent)",
                    "0 0 0 0 color-mix(in srgb, var(--color-primary) 0%, transparent)",
                  ],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay }}
              >
                {label}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
