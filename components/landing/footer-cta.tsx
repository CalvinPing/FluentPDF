"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

const MotionLink = motion.create(Link);

export function FooterCta() {
  return (
    <section className="relative mx-4 mb-24 overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center sm:mx-6 sm:px-16 lg:mx-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(500px circle at 15% 20%, color-mix(in srgb, var(--color-on-primary) 16%, transparent), transparent 60%), radial-gradient(400px circle at 85% 80%, color-mix(in srgb, var(--color-on-primary) 12%, transparent), transparent 60%)",
        }}
      />
      <Reveal className="relative mx-auto max-w-xl">
        <h2 className="text-3xl font-semibold tracking-tight text-on-primary sm:text-4xl">
          Ready to fix that PDF?
        </h2>
        <p className="mt-4 text-lg text-on-primary/80">
          No sign-up, no watermark, no waiting for an upload bar.
        </p>
        <MotionLink
          href="/app/merge"
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 inline-flex h-13 items-center gap-2 rounded-xl bg-on-primary px-7 text-base font-medium text-primary shadow-lg"
        >
          Open the app
          <ArrowRight size={18} />
        </MotionLink>
      </Reveal>
    </section>
  );
}
