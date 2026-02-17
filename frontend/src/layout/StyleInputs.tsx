import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  useMemo,
} from "react";
import useCardStore from "@/stores/useCardStore";
import useCodeStore from "@/stores/useCodeStore";
import useConceptStore from "@/stores/useConceptStore";
import useAppStore from "@/stores/useAppStore";
import useEditStore from "@/stores/useEditStore";
import useLLMHistoryStore from "@/stores/useLLMHistoryStore";
import { useGenerate } from "@/api/useGenerate";

const stepToName: Record<string, string> = {
  "0": "data",
  "1": "card",
  "2": "code",
  "3": "concept",
  "4": "display",
};

interface StyleInputsProps {
  storeType?: string;
  className?: string;
}

// AI Sparkle Icon — used as badge in AI-generated section headers
const AIBadgeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="ai-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818CF8" />
        <stop offset="1" stopColor="#A78BFA" />
      </linearGradient>
    </defs>
    {/* Brain/circuit style */}
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="url(#ai-grad)" opacity="0.12" />
    <path d="M9 8.5L9 10M15 8.5V10M9 14H10.5M13.5 14H15M12 5V7M12 17V19M5 12H7M17 12H19" stroke="url(#ai-grad)" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="9" cy="12" r="1.5" fill="url(#ai-grad)" />
    <circle cx="15" cy="12" r="1.5" fill="url(#ai-grad)" />
    <circle cx="12" cy="9" r="1.5" fill="url(#ai-grad)" />
    <circle cx="12" cy="15" r="1.5" fill="url(#ai-grad)" />
    <path d="M9 12L12 9M12 9L15 12M15 12L12 15M12 15L9 12" stroke="url(#ai-grad)" strokeWidth="1" opacity="0.5" />
  </svg>
);

// Truncate verbose sentences to key point (first clause or ~80 chars)
function condenseSentence(text: string): { short: string; full: string; truncated: boolean } {
  const full = text.trim();
  if (full.length <= 80) return { short: full, full, truncated: false };
  
  // Try to cut at first comma, semicolon, or "to ensure/to verify/and verify" etc.
  const cutPatterns = [
    /,\s*(?:and\s+)?(?:to\s+ensure|to\s+verify|and\s+verify|which\s+|ensuring|while)/i,
    /,\s*(?:especially|particularly|specifically)/i,
    /\s+to\s+ensure\s+/i,
    /\s+and\s+verify\s+/i,
  ];
  
  for (const pattern of cutPatterns) {
    const match = full.match(pattern);
    if (match && match.index && match.index >= 30 && match.index <= 120) {
      return { short: full.substring(0, match.index).trim(), full, truncated: true };
    }
  }
  
  // Fallback: cut at ~80 chars at word boundary
  const cutAt = full.lastIndexOf(' ', 80);
  if (cutAt > 30) {
    return { short: full.substring(0, cutAt).trim() + '...', full, truncated: true };
  }
  
  return { short: full, full, truncated: false };
}

// Parse numbered items from text (e.g., "1) xxx 2) yyy" or "1. xxx 2. yyy")
function parseNumberedItems(text: string): string[] {
  // Split by patterns like "1) ", "2) ", "1. ", "2. " at start of line or after sentence
  const items = text.split(/(?:^|\s)(?=\d+[\)\.]\s)/g).map(s => s.trim()).filter(Boolean);
  if (items.length > 1) return items;
  // Fallback: split by newlines
  const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  return lines.length > 1 ? lines : [text];
}

// Categorize items into common patterns vs unique observations
function categorizeItems(items: string[]): { common: string[]; unique: string[] } {
  const common: string[] = [];
  const unique: string[] = [];
  
  for (const item of items) {
    const lower = item.toLowerCase();
    // Common patterns: general methodology descriptions, overall approach
    if (lower.includes('all ') || lower.includes('each ') || lower.includes('every ') ||
        lower.includes('overall') || lower.includes('across') || lower.includes('general') ||
        lower.includes('methodology') || lower.includes('approach') || lower.includes('process') ||
        lower.match(/^\d+[\)\.]\s*(the |i |we |codes? were|data was|segments? were)/i)) {
      common.push(item);
    } else {
      unique.push(item);
    }
  }
  
  // If nothing categorized as unique, split roughly in half
  if (unique.length === 0 && common.length > 2) {
    const mid = Math.ceil(common.length / 2);
    return { common: common.slice(0, mid), unique: common.slice(mid) };
  }
  // If nothing categorized as common, first item is common
  if (common.length === 0 && unique.length > 1) {
    return { common: [unique[0]], unique: unique.slice(1) };
  }
  
  return { common, unique };
}

