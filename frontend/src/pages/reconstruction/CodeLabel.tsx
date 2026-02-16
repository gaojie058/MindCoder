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
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const color = CODE_COLORS[colorIndex % CODE_COLORS.length];

  useEffect(() => setLocalName(name), [name]);

  const handleSaveName = useCallback(() => {
    updateCardName(id, localName);
    setEditing(false);
  }, [id, localName, updateCardName]);

  const handleDelete = useCallback(() => {
    const updated = cardData.map((c) => c.id === id ? { ...c, active: false } : c);
    setCardData(updated);
  }, [cardData, id, setCardData]);

  const handleClickLabel = () => {
    // Highlight all segments in editor
    if (topics.length > 0) {
      window.dispatchEvent(
        new CustomEvent("highlightInEditor", {
          detail: { text: topics[0].content, datapointId: topics[0].id, codeId: id },
        })
      );
    }
  };

  if (!active) return null;

  return (
    <div
      className="group relative py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
      id={`card-${id}`}
    >
      <div className="flex items-start gap-2">
        {/* Color dot */}
        <div
          className="w-3 h-3 rounded-full mt-1 shrink-0"
          style={{ backgroundColor: color.bg }}
        />

        {/* Code label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-mono shrink-0">#{id}</span>
            {editing ? (
              <input
                ref={inputRef}
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                autoFocus
                className="text-sm font-semibold outline-none border-b border-dashed border-gray-400 bg-transparent flex-1 min-w-0"
                style={{ color: color.text }}
              />
            ) : (
              <span
                onClick={() => setEditing(true)}
                className="text-sm font-semibold cursor-pointer hover:underline truncate"
                style={{ color: color.text }}
                title={localName}
              >
                {localName}
              </span>
            )}
            {isGPT && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded shrink-0">AI</span>
            )}
          </div>

          {/* Segments toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-gray-400 hover:text-gray-600 mt-0.5"
          >
            {topics.length} segment{topics.length !== 1 ? "s" : ""} {expanded ? "▴" : "▾"}
          </button>

          {/* Expanded segments */}
          {expanded && (
            <div className="mt-1.5 space-y-1">
              {topics.map((t, i) => (
                <div
                  key={t.uuid || i}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("highlightInEditor", {
                        detail: { text: t.content, datapointId: t.id, codeId: id },
                      })
                    );
                  }}
                  className="text-xs text-gray-600 py-1 px-2 rounded cursor-pointer hover:opacity-80 line-clamp-2"
                  style={{ backgroundColor: color.bg + "33" }}
                >
                  {t.content}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions (visible on hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
          <button
            onClick={handleClickLabel}
            className="text-xs text-gray-400 hover:text-[#CB9180] p-1"
            title="Locate in text"
          >
            📍
          </button>
          <button
            onClick={handleDelete}
            className="text-xs text-gray-400 hover:text-red-500 p-1"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
