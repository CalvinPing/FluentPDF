import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFField, StandardFonts, rgb, type Color } from "pdf-lib";

/**
 * Thrown by `applyFieldEdits` when the source PDF is encrypted. pdf-lib can open such files
 * (via `ignoreEncryption`) but never actually decrypts their streams/strings, and it can't write
 * encryption back out either — saving one would silently replace every pre-existing stream
 * (page content, images, appearances) with its still-encrypted, now-mislabeled-as-plain bytes,
 * corrupting the whole document. There's no safe way to round-trip these through pdf-lib, so
 * saving is refused outright rather than producing a broken or blank-looking file.
 */
export class EncryptedPdfError extends Error {
  constructor() {
    super("This PDF is password-protected or encrypted and can't be saved with new fields.");
    this.name = "EncryptedPdfError";
  }
}

/** Field types the user can place manually. */
export type NewFieldType = "text" | "checkbox" | "date" | "signature" | "radio" | "dropdown";

/** Every kind a field on the page can be — manual types plus what detection can find. */
export type FieldKind = NewFieldType | "other";

/** The PDF standard 14 fonts, minus Symbol/ZapfDingbats which aren't usable as body text. */
export const STANDARD_FONT_CHOICES = [
  "Helvetica",
  "HelveticaBold",
  "HelveticaOblique",
  "HelveticaBoldOblique",
  "TimesRoman",
  "TimesRomanBold",
  "TimesRomanItalic",
  "TimesRomanBoldItalic",
  "Courier",
  "CourierBold",
  "CourierOblique",
  "CourierBoldOblique",
] as const;

export type StandardFontChoice = (typeof STANDARD_FONT_CHOICES)[number];

export const FONT_LABELS: Record<StandardFontChoice, string> = {
  Helvetica: "Helvetica",
  HelveticaBold: "Helvetica Bold",
  HelveticaOblique: "Helvetica Italic",
  HelveticaBoldOblique: "Helvetica Bold Italic",
  TimesRoman: "Times New Roman",
  TimesRomanBold: "Times Bold",
  TimesRomanItalic: "Times Italic",
  TimesRomanBoldItalic: "Times Bold Italic",
  Courier: "Courier",
  CourierBold: "Courier Bold",
  CourierOblique: "Courier Italic",
  CourierBoldOblique: "Courier Bold Italic",
};

export const DEFAULT_FONT: StandardFontChoice = "Helvetica";
export const DEFAULT_FONT_SIZE = 11;

/** CSS approximations of each standard font, for previewing prefill text on the field box. */
export const FONT_CSS_STACK: Record<
  StandardFontChoice,
  { family: string; weight: "normal" | "bold"; style: "normal" | "italic" }
> = {
  Helvetica: { family: "Helvetica, Arial, sans-serif", weight: "normal", style: "normal" },
  HelveticaBold: { family: "Helvetica, Arial, sans-serif", weight: "bold", style: "normal" },
  HelveticaOblique: { family: "Helvetica, Arial, sans-serif", weight: "normal", style: "italic" },
  HelveticaBoldOblique: { family: "Helvetica, Arial, sans-serif", weight: "bold", style: "italic" },
  TimesRoman: { family: '"Times New Roman", Times, serif', weight: "normal", style: "normal" },
  TimesRomanBold: { family: '"Times New Roman", Times, serif', weight: "bold", style: "normal" },
  TimesRomanItalic: { family: '"Times New Roman", Times, serif', weight: "normal", style: "italic" },
  TimesRomanBoldItalic: { family: '"Times New Roman", Times, serif', weight: "bold", style: "italic" },
  Courier: { family: '"Courier New", Courier, monospace', weight: "normal", style: "normal" },
  CourierBold: { family: '"Courier New", Courier, monospace', weight: "bold", style: "normal" },
  CourierOblique: { family: '"Courier New", Courier, monospace', weight: "normal", style: "italic" },
  CourierBoldOblique: { family: '"Courier New", Courier, monospace', weight: "bold", style: "italic" },
};

