import React, { useState, useRef, useCallback, useEffect } from "react";
import useAppStore from "@/stores/useAppStore";
import useLLMHistoryStore from "@/stores/useLLMHistoryStore";
import useEditStore from "@/stores/useEditStore";
import BackgroundGenButton from "@/components/ui/BackgroundGenButton";
import InfoTooltip from "@/components/ui/InfoTooltip";

// Expandable Textarea
const ExpandableTextarea = React.forwardRef<
  HTMLTextAreaElement,
  {
    defaultValue: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
  }
>(({ defaultValue, onChange, placeholder }, ref) => (
  <textarea
    ref={ref}
    defaultValue={defaultValue}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full flex-1 outline-none overflow-auto resize-none font-zen scrollbar-thin text-sm border border-gray-200 rounded-lg p-2.5 placeholder:text-gray-300 placeholder:text-xs"
    style={{ minHeight: "48px" }}
  />
));
ExpandableTextarea.displayName = "ExpandableTextarea";

// Prompt History (compact)
function PromptHistory({ step }: { step: string }) {
  const { llmHistory = [] } = useLLMHistoryStore();
  const stepHistory = llmHistory
    .filter((h) => h.step === step)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  if (stepHistory.length === 0) return <span className="text-[10px] text-gray-400">No history yet</span>;

  return (
    <div className="flex flex-col gap-0.5 max-h-24 overflow-y-auto scrollbar-thin">
      {stepHistory.map((entry, i) => (
        <div key={i} className="text-[10px] text-gray-500 truncate" title={entry.userPrompt}>
          <span className="text-gray-400">{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {" "}{entry.userPrompt}
        </div>
      ))}
    </div>
  );
}

// Suggestion chips per step
const SUGGESTIONS: Record<string, { label: string; text: string }[]> = {
  card: [
    { label: "In-Vivo", text: "In-Vivo coding: Use the direct language of raw data as codes" },
    { label: "Descriptive", text: "Descriptive coding: Assign basic labels to describe the main topic" },
  ],
  code: [
    { label: "In-Vivo", text: "In-Vivo coding: Use the direct words of raw data as sub-themes" },
    { label: "Descriptive", text: "Descriptive coding: Assign basic labels to describe the main sub-theme" },
  ],
  concept: [
    { label: "Thematic", text: "Thematic analysis: Identify patterns and themes across sub-themes" },
    { label: "Theoretical", text: "Theoretical conceptualization: Link findings to established theories" },
  ],
};

const PLACEHOLDERS: Record<string, string> = {
  card: "Guide how open codes are named and grouped...",
  code: "Guide how sub-themes are formed from open codes...",
  concept: "Guide how themes are conceptualized from sub-themes...",
};

const STYLE_KEYS: Record<string, string> = {
  card: "clusteringStyle",
  code: "codingStyle",
  concept: "conceptualizingStyle",
};

interface HumanActBarProps {
  stepName: string;
  onRegenerate?: () => void;
  onRegenerateSubsequent?: () => void;
  loading?: boolean;
}

export default function HumanActBar({ stepName, onRegenerate, onRegenerateSubsequent, loading }: HumanActBarProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showMemo, setShowMemo] = useState(false);
  const [panelHeight, setPanelHeight] = useState(140);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const styleKey = STYLE_KEYS[stepName];
  const currentValue = useAppStore((s) => (s as any)[styleKey] || "");

  // Sync textarea when store value changes externally
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== currentValue) {
      textareaRef.current.value = currentValue;
    }
  }, [currentValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const setters: Record<string, string> = {
      card: "setClusteringStyle",
      code: "setCodingStyle",
      concept: "setConceptualizingStyle",
    };
    const setter = setters[stepName];
    if (setter) {
      (useAppStore.getState() as any)[setter](e.target.value);
    }
  }, [stepName]);

  const handleSuggestion = useCallback((text: string) => {
    if (textareaRef.current) {
      textareaRef.current.value = text;
      textareaRef.current.focus();
    }
    const setters: Record<string, string> = {
      card: "setClusteringStyle",
      code: "setCodingStyle",
      concept: "setConceptualizingStyle",
    };
    const setter = setters[stepName];
    if (setter) {
      (useAppStore.getState() as any)[setter](text);
    }
  }, [stepName]);

  // Research memo
  const { topicMemo, setTopicMemo, codeMemo, setCodeMemo, conceptMemo, setConceptMemo } = useEditStore();
  const memo = stepName === "card" ? topicMemo : stepName === "code" ? codeMemo : conceptMemo;
  const setMemo = stepName === "card" ? setTopicMemo : stepName === "code" ? setCodeMemo : setConceptMemo;

  // Drag to resize
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = panelHeight;

    const handleMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = startYRef.current - ev.clientY;
      setPanelHeight(Math.max(100, Math.min(500, startHeightRef.current + delta)));
    };
    const handleUp = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, [panelHeight]);

  if (!STYLE_KEYS[stepName]) return null;

  const suggestions = SUGGESTIONS[stepName] || [];

  return (
    <div className="w-full bg-gradient-to-r from-amber-50 to-orange-50/60 flex-shrink-0 rounded-xl mt-2 border border-amber-200/50 overflow-hidden">
      {/* Drag handle */}
      {!collapsed && (
        <div
          className="w-full h-2 cursor-ns-resize flex items-center justify-center hover:bg-amber-200/40 transition-colors group"
          onMouseDown={handleDragStart}
        >
          <div className="w-12 h-1 rounded-full bg-amber-300/50 group-hover:bg-amber-400/70 transition-colors" />
        </div>
      )}
      {collapsed && <div className="w-full border-t-2 border-amber-300/60 rounded-t-xl" />}
      {/* Header bar — matches AI Agent / Data Editor style */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-b border-amber-200/50 bg-amber-50/50"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-sm">✍️</span>
        <span className="text-xs font-semibold text-amber-700">Your Instructions</span>
        <InfoTooltip text="Write custom instructions to guide AI generation for this step" variant="amber" />
        <span className="ml-1 text-xs text-amber-400">{collapsed ? "▶" : "▼"}</span>
        {collapsed && currentValue && (
          <span className="text-xs text-gray-400 truncate flex-1">{currentValue}</span>
        )}
        {/* Action buttons always visible */}
        <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMemo(!showMemo)}
            className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${showMemo ? "bg-amber-200 text-amber-800" : "text-gray-400 hover:text-amber-600"}`}
            title="Research Memo"
          >
            📝 Memo
          </button>
          <BackgroundGenButton />
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#CB9180] hover:bg-[#AA7667] disabled:opacity-50 transition-colors"
            >
              {loading ? "⏳ Running..." : "↻ Regenerate"}
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-3 overflow-auto" style={{ height: panelHeight }}>
          <div className="flex gap-3">
            {/* Instructions input */}
            <div className="flex-1 min-w-0 flex flex-col">
              <ExpandableTextarea
                ref={textareaRef}
                defaultValue={currentValue}
                onChange={handleChange}
                placeholder={PLACEHOLDERS[stepName]}
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-gray-400 mr-0.5">Templates:</span>
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-white/80 hover:border-amber-300 transition-colors"
                    onClick={() => handleSuggestion(s.text)}
                  >
                    {s.label}
                  </button>
                ))}
                <div className="ml-auto">
                  <button
                    className={`px-2 py-0.5 text-xs transition-colors ${
                      showHistory ? "text-amber-600 font-medium" : "text-gray-400 hover:text-gray-600"
                    }`}
                    onClick={() => setShowHistory(!showHistory)}
                    title="Prompt history"
                  >
                    📜 History
                  </button>
                </div>
              </div>

              {/* Prompt history — inside the instructions column */}
              {showHistory && (
                <div className="mt-2 p-2.5 bg-white/60 rounded-lg border border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 mb-1">📜 Prompt History</div>
                  <PromptHistory step={stepName} />
                </div>
              )}
            </div>

            {/* Research Memo (side by side) */}
            {showMemo && (
              <div className="w-[220px] shrink-0 flex flex-col">
                <div className="text-xs font-semibold text-amber-700 mb-1.5">📝 Research Memo</div>
                <textarea
                  value={memo || ""}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Your research notes..."
                  className="w-full flex-1 outline-none resize-none font-zen scrollbar-thin text-sm border border-amber-200 rounded-lg p-2.5 bg-white/80 min-h-[48px]"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
