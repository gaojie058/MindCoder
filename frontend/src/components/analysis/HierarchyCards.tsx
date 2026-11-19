import { useState } from "react";
import { card, code } from "@/types/stores";
import { buildMapData, lighten, OpenCodeItem, SubthemeItem, ThemeItem } from "@/utils/analysisHierarchy";

// AI/Human badge
function SourceBadge({ isAI }: { isAI: boolean }) {
  if (isAI) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 flex items-center gap-0.5" style={{ backgroundColor: "#EEF2FF" }}>
        <span style={{ color: "#8F93F5" }}>✦</span> <span style={{ color: "#6366F1" }}>AI</span>
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 bg-emerald-100/80 text-emerald-700 flex items-center gap-0.5">
      👤 User
    </span>
  );
}

// Expandable open code card with segments
export function OpenCodeCard({ code, color }: { code: OpenCodeItem; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const segCount = code.segments.length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-medium text-gray-700 flex-1 min-w-0 break-words whitespace-normal leading-snug">{code.name}</span>
        <SourceBadge isAI={code.isAI} />
        <span className="text-[10px] text-gray-400 shrink-0">{segCount}</span>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2.5 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          {code.segments.length === 0 && <p className="text-xs text-gray-400">No source segments available.</p>}
          {code.segments.map((seg, i) => (
            <div key={i} className="text-[13px] text-gray-600 leading-relaxed break-words pl-5">
              <span className="text-gray-400">•</span>{" "}
              <span className="italic">"{seg.source}"</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-theme card with AI/Human badge and expandable definition
export function SubthemeCard({ subtheme, number }: { subtheme: SubthemeItem; number: string }) {
  const [showDef, setShowDef] = useState(false);
  return (
    <div
      className="rounded-lg border shadow-sm overflow-hidden"
      style={{ backgroundColor: lighten(subtheme.color, 0.2), borderColor: subtheme.color }}
    >
      <div className="px-3 py-2.5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Subtheme {number}</p>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-gray-700 flex-1 min-w-0 break-words leading-snug">{subtheme.name}</h3>
          <SourceBadge isAI={subtheme.isAI} />
          {subtheme.definition && (
            <button
              type="button"
              aria-label={`Toggle definition for ${subtheme.name}`}
              aria-expanded={showDef}
              onClick={() => setShowDef(!showDef)}
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              title="Toggle definition"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${showDef ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          {subtheme.openCodes.length} code{subtheme.openCodes.length !== 1 ? "s" : ""}
        </div>
      </div>
      {showDef && subtheme.definition && (
        <div className="border-t px-3 py-2 text-[11px] text-gray-600 leading-relaxed bg-white/40" style={{ borderColor: subtheme.color + "40" }}>
          {subtheme.definition}
        </div>
      )}
    </div>
  );
}

// Theme card with AI/Human badge and expandable definition
export function ThemeCard({ theme, number }: { theme: ThemeItem; number: number }) {
  const [showDef, setShowDef] = useState(false);
  return (
    <div
      className="rounded-xl border shadow-sm w-full overflow-hidden"
      style={{ backgroundColor: lighten(theme.color, 0.1), borderColor: theme.color }}
    >
      <div className="px-4 py-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Theme {number}</p>
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-bold text-gray-800 flex-1 min-w-0 break-words leading-snug">{theme.name}</h2>
          <SourceBadge isAI={theme.isAI} />
          {theme.definition && <button
            type="button"
            aria-label={`Toggle definition for ${theme.name}`}
            aria-expanded={showDef}
            onClick={() => setShowDef(!showDef)}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            title="Toggle definition"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${showDef ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>}
        </div>
        <div className="text-[10px] text-gray-400 mt-1">
          {theme.subthemes.length} sub-theme{theme.subthemes.length !== 1 ? "s" : ""}
        </div>
      </div>
      {showDef && theme.definition && (
        <div className="border-t px-4 py-2.5 text-[11px] text-gray-600 leading-relaxed bg-white/40" style={{ borderColor: theme.color + "40" }}>
          {theme.definition}
        </div>
      )}
    </div>
  );
}

export function CodeList({ cards, color = "#E3C8C0" }: { cards: card[]; color?: string }) {
  return <div className="ml-3 sm:ml-4 border-l-2 pl-3 sm:pl-4 pt-3" style={{ borderColor: color }}>
    <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Codes</h4>
    <div className="space-y-2">
      {cards.map(item => <OpenCodeCard key={item.id} color={color} code={{
        id: item.id, name: item.name, isAI: item.isGPT ?? true,
        segments: (item.topics || []).map(topic => ({ id: topic.uuid || topic.id, source: topic.content || "" })),
      }} />)}
      {cards.length === 0 && <p className="text-xs text-gray-400">No codes in this subtheme yet.</p>}
    </div>
  </div>;
}

export function SubthemeList({ subthemes, color = "#E3C8C0", themeNumber }: { subthemes: code[]; color?: string; themeNumber?: string }) {
  const items = buildMapData([{ id: "preview", name: "", definition: "", color, codes: { all: subthemes } }]).themes[0].subthemes;
  return <div className="ml-3 sm:ml-5 border-l-2 pl-3 sm:pl-5 pt-4 space-y-5" style={{ borderColor: color }}>
    {items.length === 0 && <p className="text-xs text-gray-400">No subthemes in this theme yet.</p>}
    {items.map((subtheme, index) => <section key={subtheme.id} aria-label={`Subtheme: ${subtheme.name}`} className="min-w-0">
      <SubthemeCard subtheme={subtheme} number={themeNumber ? `${themeNumber}.${index + 1}` : `${index + 1}`} />
      <CodeList cards={Object.values(subthemes[index].data || {}).flat()} color={subtheme.color} />
    </section>)}
  </div>;
}
