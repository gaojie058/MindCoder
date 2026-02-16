import { useState, useRef, useEffect, useCallback } from "react";
import { card } from "@/types";
import useCardStore from "@/stores/useCardStore";
import { CODE_COLORS } from "@/utils/codeColors";

interface CodeLabelProps {
  id: string;
  name: string;
  topics: card["topics"];
  active: boolean;
  isGPT: boolean;
  colorIndex: number;
  selectedCodeId: string | null;
  onSelect: (id: string | null) => void;
}

export default function CodeLabel({ id, name, topics, active, isGPT, colorIndex, selectedCodeId, onSelect }: CodeLabelProps) {
  const { updateCardName, cardData, setCardData } = useCardStore();
  const [editing, setEditing] = useState(false);
  const [localName, setLocalName] = useState(name);
  const [expanded, setExpanded] = useState(false);
  const color = CODE_COLORS[colorIndex % CODE_COLORS.length];
  const labelRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedCodeId === id;

  useEffect(() => setLocalName(name), [name]);

  // Listen for navigateToCard events (clicking highlighted text in editor → select this code)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail.cardId === id.toString() || e.detail.cardId === id) {
        onSelect(id);
        if (labelRef.current) {
          labelRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        // Also trigger persistent editor highlight for this code
        window.dispatchEvent(
          new CustomEvent("selectCodeInEditor", {
            detail: { codeId: id, color: color.bg, topics },
          })
        );
      }
    };
    window.addEventListener("navigateToCard", handler as EventListener);
    return () => window.removeEventListener("navigateToCard", handler as EventListener);
  }, [id, onSelect, color.bg, topics]);

  const handleSaveName = useCallback(() => {
    updateCardName(id, localName);
    setEditing(false);
  }, [id, localName, updateCardName]);

  const handleDelete = useCallback(() => {
    const updated = cardData.map((c) => c.id === id ? { ...c, active: false } : c);
    setCardData(updated);
    if (isSelected) onSelect(null);
  }, [cardData, id, setCardData, isSelected, onSelect]);

  // Click to select/deselect and highlight in editor
  const handleClick = () => {
    const newSelected = isSelected ? null : id;
    onSelect(newSelected);

    // Dispatch persistent highlight event
    window.dispatchEvent(
      new CustomEvent("selectCodeInEditor", {
        detail: newSelected ? { codeId: id, color: color.bg, topics } : { codeId: null },
      })
    );
  };

  if (!active) return null;

  return (
    <div
      ref={labelRef}
      className={`group relative rounded-lg transition-all cursor-pointer hover:bg-gray-50/80`}
      id={`card-${id}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2.5 px-3 py-2">
        {/* Color dot — larger when selected */}
        <div
          className={`shrink-0 transition-all ${isSelected ? "w-4 h-4 rounded" : "w-2.5 h-2.5 rounded-full"}`}
          style={{ backgroundColor: color.bg }}
        />

        {/* Code info */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium outline-none border-b border-dashed border-gray-400 bg-transparent w-full"
              style={{ color: color.text }}
            />
          ) : (
            <div className="text-sm leading-snug" style={{ color: color.text }}>
              <span className="text-gray-400 font-mono text-xs mr-1">#{id}</span>
              <span className="font-medium">{localName}</span>
              {isGPT && (
                <span className="ml-1.5 text-[10px] px-1 py-0.5 bg-gray-100 text-gray-400 rounded align-middle">AI</span>
              )}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-[11px] text-gray-400 hover:text-gray-600 mt-0.5"
          >
            {topics.length} segment{topics.length !== 1 ? "s" : ""} {expanded ? "▴" : "▾"}
          </button>
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
          >✏️</button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="text-xs px-1.5 py-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
          >✕</button>
        </div>
      </div>

      {/* Expanded segments */}
      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {topics.map((t, i) => (
            <div
              key={t.uuid || i}
              className="text-xs text-gray-600 py-1 px-2 rounded line-clamp-2"
              style={{ backgroundColor: color.bg + "33" }}
            >
              {t.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