export interface EditableField {
  id: string;
  /** "detected" fields already exist in the PDF's AcroForm; "new" ones are placed by the user. */
  origin: "detected" | "new";
  kind: FieldKind;
  name: string;
  pageIndex: number;
  /** 0-1, relative to page width/height, top-left origin. */
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  /**
   * Prefill value. For "detected" fields this starts as the field's real current value.
   * For "radio" fields, this is the option value this particular widget represents. For
   * "dropdown" fields, this is the default-selected option (must match an entry in `options`).
   */
  value?: string;
  /** Undefined on a "detected" field means "leave its existing appearance alone". */
  fontFamily?: StandardFontChoice;
  fontSize?: number;
  /** True once the user has edited value/font/size for this field via the details panel. */
  contentTouched?: boolean;
  /** "dropdown" only — the list of selectable options. */
  options?: string[];
  /** Whether the recipient must fill this field in before the form can be considered complete. */
  required?: boolean;
  /** Whether the recipient can edit this field at all. */
  readOnly?: boolean;
  /** "checkbox" only — whether it starts checked. */
  checked?: boolean;
  /**
   * Appearance overrides, hex strings (e.g. "#ff0000"). Only take effect on "new" fields —
   * pdf-lib only accepts these at widget-creation time (`addToPage`), so an already-existing
   * "detected" widget's colors can't be changed after the fact. `textColor` also controls a
   * checkbox/radio's mark color, not just literal text. `backgroundColor` undefined means
   * transparent.
   */
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  /**
   * True only for "new" fields that came from the Smart Detect layout scan, never touched
   * since. Re-running the scan replaces every field still carrying this flag rather than
   * appending another copy — editing a suggested field (drag, resize, or any details-panel
   * change) clears it, which "promotes" it to a normal field the next scan won't touch.
   */
  autoDetected?: boolean;
}

export const DEFAULT_TEXT_COLOR = "#000000";
export const DEFAULT_BORDER_COLOR = "#000000";
export const DEFAULT_BORDER_WIDTH = 0;

/** "MM/DD/YYYY" — the fixed max length a date field's text is capped to. */
export const DATE_DISPLAY_LENGTH = 10;
export const DATE_PLACEHOLDER = "MM/DD/YYYY";

/** Converts a "#rrggbb" hex string into a pdf-lib Color. Returns undefined for anything else
 *  (including undefined/empty), which pdf-lib treats as "leave this unset". */
export function hexToColor(hex?: string): Color | undefined {
  if (!hex) return undefined;
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return undefined;
  const n = parseInt(match[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/**
 * Reformats raw input into a "MM/DD/YYYY" mask: strips everything but digits, caps at 8 digits,
 * and re-inserts the "/" separators from scratch. Because the separators are always rebuilt
 * rather than trusted from the input, there's no way to type or backspace your way into deleting
 * just a slash — it always regenerates in place.
 */
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  return [mm, dd, yyyy].filter(Boolean).join("/");
}

/**
 * Checks whether a PDF is encrypted — meant to be run right after a file is loaded, so the tool
 * can lock down field placement upfront instead of only failing once the user tries to save.
 * See `EncryptedPdfError` for why pdf-lib can't actually work with these files.
 */
export async function isPdfEncrypted(bytes: Uint8Array): Promise<boolean> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.isEncrypted;
}

/** Detects fields already embedded in the PDF's AcroForm (e.g. fillable government/business forms). */
export async function detectFormFields(bytes: Uint8Array): Promise<EditableField[]> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm();
  const pages = doc.getPages();
  const results: EditableField[] = [];

  form.getFields().forEach((field, fieldIndex) => {
    let kind: FieldKind = "other";
    if (field instanceof PDFTextField) kind = "text";
    else if (field instanceof PDFCheckBox) kind = "checkbox";
    else if (field instanceof PDFDropdown) kind = "dropdown";
    else if (field instanceof PDFRadioGroup) kind = "radio";

    const value = field instanceof PDFTextField ? (field.getText() ?? "") : undefined;

    field.acroField.getWidgets().forEach((widget, widgetIndex) => {
      const rect = widget.getRectangle();
      const pageRef = widget.P();
      const page =
        pages.find((p) => p.ref === pageRef) ??
        (() => {
          const widgetRef = doc.context.getObjectRef(widget.dict);
          return widgetRef ? doc.findPageForAnnotationRef(widgetRef) : undefined;
        })();
      if (!page) return;

      const { width: pw, height: ph } = page.getSize();
      results.push({
        id: `detected-${fieldIndex}-${widgetIndex}-${field.getName()}`,
        origin: "detected",
        kind,
        name: field.getName(),
        pageIndex: pages.indexOf(page),
        xRatio: rect.x / pw,
        yRatio: (ph - rect.y - rect.height) / ph,
        widthRatio: rect.width / pw,
        heightRatio: rect.height / ph,
        value,
      });
    });
  });

  return results;
}

