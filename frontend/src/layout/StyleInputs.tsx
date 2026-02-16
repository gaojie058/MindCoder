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

// Human Icon
const HumanIcon = () => (
  <svg className="w-5 h-5 text-[#CB9180] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
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

  // Render all content, use CSS to control display/hide instead of conditional rendering
  return (
    <div className={`flex flex-col w-full ${className}`}>
      {/* Card step content */}
      <div className={currentStoreType === "card" ? "block" : "hidden"}>
        <LLMTaskSection {...cardLLMInfo} />
        <div className="bg-orange-50/50 rounded-xl p-3 mt-2 mb-2 border border-orange-100">
          <div className="flex items-center gap-2 mb-2"><HumanIcon /><h2 className="text-sm font-bold text-[#CB9180]">Your Task</h2></div>
          <ul className="space-y-1 text-xs text-gray-700">
            <li>• Check if chunks are grouped correctly</li>
            <li>• Rename vague codes to be more specific</li>
          </ul>
        </div>
        <div className="gap-4 flex flex-col">
          <PromptHistorySection step="card" />
          <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-4 mx-0">
            <div className="absolute -top-2.5 left-3 bg-white px-1.5 text-xs">
              <span className="font-medium">
                Open Codes per File
              </span>
            </div>
            <div className="px-3 py-3">
              <Slider
                value={localTopicClusterRange}
                onChange={handleTopicClusterRangeChange}
                aria-labelledby="topic-cluster-range-slider"
                valueLabelDisplay="auto"
                step={1}
                marks={[
                  { value: 0, label: "0" },
                  { value: 10, label: "10" },
                  { value: 20, label: "20" },
                  { value: 30, label: "30" },
                  { value: 40, label: "40" },
                  { value: 50, label: "50" },
                ]}
                min={0}
                max={50}
                disableSwap
                sx={{
                  "& .MuiSlider-thumb": {
                    height: 24,
                    width: 24,
                    backgroundColor: "#CB9180",
                  },
                  "& .MuiSlider-track": {
                    height: 16,
                    backgroundColor: "#CB9180",
                    border: "none",
                  },
                  "& .MuiSlider-rail": {
                    height: 16,
                    backgroundColor: "#CB9180",
                    opacity: 0.2,
                  },
                  "& .MuiSlider-mark": {
                    backgroundColor: "#CB9180",
                  },
                }}
              />
            </div>
            <div className="bg-[#FFF4EF] text-[11px] text-gray-500 rounded-lg">
              <p className="p-2">
                "Open Codes" means codes generated by GPT from semantic level.
                Under each open code, there are a few text chunks that share
                similar topics, helping you group your qualitative data that
                share common topics at the semantic level. It forms a foundation
                for later sub-theme labeling and high-level themes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Code step content */}
      <div className={currentStoreType === "code" ? "block" : "hidden"}>
        <LLMTaskSection {...codeLLMInfo} />
        <div className="bg-orange-50/50 rounded-xl p-3 mt-2 mb-2 border border-orange-100">
          <div className="flex items-center gap-2 mb-2"><HumanIcon /><h2 className="text-sm font-bold text-[#CB9180]">Your Task</h2></div>
          <ul className="space-y-1 text-xs text-gray-700">
            <li>• Check if codes within each sub-theme belong together</li>
            <li>• Merge or split sub-themes as needed</li>
          </ul>
        </div>
        <div className="gap-4 flex flex-col">
          <PromptHistorySection step="code" />
        </div>
      </div>

      {/* Concept step content */}
      <div className={currentStoreType === "concept" ? "block" : "hidden"}>
        <LLMTaskSection {...conceptLLMInfo} />
        <div className="bg-orange-50/50 rounded-xl p-3 mt-2 mb-2 border border-orange-100">
          <div className="flex items-center gap-2 mb-2"><HumanIcon /><h2 className="text-sm font-bold text-[#CB9180]">Your Task</h2></div>
          <ul className="space-y-1 text-xs text-gray-700">
            <li>• Ensure themes are distinct and well-named (4-8 words)</li>
            <li>• Check sub-themes fit coherently within each theme</li>
          </ul>
        </div>
        <div className="gap-4 flex flex-col">
          <PromptHistorySection step="concept" />
        </div>
      </div>

      {/* Display step content */}
      <div className={currentStoreType === "display" ? "block" : "hidden"}>
        <div className="flex flex-col w-full space-y-4">
          <h1 className="text-lg font-bold">Analysis Complete</h1>
          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
            <p className="mb-2">
              Your qualitative data analysis has been completed. You can now:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Review the generated visualization</li>
              <li>Export your results as PDF</li>
              <li>Save this version to history</li>
            </ul>
          </div>

          {/* Display previous settings summary */}
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Analysis Settings Used:</h2>
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium">Clustering Style:</span>
                <p className="text-gray-600 mt-1">
                  {clusteringStyle || "Default"}
                </p>
              </div>
              <div>
                <span className="font-medium">Coding Style:</span>
                <p className="text-gray-600 mt-1">{codingStyle || "Default"}</p>
              </div>
              <div>
                <span className="font-medium">Conceptualizing Style:</span>
                <p className="text-gray-600 mt-1">
                  {conceptualizingStyle || "Default"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All input forms */}
      <div className="gap-4 flex flex-col">
        {/* Clustering input - only show in card step */}
        <div className={currentStoreType === "card" ? "block" : "hidden"}>
          <div className="w-full flex flex-col mt-4 border rounded-xl border-black relative pt-4 mx-0">
            <div className="absolute -top-2.5 left-3 bg-white px-1.5 text-xs">
              <span className="font-medium">💬 Instructions</span>
            </div>
            <textarea
              ref={clusteringTextAreaRef}
              defaultValue={clusteringStyle || ""}
              onChange={handleClusterChange}
              className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin px-6 text-sm"
              style={{ minHeight: "80px", maxHeight: "300px" }}
            />
            <div className="mt-2 px-4">
              <p className="mb-1 text-[11px] font-medium text-gray-500">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-[11px] text-left text-gray-600"
                  onClick={() =>
                    handleSuggestionClick(
                      "In-Vivo coding: Use the direct language of raw data as codes rather than researcher-generated words and phrases",
                      "clustering"
                    )
                  }
                >
                  In-Vivo coding: Use the direct words and phrases of raw data
                  as open codes rather than researcher-generated words and
                  phrases
                </button>
                <button
                  className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-[11px] text-left text-gray-600"
                  onClick={() =>
                    handleSuggestionClick(
                      "Descriptive coding: Assign basic labels to data to describe the main topic",
                      "clustering"
                    )
                  }
                >
                  Descriptive coding: Assign basic labels to data to describe
                  the open codes
                </button>
              </div>
            </div>
            <div className="bg-[#FFF4EF] text-[11px] text-gray-500 rounded-lg mt-1">
              <p className="p-2">
                Tell us how you want to cluster your topics. This will guide the
                initial open coding of your data.
              </p>
            </div>
          </div>

          <div className="w-full flex flex-col mt-4 border rounded-xl border-black relative pt-4 mx-0">
            <div className="absolute -top-2.5 left-3 bg-white px-1.5 text-xs">
              <span className="font-medium">📝 Memo</span>
            </div>
            <textarea
              ref={topicMemoTextAreaRef}
              defaultValue={topicMemo || ""}
              onChange={handleTopicMemoChange}
              placeholder="Write your thoughts, observations, or notes about the open coding process..."
              className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin px-6 text-sm"
              style={{ minHeight: "120px", maxHeight: "36px" }}
            />
            <div className="bg-[#FFF4EF] text-[11px] text-gray-500 rounded-lg mt-1">
              <p className="p-2">Write why you perform such interpretation.</p>
            </div>
          </div>
        </div>

        {/* Coding input - only show in code step */}
        <div className={currentStoreType === "code" ? "block" : "hidden"}>
          <div className="w-full flex flex-col mt-4 border rounded-xl border-black relative pt-4 mx-0">
            <div className="absolute -top-2.5 left-3 bg-white px-1.5 text-xs">
              <span className="font-medium">💬 Instructions</span>
            </div>
            <div className="px-3 py-3">
              <textarea
                ref={codingTextAreaRef}
                defaultValue={codingStyle || ""}
                onChange={handleCodeChange}
                className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-sm"
                style={{ minHeight: "80px", maxHeight: "300px" }}
              />
            </div>
            <div className="mt-2 px-4">
              <p className="mb-1 text-[11px] font-medium text-gray-500">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-[11px] text-left text-gray-600"
                  onClick={() =>
                    handleSuggestionClick(
                      "In-Vivo coding: Use the direct words and phrases of raw data as sub-themes rather than researcher-generated words and phrases",
                      "coding"
                    )
                  }
                >
                  In-Vivo coding: Use the direct words and phrases of raw data
                  as sub-themes rather than researcher-generated words and
                  phrases
                </button>
                <button
                  className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-[11px] text-left text-gray-600"
                  onClick={() =>
                    handleSuggestionClick(
                      "Descriptive coding: Assign basic labels to data to describe the main topic",
                      "coding"
                    )
                  }
                >
                  Descriptive coding: Assign basic labels to data to describe
                  the main sub-theme
                </button>
              </div>
            </div>
            <div className="bg-[#FFF4EF] text-[11px] text-gray-500 rounded-lg">
              <p className="p-2">
                "Sub-themes" represent different "groups of open codes" sharing
                similar higher level topics. Tell us how you want to label
                sub-themes. This will influence how your open codes are
                categorized and assigned sub-theme names.
              </p>
            </div>
          </div>

          <div className="w-full flex flex-col mt-4 border rounded-xl border-black relative pt-4 mx-0">
            <div className="absolute -top-2.5 left-3 bg-white px-1.5 text-xs">
              <span className="font-medium">📝 Memo</span>
            </div>
            <div className="px-3 py-3">
              <textarea
                ref={codeMemoTextAreaRef}
                defaultValue={codeMemo || ""}
                onChange={handleCodeMemoChange}
                placeholder="Write your thoughts, observations, or notes about the sub-theme labeling process..."
                className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-sm"
                style={{ minHeight: "80px", maxHeight: "300px" }}
              />
            </div>
            <div className="bg-[#FFF4EF] text-[11px] text-gray-500 rounded-lg">
              <p className="p-2">Write why you perform such interpretation.</p>
            </div>
          </div>
        </div>

        {/* Concept input - only show in concept step */}
        <div className={currentStoreType === "concept" ? "block" : "hidden"}>
          <div className="w-full flex flex-col mt-4 border rounded-xl border-black relative pt-4 mx-0">
            <div className="absolute -top-2.5 left-3 bg-white px-1.5 text-xs">
              <span className="font-medium">💬 Instructions</span>
            </div>
            <div className="px-3 py-3">
              <textarea
                ref={conceptualizingTextAreaRef}
                defaultValue={conceptualizingStyle || ""}
                onChange={handleConceptChange}
                className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-sm"
                style={{ minHeight: "80px", maxHeight: "300px" }}
              />
            </div>
            <div className="mt-2 px-4">
              <p className="mb-1 text-[11px] font-medium text-gray-500">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-[11px] text-left text-gray-600"
                  onClick={() =>
                    handleSuggestionClick(
                      "Thematic analysis: Identify patterns and themes across sub-themes",
                      "conceptualizing"
                    )
                  }
                >
                  Thematic analysis: Identify patterns and themes across
                  sub-themes
                </button>
                <button
                  className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-[11px] text-left text-gray-600"
                  onClick={() =>
                    handleSuggestionClick(
                      "Theoretical conceptualization: Link findings to established theories",
                      "conceptualizing"
                    )
                  }
                >
                  Theoretical conceptualization: Link findings to established
                  theories
                </button>
              </div>
            </div>
            <div className="bg-[#FFF4EF] text-[11px] text-gray-500 rounded-lg">
              <p className="p-2">
                "Themes" represent high-level categories of sub-themes, sharing
                similar higher level topics. Tell us how you want to
                conceptualize your findings. This will shape the final
                interpretation of your data.
              </p>
            </div>
          </div>

          <div className="w-full flex flex-col mt-4 border rounded-xl border-black relative pt-4 mx-0">
            <div className="absolute -top-2.5 left-3 bg-white px-1.5 text-xs">
              <span className="font-medium">📝 Memo</span>
            </div>
            <div className="px-3 py-3">
              <textarea
                ref={conceptMemoTextAreaRef}
                defaultValue={conceptMemo || ""}
                onChange={handleConceptMemoChange}
                placeholder="Write your thoughts, observations, or notes about the theme process..."
                className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-sm"
                style={{ minHeight: "80px", maxHeight: "300px" }}
              />
            </div>
            <div className="bg-[#FFF4EF] text-[11px] text-gray-500 rounded-lg">
              <p className="p-2">Write why you perform such interpretation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

StyleInputs.displayName = "StyleInputs";

export const StyleInputsWithRef = StyleInputs;

StyleInputsWithRef.displayName = "StyleInputsWithRef";

export default StyleInputs;
