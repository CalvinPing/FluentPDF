# Fluent PDF

A fast, private, all-in-one PDF toolkit that runs entirely in your browser. No uploads, no accounts, no server ever touching your files — merge, split, edit, fill, and lock PDFs with everything happening on your own device.

## Why

Most online PDF tools work the same way: upload your file, a server processes it, you download the result. That's a strange default for documents that are often a lease, an ID, or a signed contract — exactly the files people are least eager to hand to a server they can't see.

Fluent PDF does the work the other way around. Merging, splitting, form detection, and password protection all run as real code in the browser tab, using the same PDF and cryptography libraries a server would — they just never leave your device. Install it as a PWA and it keeps working offline, since it never depended on a connection in the first place.

## Tools

| Tool | What it does |
| --- | --- |
| **Merge** | Combine multiple PDFs into a single document, in whatever order you choose |
| **Split** | Pull specific pages out, or break one PDF into several smaller files |
| **Edit** | Rotate, delete, and reorder pages, or drop in new text anywhere |
| **Fields** | Auto-detect fillable form fields, or place your own — text, checkbox, date, signature |
| **Protect** | Add a password to lock a PDF, or remove one you already know |
| **Images → PDF** | Turn PNG or JPEG photos into a PDF, one page per image, drag to reorder |

## How it works

1. **Drop in a file** — drag a PDF into any tool, or click to browse. Nothing uploads to a server.
2. **Make your changes** — merge, split, rotate, annotate, or place fields, seeing every edit instantly.
3. **Export instantly** — download the finished PDF straight from the browser. No account needed.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com) for styling, [Framer Motion](https://www.framer.com/motion/) for animation
- [pdf-lib](https://pdf-lib.js.org) and [pdf.js](https://mozilla.github.io/pdf.js/) for PDF manipulation and rendering, offloaded to a web worker via [Comlink](https://github.com/GoogleChromeLabs/comlink)
- [Zustand](https://github.com/pmndrs/zustand) for client state
- Installable as a PWA, works offline

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page, or go straight to a tool at `/app/merge`, `/app/split`, `/app/edit`, `/app/fields`, `/app/protect`, or `/app/images`.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## Project structure

```
app/
  app/<tool>/page.tsx   # each PDF tool's page (merge, split, edit, fields, protect, images)
  page.tsx              # marketing landing page
components/
  landing/              # landing page sections (hero, about, how-it-works, privacy, footer)
  tool-shell/           # shared chrome around each tool (tabs, header, loaded-file bar)
  tools/                # tool-specific UI (field editor, page thumbnails, zoom controls, etc.)
  pdf/                  # PDF canvas rendering
  ui/                   # shared primitives (button, dropzone, theme toggle)
lib/
  pdf/                  # core PDF logic — merge, split, edit, fields, protect, images-to-pdf
  workers/              # web worker wrapping pdf.js/pdf-lib work off the main thread
  hooks/, tools.ts, ...  # shared hooks and tool metadata
```

## Privacy

Every operation — parsing, rendering, editing, encrypting — runs client-side in the browser. Files are never uploaded, no accounts are required, and nothing is tracked or stored server-side.