/**
 * Applies every field's current geometry, and — where the user actually touched them, or the
 * field is newly placed — its prefill value, font, and font size. Existing detected fields the
 * user never opened the details panel for are left with their original appearance untouched.
 */
export async function applyFieldEdits(
  bytes: Uint8Array,
  fields: EditableField[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  if (doc.isEncrypted) throw new EncryptedPdfError();
  const form = doc.getForm();
  const pages = doc.getPages();
  const fontCache = new Map<StandardFontChoice, Awaited<ReturnType<typeof doc.embedFont>>>();

  const getFont = async (choice: StandardFontChoice) => {
    let font = fontCache.get(choice);
    if (!font) {
      font = await doc.embedFont(StandardFonts[choice]);
      fontCache.set(choice, font);
    }
    return font;
  };

  // Multiple "new" radio fields that share the same name are options of one radio group —
  // pdf-lib throws if createRadioGroup is called twice with the same name, so each group is
  // created once and reused for every widget (addOptionToPage call) that belongs to it.
  const radioGroupCache = new Map<string, PDFRadioGroup>();
  const getRadioGroup = (name: string) => {
    let group = radioGroupCache.get(name);
    if (!group) {
      group = form.createRadioGroup(name);
      radioGroupCache.set(name, group);
    }
    return group;
  };

  // Unlike colors, required/read-only are field-dict flags rather than widget-appearance state,
  // so — unlike colors — they apply equally well to an already-existing "detected" field.
  const applyFlags = (pdfField: PDFField, source: EditableField) => {
    if (source.required) pdfField.enableRequired();
    else pdfField.disableRequired();
    if (source.readOnly) pdfField.enableReadOnly();
    else pdfField.disableReadOnly();
  };

  for (const [i, field] of fields.entries()) {
    const page = pages[field.pageIndex];
    if (!page) continue;

    const { width: pw, height: ph } = page.getSize();
    const width = field.widthRatio * pw;
    const height = field.heightRatio * ph;
    const x = field.xRatio * pw;
    const y = ph - field.yRatio * ph - height;

    // Colors only apply at widget-creation time, so this is only meaningful for "new" fields.
    const appearance: {
      textColor?: Color;
      borderColor?: Color;
      borderWidth?: number;
      backgroundColor?: Color;
    } = {
      textColor: hexToColor(field.textColor),
      borderColor: hexToColor(field.borderColor),
      borderWidth: field.borderWidth,
      backgroundColor: hexToColor(field.backgroundColor),
    };
    // pdf-lib's own `addToPage`/`addOptionToPage` treats the width/height passed in as the
    // *inner* content area and pads the widget's actual rectangle out by `borderWidth` on top
    // (so the border strokes outward from the content instead of eating into it) — it even
    // defaults borderWidth to 1 if the key is omitted entirely. Since `width`/`height` here are
    // meant to be the *total* size shown in the editor, the border has to be subtracted back out
    // before creation, and the position nudged by half of it, or every "new" field would end up
    // `borderWidth` pt taller/wider (and slightly offset) than what was drawn — a couple points
    // is invisible on a big field, but very visible (overlapping neighbors) on a small one.
    const bw = field.borderWidth ?? 0;
    const newFieldWidth = Math.max(0, width - bw);
    const newFieldHeight = Math.max(0, height - bw);
    const newFieldX = x + bw / 2;
    const newFieldY = y + bw / 2;

    if (field.origin === "detected") {
      const existing = form.getFieldMaybe(field.name);
      if (!existing) continue;
      const widgets = existing.acroField.getWidgets();
      const widget =
        widgets.find((w) => w.P() === page.ref) ??
        widgets.find((w) => {
          const widgetRef = doc.context.getObjectRef(w.dict);
          return widgetRef && doc.findPageForAnnotationRef(widgetRef) === page;
        });
      widget?.setRectangle({ x, y, width, height });

      if (field.contentTouched) {
        applyFlags(existing, field);
        if (existing instanceof PDFTextField) {
          existing.setFontSize(field.fontSize ?? DEFAULT_FONT_SIZE);
          existing.setText(field.value ?? "");
          existing.defaultUpdateAppearances(await getFont(field.fontFamily ?? DEFAULT_FONT));
        } else if (existing instanceof PDFCheckBox) {
          if (field.checked) existing.check();
          else existing.uncheck();
        }
      }
      continue;
    }

    const name = field.name.trim() || `${field.kind}_${i + 1}`;

    if (field.kind === "checkbox") {
      const cb = form.createCheckBox(name);
      applyFlags(cb, field);
      if (field.checked) cb.check();
      cb.addToPage(page, { x: newFieldX, y: newFieldY, width: newFieldWidth, height: newFieldHeight, ...appearance });
      continue;
    }

    if (field.kind === "radio") {
      const group = getRadioGroup(name);
      applyFlags(group, field);
      const optionValue = (field.value ?? "").trim() || `Option ${i + 1}`;
      group.addOptionToPage(optionValue, page, {
        x: newFieldX,
        y: newFieldY,
        width: newFieldWidth,
        height: newFieldHeight,
        ...appearance,
      });
      continue;
    }

    // addToPage must run first — it's what creates the widget's /DA entry that
    // setFontSize/setText/setOptions/select/defaultUpdateAppearances all require to already exist.
    const font = await getFont(field.fontFamily ?? DEFAULT_FONT);

    if (field.kind === "dropdown") {
      const dd = form.createDropdown(name);
      applyFlags(dd, field);
      dd.addToPage(page, {
        x: newFieldX,
        y: newFieldY,
        width: newFieldWidth,
        height: newFieldHeight,
        font,
        ...appearance,
      });
      const options = (field.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (options.length > 0) dd.setOptions(options);
      if (field.value && options.includes(field.value)) dd.select(field.value);
      dd.setFontSize(field.fontSize ?? DEFAULT_FONT_SIZE);
      dd.defaultUpdateAppearances(font);
      continue;
    }

    const tf = form.createTextField(name);
    applyFlags(tf, field);
    tf.addToPage(page, {
      x: newFieldX,
      y: newFieldY,
      width: newFieldWidth,
      height: newFieldHeight,
      font,
      ...appearance,
    });
    // Date fields are just a text field capped to "MM/DD/YYYY" length — no combing (the boxed
    // per-character cell look), which reads as cluttered rather than clean.
    if (field.kind === "date") tf.setMaxLength(DATE_DISPLAY_LENGTH);
    tf.setFontSize(field.fontSize ?? DEFAULT_FONT_SIZE);
    tf.setText(field.value ?? "");
    tf.defaultUpdateAppearances(font);
  }

  return doc.save();
}
