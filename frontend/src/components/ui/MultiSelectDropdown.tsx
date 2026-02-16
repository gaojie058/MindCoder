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
      {label && <div className="text-[#707070] text-sm font-semibold mb-1.5">{label}</div>}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
          disabled
            ? "bg-gray-50 border-gray-200 text-gray-400 cursor-default"
            : "bg-white border-gray-300 hover:border-[#CB9180] cursor-pointer"
        }`}
      >
        {selectedLabels.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          <span className="text-[#8B5E4B]">
            {selectedLabels.length} selected
          </span>
        )}
        <span className="float-right text-gray-400">{open ? "▴" : "▾"}</span>
      </button>

      {/* Selected tags */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {options
            .filter((o) => selected.includes(o.id))
            .map((o) => (
              <span
                key={o.id}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#FFF3EE] text-[#C66B50] ${
                  !disabled ? "cursor-pointer hover:bg-[#CB9180]/20" : ""
                }`}
                onClick={() => !disabled && onChange(o.id)}
              >
                {o.label}
                {!disabled && <span className="text-[10px]">✕</span>}
              </span>
            ))}
        </div>
      )}

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">No items</div>
          ) : (
            options.map((o) => {
              const isSelected = selected.includes(o.id);
              return (
                <div
                  key={o.id}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-gray-50 ${
                    isSelected ? "text-[#C66B50] font-medium" : "text-gray-700"
                  }`}
                  onClick={() => onChange(o.id)}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                    isSelected ? "bg-[#CB9180] border-[#CB9180] text-white" : "border-gray-300"
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
