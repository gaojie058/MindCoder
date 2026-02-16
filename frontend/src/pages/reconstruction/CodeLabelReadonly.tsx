import { useState } from "react";
import { card } from "@/types";
import { CODE_COLORS } from "@/utils/codeColors";
import useCardStore from "@/stores/useCardStore";

interface CodeLabelReadonlyProps {
  id: string;
  name: string;
  topics: card["topics"];
  active?: boolean;
  isGPT?: boolean;
  colorIndex: number;
  onRestore?: (id: string) => void;
}

export default function CodeLabelReadonly({ id, name, topics, isGPT, colorIndex, onRestore }: CodeLabelReadonlyProps) {
  const [expanded, setExpanded] = useState(false);
  const color = CODE_COLORS[colorIndex % CODE_COLORS.length];

  return (
    <div className="group relative rounded-lg hover:bg-gray-50/80 transition-all">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color.bg }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm leading-snug" style={{ color: color.text }}>
            <span className="text-gray-400 font-mono text-xs mr-1">#{id}</span>
            <span className="font-medium">{name}</span>
            {isGPT && (
              <span className="ml-1.5 text-[10px] px-1 py-0.5 bg-gray-100 text-gray-400 rounded align-middle">AI</span>
            )}
          </div>
          {topics.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-gray-400 hover:text-gray-600 mt-0.5"
            >
              {topics.length} segment{topics.length !== 1 ? "s" : ""} {expanded ? "▴" : "▾"}
            </button>
          )}
        </div>
        {onRestore && (
          <button
            onClick={() => onRestore(id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded bg-green-50 hover:bg-green-100 text-green-600"
          >
            Restore
          </button>
        )}
      </div>
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
