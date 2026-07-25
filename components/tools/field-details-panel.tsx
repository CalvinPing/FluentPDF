"use client";

import { useState } from "react";
import { Type, SquareCheck, Calendar, Signature, List, CircleDot, FileQuestion, X, Trash2, ChevronDown } from "lucide-react";
import {
  STANDARD_FONT_CHOICES,
  FONT_LABELS,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_COLOR,
  DEFAULT_BORDER_COLOR,
  DEFAULT_BORDER_WIDTH,
  DATE_PLACEHOLDER,
  DATE_DISPLAY_LENGTH,
  maskDateInput,
  type EditableField,
  type FieldKind,
  type StandardFontChoice,
} from "@/lib/pdf/fields";
import { cn } from "@/lib/cn";

const fieldIcons: Record<FieldKind, typeof Type> = {
  text: Type,
  checkbox: SquareCheck,
  date: Calendar,
  signature: Signature,
  dropdown: List,
  radio: CircleDot,
  other: FileQuestion,
};

const kindLabel: Record<FieldKind, string> = {
  text: "Text field",
  checkbox: "Checkbox",
  date: "Date field",
  signature: "Signature field",
  dropdown: "Dropdown",
  radio: "Radio option",
  other: "Field",
};

export function FieldDetailsPanel({
  field,
  onChange,
  onRemove,
  onClose,
}: {
  field: EditableField;
  onChange: (id: string, patch: Partial<EditableField>) => void;
  onRemove?: (id: string) => void;
  onClose: () => void;
}) {
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const Icon = fieldIcons[field.kind];
  const isDetected = field.origin === "detected";
  const isCheckbox = field.kind === "checkbox";
  const isRadio = field.kind === "radio";
  const isDropdown = field.kind === "dropdown";
  const isDate = field.kind === "date";
  // Only "new" fields (plus detected text fields, matching existing behavior) actually apply
  // content edits on save — detected checkbox/radio/dropdown fields only get their position
  // updated, so showing editable value controls for them would be misleading.
  const contentEditable = !isCheckbox && (!isDetected || field.kind === "text");
  const showFontControls = contentEditable && !isRadio;
  const dropdownOptions = (field.options ?? []).map((o) => o.trim()).filter(Boolean);

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-background-elevated p-4 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{kindLabel[field.kind]}</p>
            {isDetected && <p className="text-xs text-foreground-subtle">Existing field</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close field details"
          className="rounded-md p-1 text-foreground-subtle hover:bg-muted hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground-muted" htmlFor="field-name">
          Field name
        </label>
        {isDetected ? (
          <p className="mt-1.5 truncate rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground-muted">
            {field.name}
          </p>
        ) : (
          <input
            id="field-name"
            value={field.name}
            onChange={(e) => onChange(field.id, { name: e.target.value, contentTouched: true })}
            placeholder="Field name"
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
          />
        )}
        {!isDetected && isRadio && (
          <p className="mt-1.5 text-xs text-foreground-subtle">
            Widgets sharing this exact name form one radio group — give each option a unique
            option value below.
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
          <input
            type="checkbox"
            checked={field.required ?? false}
            onChange={(e) => onChange(field.id, { required: e.target.checked, contentTouched: true })}
            className="h-3.5 w-3.5 cursor-pointer accent-primary"
          />
          Required
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
          <input
            type="checkbox"
            checked={field.readOnly ?? false}
            onChange={(e) => onChange(field.id, { readOnly: e.target.checked, contentTouched: true })}
            className="h-3.5 w-3.5 cursor-pointer accent-primary"
          />
          Read only
        </label>
      </div>

      {isCheckbox && (
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
            <input
              type="checkbox"
              checked={field.checked ?? false}
              onChange={(e) => onChange(field.id, { checked: e.target.checked, contentTouched: true })}
              className="h-4 w-4 cursor-pointer accent-primary"
            />
            Checked by default
          </label>
          <p className="mt-1.5 text-xs text-foreground-subtle">
            {field.checked ? "Starts checked when the recipient opens the form." : "Starts unchecked."}
          </p>
        </div>
      )}

      {contentEditable && isDate && (
        <div>
          <label className="text-xs font-medium text-foreground-muted" htmlFor="field-date">
            Date
          </label>
          <input
            id="field-date"
            type="text"
            inputMode="numeric"
            value={field.value ?? ""}
            onChange={(e) => onChange(field.id, { value: maskDateInput(e.target.value), contentTouched: true })}
            placeholder={DATE_PLACEHOLDER}
            maxLength={DATE_DISPLAY_LENGTH}
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-foreground-subtle focus-visible:border-primary"
          />
        </div>
      )}

      {contentEditable && isRadio && (
        <div>
          <label className="text-xs font-medium text-foreground-muted" htmlFor="field-option">
            Option value
          </label>
          <input
            id="field-option"
            value={field.value ?? ""}
            onChange={(e) => onChange(field.id, { value: e.target.value, contentTouched: true })}
            placeholder="e.g. Yes"
            className="mt-1.5 w-full rounded-lg border border-border-strong bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
          />
        </div>
      )}

      {contentEditable && isDropdown && (
        <>
          <div>
            <label className="text-xs font-medium text-foreground-muted" htmlFor="field-options">
              Options (one per line)
            </label>
            <textarea
              id="field-options"
              value={(field.options ?? []).join("\n")}
              onChange={(e) => onChange(field.id, { options: e.target.value.split("\n"), contentTouched: true })}
              rows={4}
              className="mt-1.5 w-full resize-none rounded-lg border border-border-strong bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground-muted" htmlFor="field-default">
              Default selection
            </label>
            <select
              id="field-default"
              value={field.value ?? ""}
              onChange={(e) => onChange(field.id, { value: e.target.value, contentTouched: true })}
              className="mt-1.5 w-full rounded-lg border border-border-strong bg-background px-2 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
            >
              <option value="">None</option>
              {dropdownOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {contentEditable && !isDate && !isRadio && !isDropdown && (
        <div>
          <label className="text-xs font-medium text-foreground-muted" htmlFor="field-value">
            Prefill text (optional)
          </label>
          <textarea
            id="field-value"
            value={field.value ?? ""}
            onChange={(e) => onChange(field.id, { value: e.target.value, contentTouched: true })}
            placeholder="Leave blank for the recipient to fill in"
            rows={2}
            className="mt-1.5 w-full resize-none rounded-lg border border-border-strong bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
          />
        </div>
      )}

      {showFontControls && (
        <>
          <div>
            <label className="text-xs font-medium text-foreground-muted" htmlFor="field-font">
              Font
            </label>
            <select
              id="field-font"
              value={field.fontFamily ?? DEFAULT_FONT}
              onChange={(e) =>
                onChange(field.id, { fontFamily: e.target.value as StandardFontChoice, contentTouched: true })
              }
              className="mt-1.5 w-full rounded-lg border border-border-strong bg-background px-2 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
            >
              {STANDARD_FONT_CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  {FONT_LABELS[choice]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground-muted" htmlFor="field-size">
              Size
            </label>
            <input
              id="field-size"
              type="number"
              min={6}
              max={72}
              value={field.fontSize ?? DEFAULT_FONT_SIZE}
              onChange={(e) =>
                onChange(field.id, {
                  fontSize: Math.min(72, Math.max(6, Number(e.target.value) || DEFAULT_FONT_SIZE)),
                  contentTouched: true,
                })
              }
              className="mt-1.5 w-full rounded-lg border border-border-strong bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
            />
          </div>
        </>
      )}

      {!isDetected && (
        <div className="flex flex-col border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setAppearanceOpen((v) => !v)}
            className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-foreground-subtle"
          >
            Appearance
            <ChevronDown size={14} className={cn("transition-transform duration-150", appearanceOpen && "rotate-180")} />
          </button>

          {appearanceOpen && (
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-foreground-muted" htmlFor="field-text-color">
                  {isCheckbox || isRadio ? "Mark color" : "Text color"}
                </label>
                <input
                  id="field-text-color"
                  type="color"
                  value={field.textColor ?? DEFAULT_TEXT_COLOR}
                  onChange={(e) => onChange(field.id, { textColor: e.target.value, contentTouched: true })}
                  className="mt-1.5 h-9 w-full cursor-pointer rounded-lg border border-border-strong bg-background p-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground-muted" htmlFor="field-border-color">
                  Border color
                </label>
                <input
                  id="field-border-color"
                  type="color"
                  value={field.borderColor ?? DEFAULT_BORDER_COLOR}
                  onChange={(e) => onChange(field.id, { borderColor: e.target.value, contentTouched: true })}
                  className="mt-1.5 h-9 w-full cursor-pointer rounded-lg border border-border-strong bg-background p-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground-muted" htmlFor="field-border-width">
                  Border width
                </label>
                <input
                  id="field-border-width"
                  type="number"
                  min={0}
                  max={6}
                  step={0.5}
                  value={field.borderWidth ?? DEFAULT_BORDER_WIDTH}
                  onChange={(e) =>
                    onChange(field.id, {
                      borderWidth: Math.min(6, Math.max(0, Number(e.target.value) || 0)),
                      contentTouched: true,
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-border-strong bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
                  <input
                    type="checkbox"
                    checked={field.backgroundColor != null}
                    onChange={(e) =>
                      onChange(field.id, {
                        backgroundColor: e.target.checked ? "#ffffff" : undefined,
                        contentTouched: true,
                      })
                    }
                    className="h-3.5 w-3.5 cursor-pointer accent-primary"
                  />
                  Fill background
                </label>
                {field.backgroundColor != null && (
                  <input
                    type="color"
                    value={field.backgroundColor}
                    onChange={(e) => onChange(field.id, { backgroundColor: e.target.value, contentTouched: true })}
                    className="mt-1.5 h-9 w-full cursor-pointer rounded-lg border border-border-strong bg-background p-1"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {onRemove && !isDetected && (
        <button
          type="button"
          onClick={() => onRemove(field.id)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={15} />
          Remove field
        </button>
      )}
    </div>
  );
}
