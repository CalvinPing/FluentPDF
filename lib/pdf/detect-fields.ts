import type { PDFDocumentProxy } from "pdfjs-dist";
import type { EditableField, NewFieldType } from "@/lib/pdf/fields";
import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from "@/lib/pdf/fields";

/**
 * Heuristic, client-side "smart detect" for flat PDFs that have no embedded AcroForm fields.
 * There's no OCR/ML here — it looks for common textual conventions authors use to mark a
 * fillable spot when typing up a form in Word/Docs/etc.:
 *   - "[ ]" or a checkbox glyph (☐☑□❑)          -> checkbox
 *   - "( )" or a radio-dot glyph (○●◯)          -> radio, grouped with nearby aligned radios
 *   - a run of 3+ underscores ("____")           -> text (a blank line to write on)
 *   - a label ending in ":" followed by blank    -> text (the blank space after the label,
 *     room on the same line                         skipped if the next line is itself a
 *                                                     checkbox/radio/underscore — that means
 *                                                     the label is a section heading, not a
 *                                                     same-line fill-in)
 * This intentionally does NOT parse vector graphics (drawn boxes/circles with no text
 * marker) — that would need real path/shape analysis, a separate, larger effort.
 */

interface TextItemLike {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface Candidate {
  kind: NewFieldType;
  x: number;
  yBottom: number;
  width: number;
  height: number;
  /** Trailing text after a checkbox/radio marker (e.g. "Morning" in "( ) Morning") — used to
   *  give radio options a real value and checkboxes a more descriptive name. */
  label?: string;
  /** How confident this candidate is — used to resolve overlaps (see `suppressOverlaps`). */
  source: "marker" | "underscore" | "labelGap";
}

const CHECKBOX_RE = /\[\s?\]|[☐☑☒□▢◻◼]/g;
const RADIO_RE = /\(\s?\)|[○●◯⚪⚫]/g;
const UNDERSCORE_RE = /_{3,}/g;
const LABEL_GAP_MIN_WIDTH = 30;
const LABEL_GAP_MAX_WIDTH = 220;
const LABEL_GAP_DEFAULT_WIDTH = 160;
// Radio options are grouped together when their left edges line up within this many points...
const RADIO_GROUP_X_TOLERANCE = 6;
// ...and consecutive options are within this many line-heights of each other.
const RADIO_GROUP_Y_TOLERANCE_LINES = 3;
// Single-spaced real-world forms often have line-to-line gaps not much bigger than the font
// size itself (e.g. ~13pt lines at an 11pt font) — sizing a field taller than that makes it
// overlap the row above/below, so this stays close to 1x rather than the more generous
// multiplier that looked fine on generously-spaced test PDFs but overlapped on dense ones.
const TEXT_FIELD_HEIGHT_MULTIPLIER = 1.15;
const OVERLAP_SUPPRESSION_THRESHOLD = 0.2;

function groupIntoLines(items: TextItemLike[], yTolerance = 2.5): TextItemLike[][] {
  const lines: TextItemLike[][] = [];
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const y = item.transform[5];
    const line = lines.find((l) => Math.abs(l[0].transform[5] - y) <= yTolerance);
    if (line) line.push(item);
    else lines.push([item]);
  }
  for (const line of lines) line.sort((a, b) => a.transform[4] - b.transform[4]);
  // Reading order: top of the page (higher PDF y) first.
  lines.sort((a, b) => b[0].transform[5] - a[0].transform[5]);
  return lines;
}

function lineHasMarker(line: TextItemLike[]): boolean {
  return line.some((item) => {
    CHECKBOX_RE.lastIndex = 0;
    RADIO_RE.lastIndex = 0;
    UNDERSCORE_RE.lastIndex = 0;
    return CHECKBOX_RE.test(item.str) || RADIO_RE.test(item.str) || UNDERSCORE_RE.test(item.str);
  });
}

function slugifyLabel(label: string): string | null {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug.length > 0 ? slug : null;
}

function markerCandidatesInItem(item: TextItemLike, kind: NewFieldType, pattern: RegExp): Candidate[] {
  const results: Candidate[] = [];
  const charWidth = item.str.length > 0 ? item.width / item.str.length : 0;
  for (const match of item.str.matchAll(pattern)) {
    const startIdx = match.index ?? 0;
    const endIdx = startIdx + match[0].length;
    const matchX = item.transform[4] + startIdx * charWidth;
    const matchWidth = Math.max((endIdx - startIdx) * charWidth, item.height * 0.6);
    // Checkboxes/radios read best as a small square roughly matching the surrounding
    // font size, anchored at the marker's left edge, rather than the marker's raw span.
    const size = Math.max(item.height * 1.1, Math.min(matchWidth, item.height * 1.8));
    results.push({
      kind,
      x: matchX,
      yBottom: item.transform[5] - item.height * 0.15,
      width: size,
      height: size,
      label: item.str.slice(endIdx).trim(),
      source: "marker",
    });
  }
  return results;
}

