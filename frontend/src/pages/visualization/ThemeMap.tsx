import { useState, useMemo, useRef, useCallback } from "react";
import useConceptStore from "@/stores/useConceptStore";
import useCodeStore from "@/stores/useCodeStore";
import useCardStore from "@/stores/useCardStore";
import { concept, code, card } from "@/types/stores";

// Colors from the concept store palette
const CONCEPT_COLORS = [
  "#E3C8C0", "#FFE2D4", "#C9ECCF", "#C9ECE6",
  "#D5ECF9", "#DDDDF3", "#F9D5F8", "#F9D5D5",
];

function lighten(hex: string, amount = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

function darken(hex: string, amount = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * (1 - amount));
  const dg = Math.round(g * (1 - amount));
  const db = Math.round(b * (1 - amount));
  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
}

type OpenCodeItem = {
  id: string;
  name: string;
  isAI: boolean;
  segments: { id: string; source: string }[];
};

type SubthemeItem = {
  id: string;
  name: string;
  color: string;
  isAI: boolean;
  definition?: string;
  openCodes: OpenCodeItem[];
};

type ThemeItem = {
  id: string;
  name: string;
  definition: string;
  color: string;
  isAI: boolean;
  subthemes: SubthemeItem[];
};

type MapData = { themes: ThemeItem[] };

function buildMapData(): MapData {
  const { conceptData } = useConceptStore.getState();

  const themes = conceptData.map((concept: concept, ci: number) => {
    const color = concept.color || CONCEPT_COLORS[ci % CONCEPT_COLORS.length];

    // concept.codes is Record<string, code[]> — these are sub-themes
    const subthemes = Object.entries(concept.codes).flatMap(([_key, codes]) =>
      codes.map((codeItem: code) => {
        // codeItem.data is Record<string, card[]> — these are open codes
        const openCodes: OpenCodeItem[] = Object.values(codeItem.data || {}).flat().map((c: card) => ({
          id: c.id,
          name: c.name,
          isAI: c.isGPT ?? true,
          segments: (c.topics || []).map((dp) => ({
            id: dp.id || dp.uuid,
            source: dp.content || "",
          })),
        }));

        return {
          id: codeItem.id,
          name: codeItem.name,
          color: codeItem.color || lighten(color, 0.15),
          isAI: codeItem.isGPT ?? true,
          definition: codeItem.definition,
          openCodes,
        };
      })
    );

    return {
      id: concept.id,
      name: concept.name,
      definition: concept.definition,
      color,
      isAI: concept.isGPT ?? true,
      subthemes,
    };
  });

  return { themes };
}

// AI/Human badge
function SourceBadge({ isAI }: { isAI: boolean }) {
  if (isAI) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 bg-pink-100/80 text-gray-700 flex items-center gap-1">
        <span className="text-purple-500 text-[10px]">✦</span> AI
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 bg-emerald-100/80 text-gray-700 flex items-center gap-1">
      👤 Human
    </span>
  );
}

// Expandable open code card with segments
function OpenCodeCard({ code, color }: { code: OpenCodeItem; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const segCount = code.segments.length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <button
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
        <span className="text-xs font-medium text-gray-700 flex-1 break-words whitespace-normal leading-snug">{code.name}</span>
        <SourceBadge isAI={code.isAI} />
        <span className="text-[10px] text-gray-400 shrink-0">{segCount}</span>
      </button>
      {expanded && code.segments.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
          {code.segments.map((seg, i) => (
            <div key={i} className="text-[11px] text-gray-500 leading-relaxed pl-5">
              <span className="text-gray-400">•</span>{" "}
              <span className="italic">"{seg.source.length > 150 ? seg.source.slice(0, 150) + "..." : seg.source}"</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-theme card with AI/Human badge and expandable definition
function SubthemeCard({ subtheme }: { subtheme: SubthemeItem }) {
  const [showDef, setShowDef] = useState(false);
  return (
    <div
      className="rounded-lg border shadow-sm overflow-hidden"
      style={{ backgroundColor: lighten(subtheme.color, 0.2), borderColor: subtheme.color }}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-700 flex-1 break-words leading-snug">{subtheme.name}</span>
          <SourceBadge isAI={subtheme.isAI} />
          {subtheme.definition && (
            <button
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
function ThemeCard({ theme }: { theme: ThemeItem }) {
  const [showDef, setShowDef] = useState(false);
  return (
    <div
      className="rounded-xl border shadow-sm w-full overflow-hidden"
      style={{ backgroundColor: lighten(theme.color, 0.1), borderColor: theme.color }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-800 flex-1 break-words leading-snug">{theme.name}</span>
          <SourceBadge isAI={theme.isAI} />
          <button
            onClick={() => setShowDef(!showDef)}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            title="Toggle definition"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${showDef ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
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

// Connection lines SVG overlay
function ConnectionLines({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  // We'll use simple CSS borders/connectors instead of SVG for simplicity
  return null;
}

// Persist codes column width across re-renders
let persistedCodesWidth = 360;

export default function ThemeMap() {
  const [codesWidth, _setCodesWidth] = useState(persistedCodesWidth);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const setCodesWidth = (w: number) => {
    persistedCodesWidth = w;
    _setCodesWidth(w);
  };

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = codesWidth;
    const handleMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = ev.clientX - startXRef.current;
      setCodesWidth(Math.max(160, Math.min(500, startWidthRef.current + delta)));
    };
    const handleUp = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, [codesWidth]);

  const data = useMemo(() => buildMapData(), [
    useConceptStore((s) => s.conceptData),
    useCodeStore((s) => s.codeData),
  ]);

  if (data.themes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No theme data available. Complete Steps 1-3 first.
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto p-6 bg-[#FFFBF9]">
      {/* Column headers */}
      <div className="flex items-center mb-4 px-2">
        <div className="flex-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Open Codes</span>
        </div>
        <div className="w-8" />
        <div className="flex-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Sub-themes</span>
        </div>
        <div className="w-6" />
        <div className="flex-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Themes</span>
        </div>
      </div>

      {/* Theme rows */}
      <div className="space-y-6">
        {data.themes.map((theme) => (
          <div key={theme.id} className="flex items-stretch gap-0">
            {/* Open Codes column */}
            <div className="flex-1 min-w-0 space-y-2">
              {theme.subthemes.flatMap((st) =>
                st.openCodes.map((oc) => (
                  <OpenCodeCard key={oc.id} code={oc} color={st.color} />
                ))
              )}
            </div>

            {/* Arrow: Codes → Sub-themes */}
            <div className="w-8 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Sub-themes column */}
            <div className="flex-1 min-w-0 space-y-2 flex flex-col justify-center">
              {theme.subthemes.map((st) => (
                <SubthemeCard key={st.id} subtheme={st} />
              ))}
            </div>

            {/* Arrow: Sub-themes → Theme */}
            <div className="w-6 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Theme column */}
            <div className="flex-1 min-w-0 flex items-center">
              <ThemeCard theme={theme} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
