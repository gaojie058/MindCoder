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
}

export default function CodeLabel({ id, name, topics, active, isGPT, colorIndex }: CodeLabelProps) {
  const { updateCardName, cardData, setCardData } = useCardStore();
  const [editing, setEditing] = useState(false);
  const [localName, setLocalName] = useState(name);
  const color = CODE_COLORS[colorIndex % CODE_COLORS.length];
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLocalName(name), [name]);

  // Listen for navigateToCard events (when user clicks highlighted text in editor)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail.cardId === id.toString() || e.detail.cardId === id) {
        if (labelRef.current) {
          labelRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          labelRef.current.classList.add("code-label-flash");
          setTimeout(() => labelRef.current?.classList.remove("code-label-flash"), 1500);
        }
      }
    };
    window.addEventListener("navigateToCard", handler as EventListener);
    return () => window.removeEventListener("navigateToCard", handler as EventListener);
  }, [id]);

  const handleSaveName = useCallback(() => {
    updateCardName(id, localName);
    setEditing(false);
  }, [id, localName, updateCardName]);

  const handleDelete = useCallback(() => {
    const updated = cardData.map((c) => c.id === id ? { ...c, active: false } : c);
    setCardData(updated);
  }, [cardData, id, setCardData]);

  // Hover → jump to text in editor
  const handleMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => {
      if (topics.length > 0) {
        window.dispatchEvent(
          new CustomEvent("highlightInEditor", {
            detail: { text: topics[0].content, datapointId: topics[0].id, codeId: id },
          })
        );
      }
    }, 300); // small delay to avoid accidental triggers
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
  };

  if (!active) return null;

  return (
    <div
      ref={labelRef}
      className="group relative rounded-lg hover:bg-gray-50/80 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
      id={`card-${id}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* Color dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color.bg }}
        />

        {/* Code info — name wraps naturally */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              autoFocus
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
          <div className="text-[11px] text-gray-400 mt-0.5">
            {topics.length} segment{topics.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Edit button — visible on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
            title="Edit name"
          >
            ✏️ Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="text-xs px-1.5 py-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