function underscoreCandidatesInItem(item: TextItemLike): Candidate[] {
  const results: Candidate[] = [];
  const charWidth = item.str.length > 0 ? item.width / item.str.length : 0;
  for (const match of item.str.matchAll(UNDERSCORE_RE)) {
    const startIdx = match.index ?? 0;
    const endIdx = startIdx + match[0].length;
    const runWidth = (endIdx - startIdx) * charWidth;
    if (runWidth < item.height) continue; // too short to be worth a field
    results.push({
      kind: "text",
      x: item.transform[4] + startIdx * charWidth,
      // Sits just above the underscore line, like writing above a blank on paper.
      yBottom: item.transform[5] + item.height * 0.05,
      width: runWidth,
      height: item.height * TEXT_FIELD_HEIGHT_MULTIPLIER,
      source: "underscore",
    });
  }
  return results;
}

function labelGapCandidatesInLines(lines: TextItemLike[][], pageWidthPts: number): Candidate[] {
  const results: Candidate[] = [];
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const nextLine = lines[lineIdx + 1];
    // "Preferred shift:" followed by an indented block of radio options is a section heading,
    // not a same-line fill-in. The distinguishing signal is indentation, not just proximity —
    // a sub-list sits to the right of its heading's start ("Preferred shift:" at x=50, options
    // at x=70), whereas an unrelated marker line elsewhere on the page (e.g. "Email:" followed,
    // not immediately, by an unrelated checkbox starting at the same x=50) typically isn't.
    const lineHeight = line[0]?.height ?? 12;
    const verticalGapToNext = nextLine ? line[0].transform[5] - nextLine[0].transform[5] : Infinity;
    const nextLineIsIndented = nextLine ? nextLine[0].transform[4] > line[0].transform[4] + 4 : false;
    if (nextLine && nextLineIsIndented && verticalGapToNext <= lineHeight * 4 && lineHasMarker(nextLine)) continue;

    // A fixed height multiplier alone isn't safe on single-spaced real-world forms — line
    // gaps there can be barely bigger than the font itself, so this caps the field's height
    // to the room actually measured above it, guaranteeing no overlap with the line above
    // rather than hoping the multiplier happens to be small enough.
    const prevLine = lines[lineIdx - 1];
    const gapToPrev = prevLine ? prevLine[0].transform[5] - line[0].transform[5] : Infinity;
    const maxHeightFromSpacing = gapToPrev > 0 ? gapToPrev * 0.85 + lineHeight * 0.15 : Infinity;

    for (let i = 0; i < line.length; i++) {
      const item = line[i];
      const trimmed = item.str.trimEnd();
      if (!/[:：]\s*$/.test(trimmed)) continue;
      CHECKBOX_RE.lastIndex = 0;
      RADIO_RE.lastIndex = 0;
      UNDERSCORE_RE.lastIndex = 0;
      // Skip labels that already contain their own marker — those are handled elsewhere.
      if (CHECKBOX_RE.test(item.str) || RADIO_RE.test(item.str) || UNDERSCORE_RE.test(item.str)) continue;

      const itemRight = item.transform[4] + item.width;
      const next = line[i + 1];
      const gapEnd = next ? next.transform[4] : Math.min(pageWidthPts - 36, itemRight + LABEL_GAP_DEFAULT_WIDTH);
      const gapWidth = gapEnd - itemRight;
      if (gapWidth < LABEL_GAP_MIN_WIDTH) continue;

      const height = Math.max(item.height * 0.8, Math.min(item.height * TEXT_FIELD_HEIGHT_MULTIPLIER, maxHeightFromSpacing));

      results.push({
        kind: "text",
        x: itemRight + 4,
        yBottom: item.transform[5] - item.height * 0.15,
        width: Math.min(gapWidth - 8, LABEL_GAP_MAX_WIDTH),
        height,
        source: "labelGap",
      });
    }
  }
  return results;
}

/**
 * Radio buttons only mean anything as a group of mutually-exclusive options sharing one field
 * name — a single isolated radio isn't useful. This clusters candidates whose left edges line
 * up and which sit close enough vertically (reading top-to-bottom) into one shared group name,
 * and uses each option's trailing label text ("Morning", "Afternoon", ...) as its value.
 */
function assignRadioGroupNames(radios: Candidate[]): Map<Candidate, { name: string; value: string }> {
  const sorted = [...radios].sort((a, b) => b.yBottom - a.yBottom || a.x - b.x);
  const assignments = new Map<Candidate, { name: string; value: string }>();
  let groupIndex = 0;
  let indexInGroup = 0;
  let groupName = "";
  let prev: Candidate | null = null;

  for (const c of sorted) {
    const verticalGap = prev ? prev.yBottom - c.yBottom : Infinity;
    const sameGroup =
      prev !== null &&
      Math.abs(prev.x - c.x) <= RADIO_GROUP_X_TOLERANCE &&
      verticalGap >= 0 &&
      verticalGap <= c.height * RADIO_GROUP_Y_TOLERANCE_LINES;

    if (!sameGroup) {
      groupIndex += 1;
      indexInGroup = 0;
      groupName = `radio_group_${groupIndex}`;
    }
    indexInGroup += 1;
    assignments.set(c, { name: groupName, value: c.label || `Option ${indexInGroup}` });
    prev = c;
  }
  return assignments;
}

