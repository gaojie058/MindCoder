import { useState, useRef, useEffect } from "react";

interface Option {
  id: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selected: string[];
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export default function MultiSelectDropdown({
  options,
  selected,
  onChange,
  disabled = false,
  placeholder = "Select items...",
  label,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabels = options.filter((o) => selected.includes(o.id)).map((o) => o.label);

  return (
    <div ref={ref} className="relative w-full" onClick={(e) => e.stopPropagation()}>
      {label && <div className="text-muted-foreground text-subhead font-semibold mb-1.5">{label}</div>}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full text-left px-3 py-2 rounded-xl border text-subhead transition-colors ${
          disabled
            ? "bg-muted border-border text-muted-foreground cursor-default"
            : "bg-card border-input hover:border-primary cursor-pointer"
        }`}
      >
        {selectedLabels.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          <span className="text-primary-strong">
            {selectedLabels.length} selected
          </span>
        )}
        <span className="float-right text-muted-foreground">{open ? "▴" : "▾"}</span>
      </button>

      {/* Selected tags */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {options
            .filter((o) => selected.includes(o.id))
            .map((o) => (
              <span
                key={o.id}
                className={`inline-flex items-center gap-1 text-caption px-2 py-0.5 rounded-full bg-primary-tint text-primary-strong ${
                  !disabled ? "cursor-pointer hover:bg-primary/20" : ""
                }`}
                onClick={() => !disabled && onChange(o.id)}
              >
                {o.label}
                {!disabled && <span className="text-caption2">✕</span>}
              </span>
            ))}
        </div>
      )}

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto bg-popover border border-border rounded-xl shadow-lg">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-caption text-muted-foreground">No items</div>
          ) : (
            options.map((o) => {
              const isSelected = selected.includes(o.id);
              return (
                <div
                  key={o.id}
                  className={`px-3 py-2 text-subhead cursor-pointer flex items-center gap-2 hover:bg-muted ${
                    isSelected ? "text-primary-strong font-medium" : "text-foreground"
                  }`}
                  onClick={() => onChange(o.id)}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-caption2 ${
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input"
                  }`}>
                    {isSelected && "✓"}
                  </span>
                  {o.label}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
