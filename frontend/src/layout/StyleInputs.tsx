import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  useMemo,
} from "react";
import { Slider } from "@mui/material";
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

// AI Agent Icon
const AIIcon = () => (
  <svg className="w-5 h-5 text-[#6366F1] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

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

    return (
      <div className="bg-indigo-50/50 rounded-xl p-3 mb-2 border border-indigo-100">
        <div className="flex items-center gap-2 mb-2">
          <AIIcon />
          <h2 className="text-sm font-bold text-indigo-700">AI Agent</h2>
        </div>
        {llmDescription && (
          <div className="text-xs whitespace-pre-line leading-4 font-zen font-semibold mb-2 text-gray-700">
            {llmDescription}
          </div>
        )}
        {whatLLMDid && (
          <div className="mb-2">
            <div className="text-xs whitespace-pre-line leading-4 text-gray-600">
              {whatLLMDid}
            </div>
          </div>
        )}
        {rationale && (
          <details className="text-xs">
            <summary className="font-semibold cursor-pointer text-indigo-600 hover:text-indigo-800">Self-Reflection</summary>
            <div className="mt-1 whitespace-pre-line leading-4 text-gray-600 pl-2 border-l-2 border-indigo-200">
              {rationale}
            </div>
          </details>
        )}
      </div>
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

  // Collapsible section helper
  const Section = ({ title, icon, defaultOpen = false, children: sectionChildren }: {
    title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode;
  }) => (
    <details open={defaultOpen} className="group border border-gray-200 rounded-lg mb-2 overflow-hidden">
      <summary className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 cursor-pointer text-xs font-semibold text-gray-600 hover:bg-gray-100 select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="transition-transform group-open:rotate-90 text-[10px]">▶</span>
        <span>{icon}</span>
        <span>{title}</span>
      </summary>
      <div className="px-3 py-2">{sectionChildren}</div>
    </details>
  );

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {/* Card step content */}
      <div className={currentStoreType === "card" ? "block" : "hidden"}>
        <Section title="AI Agent Summary" icon="🤖" defaultOpen>
          <LLMTaskSection {...cardLLMInfo} />
        </Section>

        <Section title="Your Task" icon="✍️">
          <ul className="space-y-1 text-xs text-gray-700">
            <li>• Check if chunks are grouped correctly</li>
            <li>• Rename vague codes to be more specific</li>
          </ul>
        </Section>

        <Section title="Open Codes per File" icon="🔢">
          <Slider
            value={localTopicClusterRange}
            onChange={handleTopicClusterRangeChange}
            valueLabelDisplay="auto"
            step={1}
            marks={[{ value: 0, label: "0" }, { value: 10, label: "10" }, { value: 20, label: "20" }, { value: 30, label: "30" }, { value: 40, label: "40" }, { value: 50, label: "50" }]}
            min={0} max={50} disableSwap
            sx={{
              "& .MuiSlider-thumb": { height: 20, width: 20, backgroundColor: "#CB9180" },
              "& .MuiSlider-track": { height: 12, backgroundColor: "#CB9180", border: "none" },
              "& .MuiSlider-rail": { height: 12, backgroundColor: "#CB9180", opacity: 0.2 },
              "& .MuiSlider-mark": { backgroundColor: "#CB9180" },
            }}
          />
        </Section>

        <Section title="Custom Instructions" icon="💬">
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
        </Section>

        <Section title="Research Memo" icon="📝">
          <textarea
            ref={topicMemoTextAreaRef}
            defaultValue={topicMemo || ""}
            onChange={handleTopicMemoChange}
            placeholder="Your notes on the open coding process..."
            className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-xs border border-gray-200 rounded-md p-2"
            style={{ minHeight: "60px", maxHeight: "200px" }}
          />
        </Section>

        <Section title="Prompt History" icon="📜">
          <PromptHistorySection step="card" />
        </Section>
      </div>

      {/* Code step content */}
      <div className={currentStoreType === "code" ? "block" : "hidden"}>
        <Section title="AI Agent Summary" icon="🤖" defaultOpen>
          <LLMTaskSection {...codeLLMInfo} />
        </Section>

        <Section title="Your Task" icon="✍️">
          <ul className="space-y-1 text-xs text-gray-700">
            <li>• Check if codes within each sub-theme belong together</li>
            <li>• Merge or split sub-themes as needed</li>
          </ul>
        </Section>

        <Section title="Custom Instructions" icon="💬">
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
        </Section>

        <Section title="Research Memo" icon="📝">
          <textarea
            ref={codeMemoTextAreaRef}
            defaultValue={codeMemo || ""}
            onChange={handleCodeMemoChange}
            placeholder="Your notes on the sub-theme process..."
            className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-xs border border-gray-200 rounded-md p-2"
            style={{ minHeight: "60px", maxHeight: "200px" }}
          />
        </Section>

        <Section title="Prompt History" icon="📜">
          <PromptHistorySection step="code" />
        </Section>
      </div>

      {/* Concept step content */}
      <div className={currentStoreType === "concept" ? "block" : "hidden"}>
        <Section title="AI Agent Summary" icon="🤖" defaultOpen>
          <LLMTaskSection {...conceptLLMInfo} />
        </Section>

        <Section title="Your Task" icon="✍️">
          <ul className="space-y-1 text-xs text-gray-700">
            <li>• Ensure themes are distinct and well-named (4-8 words)</li>
            <li>• Check sub-themes fit coherently within each theme</li>
          </ul>
        </Section>

        <Section title="Custom Instructions" icon="💬">
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
        </Section>

        <Section title="Research Memo" icon="📝">
          <textarea
            ref={conceptMemoTextAreaRef}
            defaultValue={conceptMemo || ""}
            onChange={handleConceptMemoChange}
            placeholder="Your notes on the theme process..."
            className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-xs border border-gray-200 rounded-md p-2"
            style={{ minHeight: "60px", maxHeight: "200px" }}
          />
        </Section>

        <Section title="Prompt History" icon="📜">
          <PromptHistorySection step="concept" />
        </Section>
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