function overlapFraction(a: Candidate, b: Candidate): number {
  const ax2 = a.x + a.width;
  const ay2 = a.yBottom + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.yBottom + b.height;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.yBottom, b.yBottom));
  const intersection = ix * iy;
  if (intersection <= 0) return 0;
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * On tightly-spaced real-world forms, a field sized for one row can still overlap the row
 * above or below (single-spaced lines are often barely taller than the font itself). This is
 * the hard guarantee against that: whichever candidate is the more reliable signal wins —
 * an explicit marker (bracket/glyph) beats an underscore blank, which beats the fuzzier
 * "label followed by whitespace" guess — and anything left that still overlaps a keeper is
 * dropped rather than drawn on top of it.
 */
function suppressOverlaps(candidates: Candidate[]): Candidate[] {
  const priority: Record<Candidate["source"], number> = { marker: 0, underscore: 1, labelGap: 2 };
  const sorted = [...candidates].sort((a, b) => priority[a.source] - priority[b.source]);
  const kept: Candidate[] = [];
  for (const c of sorted) {
    if (kept.some((k) => overlapFraction(k, c) > OVERLAP_SUPPRESSION_THRESHOLD)) continue;
    kept.push(c);
  }
  return kept;
}

/** Scans every page's text layer for fillable-spot conventions and returns "new" fields for them. */
export async function detectVisualFieldCandidates(
  pdf: PDFDocumentProxy,
  pageCount: number,
): Promise<EditableField[]> {
  const fields: EditableField[] = [];
  const counters: Record<NewFieldType, number> = { text: 0, checkbox: 0, date: 0, signature: 0, radio: 0, dropdown: 0 };

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1 });
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;

    const textContent = await page.getTextContent();
    // pdfjs's items are `TextItem | TextMarkedContent` — only TextItem has the position/size
    // fields this needs, and (unlike TextItem) TextMarkedContent's `type` field never overlaps
    // with `str`, so this check reliably tells them apart.
    const items = textContent.items.filter(
      (it) => typeof (it as { str?: unknown }).str === "string",
    ) as unknown as TextItemLike[];

    const checkboxAndRadio: Candidate[] = [];
    const otherCandidates: Candidate[] = [];
    for (const item of items) {
      checkboxAndRadio.push(...markerCandidatesInItem(item, "checkbox", CHECKBOX_RE));
      checkboxAndRadio.push(...markerCandidatesInItem(item, "radio", RADIO_RE));
      otherCandidates.push(...underscoreCandidatesInItem(item));
    }
    const lines = groupIntoLines(items);
    otherCandidates.push(...labelGapCandidatesInLines(lines, pageWidth));

    const radios = checkboxAndRadio.filter((c) => c.kind === "radio");
    const checkboxes = checkboxAndRadio.filter((c) => c.kind === "checkbox");
    const radioGroups = assignRadioGroupNames(radios);

    const allCandidates = suppressOverlaps([...checkboxes, ...radios, ...otherCandidates]);

    for (const c of allCandidates) {
      const widthRatio = c.width / pageWidth;
      const heightRatio = c.height / pageHeight;
      const xRatio = c.x / pageWidth;
      const yRatio = (pageHeight - c.yBottom - c.height) / pageHeight;
      if (widthRatio <= 0 || heightRatio <= 0) continue;
      if (xRatio < 0 || yRatio < 0 || xRatio + widthRatio > 1 || yRatio + heightRatio > 1) continue;

      let name: string;
      let value: string | undefined;
      if (c.kind === "radio") {
        const group = radioGroups.get(c)!;
        name = group.name;
        value = group.value;
      } else {
        counters[c.kind] += 1;
        const slug = c.kind === "checkbox" && c.label ? slugifyLabel(c.label) : null;
        name = slug ? `${c.kind}_${slug}` : `${c.kind}_${counters[c.kind]}`;
        value = "";
      }

      fields.push({
        id: `auto-${pageIndex}-${fields.length}-${Date.now().toString(36)}`,
        origin: "new",
        kind: c.kind,
        name,
        pageIndex,
        xRatio,
        yRatio,
        widthRatio,
        heightRatio,
        value,
        fontFamily: DEFAULT_FONT,
        fontSize: DEFAULT_FONT_SIZE,
        textColor: "#000000",
        borderColor: "#000000",
        borderWidth: 2,
        autoDetected: true,
      });
    }
  }

  return fields;
}