// LLM Task Section
const LLMTaskSection = memo(
  ({
    whatLLMDid,
    rationale,
    llmDescription,
  }: {
    whatLLMDid?: string;
    rationale?: string;
    llmDescription?: string;
  }) => {
    if (!whatLLMDid && !rationale && !llmDescription) {
      return null;
    }

    // Parse whatLLMDid into categorized items
    const { common, unique } = whatLLMDid 
      ? categorizeItems(parseNumberedItems(whatLLMDid))
      : { common: [], unique: [] };

    // Parse rationale into sections
    const rationaleItems = rationale ? parseNumberedItems(rationale) : [];

    const AISection = ({ title, icon, accentFrom, accentTo, borderColor, defaultOpen = false, children: sectionChildren }: {
      title: string; icon: string; accentFrom: string; accentTo: string; borderColor: string; defaultOpen?: boolean; children: React.ReactNode;
    }) => (
      <details open={defaultOpen || undefined} className={`group rounded-xl mb-2.5 overflow-hidden border ${borderColor} shadow-sm`}>
        <summary className={`flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden bg-gradient-to-r ${accentFrom} ${accentTo}`}>
          <div className="w-6 h-6 rounded-md bg-white/80 backdrop-blur flex items-center justify-center text-sm shadow-sm">
            {icon}
          </div>
          <span className="text-xs font-bold text-gray-700 flex-1">{title}</span>
          <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5">
            <AIBadgeIcon />
            <span className="text-[9px] font-bold text-indigo-500 tracking-wide">AI</span>
          </div>
          <svg className="w-3.5 h-3.5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-3.5 py-3 bg-white/60 backdrop-blur-sm relative" onClick={(e) => e.stopPropagation()}>
          <div className="absolute top-1.5 right-2.5 flex items-center gap-1 opacity-30">
            <AIBadgeIcon />
            <span className="text-[8px] text-indigo-400 font-medium tracking-wider">GENERATED</span>
          </div>
          {sectionChildren}
        </div>
      </details>
    );

    return (
      <>
        {/* What Was Done */}
        {(llmDescription || common.length > 0) && (
          <AISection title="What Was Done" icon="✨" accentFrom="from-indigo-50" accentTo="to-violet-50" borderColor="border-indigo-200/60" defaultOpen>
            <div className="space-y-2">
              {llmDescription && (
                <div className="text-xs leading-5 font-zen font-semibold text-gray-700 bg-white/60 rounded-md px-2.5 py-2">
                  {llmDescription}
                </div>
              )}
              {common.length > 0 && (
                <ul className="space-y-1">
                  {common.map((item, i) => (
                    <li key={i} className="text-xs leading-5 text-gray-600 flex gap-1.5">
                      <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                      <span>{item.replace(/^\d+[\)\.]\s*/, '').trim()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </AISection>
        )}

        {/* Example Codes */}
        {unique.length > 0 && (
          <AISection title="Example Codes" icon="💡" accentFrom="from-amber-50" accentTo="to-orange-50" borderColor="border-amber-200/60">
            <div className="space-y-2">
              {unique.map((item, i) => {
                const text = item.replace(/^\d+[\)\.]\s*/, '');
                const codePattern = /Code\s*[\[【](.*?)[\]】]\s*/g;
                const codeEntries: { name: string; explanation: string }[] = [];
                let codeMatch;
                const codePositions: { start: number; end: number; name: string }[] = [];
                while ((codeMatch = codePattern.exec(text)) !== null) {
                  codePositions.push({ start: codeMatch.index, end: codePattern.lastIndex, name: codeMatch[1].trim() });
                }
                for (let ci = 0; ci < codePositions.length; ci++) {
                  const nextStart = ci + 1 < codePositions.length ? codePositions[ci + 1].start : text.length;
                  const explanation = text.substring(codePositions[ci].end, nextStart).replace(/^\s*[,.:;]\s*/, '').trim();
                  codeEntries.push({ name: codePositions[ci].name, explanation });
                }
                const mainText = codePositions.length > 0
                  ? text.substring(0, codePositions[0].start).replace(/\s*Example:\s*$/i, '').trim()
                  : text;
                
                return (
                  <div key={i} className="bg-amber-50/60 rounded-lg px-2.5 py-2 border-l-3 border-amber-300" style={{ borderLeftWidth: '3px' }}>
                    {mainText && (
                      <div className="text-xs leading-5 text-gray-600 mb-1">{mainText}</div>
                    )}
                    {codeEntries.length > 0 && (
                      <div className="space-y-1.5 mt-1.5">
                        {codeEntries.map((entry, j) => (
                          <div key={j} className="flex items-start gap-1.5">
                            <span className="text-amber-500 mt-0.5 text-[10px] shrink-0">▸</span>
                            <div>
                              <span className="text-[11px] leading-4 text-amber-800 bg-amber-100 rounded px-1.5 py-0.5 font-medium">
                                {entry.name}
                              </span>
                              {entry.explanation && (
                                <span className="text-[11px] leading-4 text-gray-500 ml-1">
                                  — {entry.explanation}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </AISection>
        )}

        {/* Self-Reflection */}
        {rationaleItems.length > 0 && (
          <AISection title="Self-Reflection" icon="🔍" accentFrom="from-emerald-50" accentTo="to-teal-50" borderColor="border-emerald-200/60">
            <div className="space-y-2">
              {rationaleItems.map((item, i) => {
                const text = item.replace(/^\d+[\)\.]\s*/, '');
                const labelMatch = text.match(/^(Most confident|Less confident|Focus on human review)\s*:\s*/i);
                const label = labelMatch ? labelMatch[1] : null;
                const body = label ? text.substring(labelMatch![0].length).trim() : text;

                const codePattern = /Code\s*[\[【](.*?)[\]】]\s*/g;
                const codeEntries: { name: string; explanation: string }[] = [];
                const codePositions: { start: number; end: number; name: string }[] = [];
                let codeMatch;
                while ((codeMatch = codePattern.exec(body)) !== null) {
                  codePositions.push({ start: codeMatch.index, end: codePattern.lastIndex, name: codeMatch[1].trim() });
                }
                for (let ci = 0; ci < codePositions.length; ci++) {
                  const nextStart = ci + 1 < codePositions.length ? codePositions[ci + 1].start : body.length;
                  const explanation = body.substring(codePositions[ci].end, nextStart).replace(/^\s*[,.:;]\s*/, '').trim();
                  codeEntries.push({ name: codePositions[ci].name, explanation });
                }
                const mainText = codePositions.length > 0
                  ? body.substring(0, codePositions[0].start).trim()
                  : body;

                const labelColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
                  'most confident': { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
                  'less confident': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
                  'focus on human review': { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
                };
                const colors = label ? labelColors[label.toLowerCase()] || { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' } : { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' };

                return (
                  <div key={i} className={`${colors.bg} rounded-lg px-2.5 py-2 ${colors.border}`} style={{ borderLeftWidth: '3px' }}>
                    {label && (
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${colors.text} mb-1 block`}>{label}</span>
                    )}
                    {mainText && (
                      <div className="text-xs leading-5 text-gray-600">{mainText}</div>
                    )}
                    {codeEntries.length > 0 && (
                      <div className="space-y-1.5 mt-1.5">
                        {codeEntries.map((entry, j) => (
                          <div key={j} className="flex items-start gap-1.5">
                            <span className={`${colors.text} mt-0.5 text-[10px] shrink-0`}>▸</span>
                            <div>
                              <span className={`text-[11px] leading-4 ${colors.badge} rounded px-1.5 py-0.5 font-medium`}>
                                {entry.name}
                              </span>
                              {entry.explanation && (
                                <span className="text-[11px] leading-4 text-gray-500 ml-1">
                                  — {entry.explanation}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </AISection>
        )}
      </>
    );
  }
);

LLMTaskSection.displayName = "LLMTaskSection";

// Prompt History Section
const PromptHistorySection = memo(({ step }: { step: string }) => {
  const { llmHistory = [] } = useLLMHistoryStore();

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stepHistory = useMemo(() => {
    return (llmHistory || []).filter((entry) => entry.step === step);
  }, [llmHistory, step]);

  return (
    <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-4 mx-0">
      <div className="absolute -top-2.5 left-3 bg-white px-1.5 text-xs">
        <span className="font-semibold text-[11px]">Prompt History</span>
      </div>
      <div className="px-3 py-2">
        {stepHistory.length > 0 ? (
          <div className="space-y-3">
            {stepHistory.map((entry) => (
              <div
                key={entry.id}
                className="border border-gray-200 rounded-lg p-3"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-gray-500">
                    {entry.timestamp
                      ? formatTimestamp(entry.timestamp)
                      : "No timestamp"}
                  </span>
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {entry?.userPrompt || ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray pb-4 text-left">
            No Prompt History
          </div>
        )}
      </div>
    </div>
  );
});

PromptHistorySection.displayName = "PromptHistorySection";

// StyleInputs Component - need to wrap with forwardRef
const StyleInputs = React.forwardRef<
  { saveChangesToStore: () => void },
  StyleInputsProps
>(({ storeType, className }, ref) => {
  // Get current step as fallback
  const { step } = useGenerate();
  const currentStoreType = storeType || stepToName[step] || "data";
  // const currentStepName = stepToName[step] || "data";

  // Store state - only subscribe to needed fields
  const {
    clusteringStyle,
    setClusteringStyle,
    codingStyle,
    setCodingStyle,
    conceptualizingStyle,
    setConceptualizingStyle,
    numberOfTopicClusters,
    setNumberOfTopicClusters,
  } = useAppStore();

  const {
    topicMemo,
    setTopicMemo,
    codeMemo,
    setCodeMemo,
    conceptMemo,
    setConceptMemo,
  } = useEditStore();

  // LLM task information - use useMemo to avoid creating new objects every time
  const cardLLMInfo = useCardStore((state) => ({
    whatLLMDid: state.whatLLMDid,
    rationale: state.rationale,
    llmDescription: state.llmDescription,
  }));

  const codeLLMInfo = useCodeStore((state) => ({
    whatLLMDid: state.whatLLMDid,
    rationale: state.rationale,
    llmDescription: state.llmDescription,
  }));

  const conceptLLMInfo = useConceptStore((state) => ({
    whatLLMDid: state.whatLLMDid,
    rationale: state.rationale,
    llmDescription: state.llmDescription,
  }));

  // Local state management
  const [localTopicClusterRange, setLocalTopicClusterRange] = useState<
    [number, number]
  >(
    Array.isArray(numberOfTopicClusters)
      ? (numberOfTopicClusters as [number, number])
      : [15, 20]
  );

  // Refs for textarea elements - use useRef to avoid re-creating
  const clusteringTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const codingTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const conceptualizingTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const topicMemoTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const codeMemoTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const conceptMemoTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // Refs to store current values without triggering re-renders
  const clusteringValueRef = useRef(clusteringStyle || "");
  const codingValueRef = useRef(codingStyle || "");
  const conceptualizingValueRef = useRef(conceptualizingStyle || "");
  const topicMemoRef = useRef(topicMemo || "");
  const codeMemoRef = useRef(codeMemo || "");
  const conceptMemoRef = useRef(conceptMemo || "");

  // Only sync once on initial load, avoid subsequent syncs
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      // Only set values on initialization
      clusteringValueRef.current = clusteringStyle || "";
      codingValueRef.current = codingStyle || "";
      conceptualizingValueRef.current = conceptualizingStyle || "";
      topicMemoRef.current = topicMemo || "";
      codeMemoRef.current = codeMemo || "";
      conceptMemoRef.current = conceptMemo || "";

      // Update actual textarea elements
      if (clusteringTextAreaRef.current) {
        clusteringTextAreaRef.current.value = clusteringStyle || "";
      }
      if (codingTextAreaRef.current) {
        codingTextAreaRef.current.value = codingStyle || "";
      }
      if (conceptualizingTextAreaRef.current) {
        conceptualizingTextAreaRef.current.value = conceptualizingStyle || "";
      }
      if (topicMemoTextAreaRef.current) {
        topicMemoTextAreaRef.current.value = topicMemo || "";
      }
      if (codeMemoTextAreaRef.current) {
        codeMemoTextAreaRef.current.value = codeMemo || "";
      }
      if (conceptMemoTextAreaRef.current) {
        conceptMemoTextAreaRef.current.value = conceptMemo || "";
      }

      setIsInitialized(true);
    }
  }, [
    isInitialized,
    clusteringStyle,
    codingStyle,
    conceptualizingStyle,
    topicMemo,
    codeMemo,
    conceptMemo,
  ]);

  // Sync topic cluster range
  useEffect(() => {
    if (Array.isArray(numberOfTopicClusters)) {
      setLocalTopicClusterRange(numberOfTopicClusters as [number, number]);
    }
  }, [numberOfTopicClusters]);

  // Event handlers - use useCallback to avoid re-creating
  const handleClusterChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      clusteringValueRef.current = e.target.value;
    },
    []
  );

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      codingValueRef.current = e.target.value;
    },
    []
  );

  const handleConceptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      conceptualizingValueRef.current = e.target.value;
    },
    []
  );

  const handleTopicMemoChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      topicMemoRef.current = e.target.value;
    },
    []
  );

  const handleCodeMemoChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      codeMemoRef.current = e.target.value;
    },
    []
  );

  const handleConceptMemoChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      conceptMemoRef.current = e.target.value;
    },
    []
  );

  const handleTopicClusterRangeChange = useCallback(
    (e: Event, newValue: number | number[]) => {
      setLocalTopicClusterRange(newValue as [number, number]);
    },
    []
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string, type: "clustering" | "coding" | "conceptualizing") => {
      if (type === "clustering") {
        const newValue = clusteringValueRef.current
          ? `${clusteringValueRef.current}; ${suggestion}`
          : suggestion;
        clusteringValueRef.current = newValue;

        if (clusteringTextAreaRef.current) {
          clusteringTextAreaRef.current.value = newValue;
          clusteringTextAreaRef.current.focus();
        }
      } else if (type === "coding") {
        const newValue = codingValueRef.current
          ? `${codingValueRef.current}; ${suggestion}`
          : suggestion;
        codingValueRef.current = newValue;

        if (codingTextAreaRef.current) {
          codingTextAreaRef.current.value = newValue;
          codingTextAreaRef.current.focus();
        }
      } else if (type === "conceptualizing") {
        const newValue = conceptualizingValueRef.current
          ? `${conceptualizingValueRef.current}; ${suggestion}`
          : suggestion;
        conceptualizingValueRef.current = newValue;

        if (conceptualizingTextAreaRef.current) {
          conceptualizingTextAreaRef.current.value = newValue;
          conceptualizingTextAreaRef.current.focus();
        }
      }
    },
    []
  );

  // Save changes function - exposed to parent component
  const saveChangesToStore = useCallback(() => {
    if (clusteringValueRef.current !== clusteringStyle) {
      setClusteringStyle(clusteringValueRef.current);
    }
    if (codingValueRef.current !== codingStyle) {
      setCodingStyle(codingValueRef.current);
    }
    if (conceptualizingValueRef.current !== conceptualizingStyle) {
      setConceptualizingStyle(conceptualizingValueRef.current);
    }
    if (topicMemoRef.current !== topicMemo) {
      setTopicMemo(topicMemoRef.current);
    }
    if (codeMemoRef.current !== codeMemo) {
      setCodeMemo(codeMemoRef.current);
    }
    if (conceptMemoRef.current !== conceptMemo) {
      setConceptMemo(conceptMemoRef.current);
    }
    if (
      JSON.stringify(localTopicClusterRange) !==
      JSON.stringify(numberOfTopicClusters)
    ) {
      setNumberOfTopicClusters(localTopicClusterRange);
    }
  }, [
    localTopicClusterRange,
    clusteringStyle,
    codingStyle,
    conceptualizingStyle,
    topicMemo,
    codeMemo,
    conceptMemo,
    numberOfTopicClusters,
    setClusteringStyle,
    setCodingStyle,
    setConceptualizingStyle,
    setTopicMemo,
    setCodeMemo,
    setConceptMemo,
    setNumberOfTopicClusters,
  ]);

  // Expose saveChangesToStore function to parent component
  React.useImperativeHandle(
    ref,
    () => ({
      saveChangesToStore,
    }),
    [saveChangesToStore]
  );

  // Select corresponding LLM information based on storeType
  // const currentLLMInfo = useMemo(() => {
  //   switch (currentStoreType) {
  //     case "card":
  //       return cardLLMInfo;
  //     case "code":
  //       return codeLLMInfo;
  //     case "concept":
  //       return conceptLLMInfo;
  //     default:
  //       return { whatLLMDid: "", rationale: "", llmDescription: "" };
  //   }
  // }, [currentStoreType, cardLLMInfo, codeLLMInfo, conceptLLMInfo]);

  // Human-action section (matches AI section style but with human/warm colors)
  const HumanSection = ({ title, icon, defaultOpen = false, children: sectionChildren }: {
    title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode;
  }) => (
    <details open={defaultOpen || undefined} className="group rounded-xl mb-2.5 overflow-hidden border border-[#CB9180]/30 shadow-sm">
      <summary className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden bg-gradient-to-r from-orange-50 to-rose-50">
        <div className="w-6 h-6 rounded-md bg-white/80 backdrop-blur flex items-center justify-center text-sm shadow-sm">
          {icon}
        </div>
        <span className="text-xs font-bold text-gray-700 flex-1">{title}</span>
        <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-full px-1.5 py-0.5">
          <svg className="w-3 h-3 text-[#CB9180]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
          </svg>
          <span className="text-[9px] font-bold text-[#CB9180] tracking-wide">YOU</span>
        </div>
        <svg className="w-3.5 h-3.5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-3.5 py-3 bg-white/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>{sectionChildren}</div>
    </details>
  );

  // Keep old Section for non-categorized use (display step)
  const Section = ({ title, icon, defaultOpen = false, children: sectionChildren }: {
    title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode;
  }) => (
    <details open={defaultOpen || undefined} className="group border border-gray-200 rounded-lg mb-2 overflow-hidden">
      <summary className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 cursor-pointer text-xs font-semibold text-gray-600 hover:bg-gray-100 select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="transition-transform group-open:rotate-90 text-[10px]">▶</span>
        <span>{icon}</span>
        <span>{title}</span>
      </summary>
      <div className="px-3 py-2" onClick={(e) => e.stopPropagation()}>{sectionChildren}</div>
    </details>
  );

  // Category header
  const CategoryHeader = ({ label, color }: { label: string; color: string }) => (
    <div className={`flex items-center gap-2 mb-2 mt-3 first:mt-0`}>
      <div className={`w-1.5 h-4 rounded-full ${color}`} />
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {/* Card step content */}
      <div className={currentStoreType === "card" ? "block" : "hidden"}>
        <CategoryHeader label="Understand" color="bg-indigo-500" />
        <LLMTaskSection {...cardLLMInfo} />

        <CategoryHeader label="Act" color="bg-amber-500" />
        <HumanSection title="Custom Instructions" icon="💬" defaultOpen>
          <textarea
            ref={clusteringTextAreaRef}
            defaultValue={clusteringStyle || ""}
            onChange={handleClusterChange}
            className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-xs border border-gray-200 rounded-md p-2"
            style={{ minHeight: "60px", maxHeight: "200px" }}
          />
          <div className="mt-2 flex flex-wrap gap-1">
            <button className="px-2 py-0.5 border border-gray-200 rounded text-[10px] text-gray-500 hover:bg-gray-50" onClick={() => handleSuggestionClick("In-Vivo coding: Use the direct language of raw data as codes", "clustering")}>In-Vivo</button>
            <button className="px-2 py-0.5 border border-gray-200 rounded text-[10px] text-gray-500 hover:bg-gray-50" onClick={() => handleSuggestionClick("Descriptive coding: Assign basic labels to describe the main topic", "clustering")}>Descriptive</button>
          </div>
        </HumanSection>
        <HumanSection title="Prompt History" icon="📜">
          <PromptHistorySection step="card" />
        </HumanSection>
      </div>

      {/* Code step content */}
      <div className={currentStoreType === "code" ? "block" : "hidden"}>
        <CategoryHeader label="Understand" color="bg-indigo-500" />
        <LLMTaskSection {...codeLLMInfo} />

        <CategoryHeader label="Act" color="bg-amber-500" />
        <HumanSection title="Custom Instructions" icon="💬" defaultOpen>
          <textarea
            ref={codingTextAreaRef}
            defaultValue={codingStyle || ""}
            onChange={handleCodeChange}
            className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-xs border border-gray-200 rounded-md p-2"
            style={{ minHeight: "60px", maxHeight: "200px" }}
          />
          <div className="mt-2 flex flex-wrap gap-1">
            <button className="px-2 py-0.5 border border-gray-200 rounded text-[10px] text-gray-500 hover:bg-gray-50" onClick={() => handleSuggestionClick("In-Vivo coding: Use the direct words of raw data as sub-themes", "coding")}>In-Vivo</button>
            <button className="px-2 py-0.5 border border-gray-200 rounded text-[10px] text-gray-500 hover:bg-gray-50" onClick={() => handleSuggestionClick("Descriptive coding: Assign basic labels to describe the main sub-theme", "coding")}>Descriptive</button>
          </div>
        </HumanSection>
        <HumanSection title="Prompt History" icon="📜">
          <PromptHistorySection step="code" />
        </HumanSection>
      </div>

      {/* Concept step content */}
      <div className={currentStoreType === "concept" ? "block" : "hidden"}>
        <CategoryHeader label="Understand" color="bg-indigo-500" />
        <LLMTaskSection {...conceptLLMInfo} />

        <CategoryHeader label="Act" color="bg-amber-500" />
        <HumanSection title="Custom Instructions" icon="💬" defaultOpen>
          <textarea
            ref={conceptualizingTextAreaRef}
            defaultValue={conceptualizingStyle || ""}
            onChange={handleConceptChange}
            className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-xs border border-gray-200 rounded-md p-2"
            style={{ minHeight: "60px", maxHeight: "200px" }}
          />
          <div className="mt-2 flex flex-wrap gap-1">
            <button className="px-2 py-0.5 border border-gray-200 rounded text-[10px] text-gray-500 hover:bg-gray-50" onClick={() => handleSuggestionClick("Thematic analysis: Identify patterns and themes across sub-themes", "conceptualizing")}>Thematic</button>
            <button className="px-2 py-0.5 border border-gray-200 rounded text-[10px] text-gray-500 hover:bg-gray-50" onClick={() => handleSuggestionClick("Theoretical conceptualization: Link findings to established theories", "conceptualizing")}>Theoretical</button>
          </div>
        </HumanSection>
        <HumanSection title="Prompt History" icon="📜">
          <PromptHistorySection step="concept" />
        </HumanSection>
      </div>

      {/* Display step content */}
      <div className={currentStoreType === "display" ? "block" : "hidden"}>
        <Section title="Analysis Complete" icon="✅" defaultOpen>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>• Review the generated visualization</li>
            <li>• Export your results as PDF</li>
            <li>• Save this version to history</li>
          </ul>
        </Section>
        <Section title="Settings Used" icon="⚙️">
          <div className="text-xs space-y-1.5">
            <div><span className="font-medium text-gray-500">Clustering:</span> <span className="text-gray-600">{clusteringStyle || "Default"}</span></div>
            <div><span className="font-medium text-gray-500">Coding:</span> <span className="text-gray-600">{codingStyle || "Default"}</span></div>
            <div><span className="font-medium text-gray-500">Themes:</span> <span className="text-gray-600">{conceptualizingStyle || "Default"}</span></div>
          </div>
        </Section>
      </div>
    </div>
  );
});

StyleInputs.displayName = "StyleInputs";

export const StyleInputsWithRef = StyleInputs;

StyleInputsWithRef.displayName = "StyleInputsWithRef";

export default StyleInputs;
