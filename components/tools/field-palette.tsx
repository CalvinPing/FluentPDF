import { Type, SquareCheck, Calendar, Signature, CircleDot, List } from "lucide-react";
import type { NewFieldType } from "@/lib/pdf/fields";
import { cn } from "@/lib/cn";

const options: { type: NewFieldType; label: string; icon: typeof Type }[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "checkbox", label: "Checkbox", icon: SquareCheck },
  { type: "date", label: "Date", icon: Calendar },
  { type: "signature", label: "Signature", icon: Signature },
  { type: "radio", label: "Radio", icon: CircleDot },
  { type: "dropdown", label: "Dropdown", icon: List },
];

export function FieldPalette({
  active,
  onSelect,
  disabled = false,
}: {
  active: NewFieldType | null;
  onSelect: (type: NewFieldType | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-row gap-2 lg:flex-col">
      {options.map((opt) => (
        <button
          key={opt.type}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(active === opt.type ? null : opt.type)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors duration-150 cursor-pointer lg:w-full",
            "disabled:pointer-events-none disabled:opacity-40",
            active === opt.type
              ? "border-secondary bg-secondary/10 text-secondary"
              : "border-border text-foreground-muted hover:bg-muted hover:text-foreground",
          )}
        >
          <opt.icon size={17} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
