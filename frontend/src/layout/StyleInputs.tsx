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
      <>
        <h1 className="text-lg font-bold">MindCoder Mechanical Task</h1>
        {llmDescription && (
          <div>
            <div className="text-sm whitespace-pre-line leading-4 font-zen font-semibold">
              {llmDescription}
            </div>
          </div>
        )}
        <div className="w-full flex flex-col border rounded-xl border-black relative pt-2">
          <div className="px-6 py-2">
            {whatLLMDid && (
              <div className="mb-3">
                <p className="font-semibold text-sm mb-2">What LLM Did:</p>
                <div className="text-sm whitespace-pre-line leading-5">
                  {whatLLMDid}
                </div>
              </div>
            )}
            {rationale && (
              <div className="mb-3">
                <p className="font-semibold text-sm mb-2">
                  LLM Self Criticize:
                </p>
                <div className="text-sm whitespace-pre-line leading-5">
                  {rationale}
                </div>
              </div>
            )}
          </div>
        </div>
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
    <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
      <div className="absolute -top-3 left-4 bg-white px-2 text-lg">
        <span className="font-semibold">Prompt History</span>
      </div>
      <div className="px-6 py-4">
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

// StyleInputs Component - 需要用forwardRef包装
const StyleInputs = React.forwardRef<
  { saveChangesToStore: () => void },
  StyleInputsProps
>(({ storeType, className }, ref) => {
  // Get current step as fallback
  const { step } = useGenerate();
  const currentStoreType = storeType || stepToName[step] || "data";
  const currentStepName = stepToName[step] || "data";

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

  // 暴露保存函数给父组件 - 使用正确的ref参数
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
        <h1 className="text-lg font-bold pt-4">
          Human Interpretation & Testing
        </h1>
        <div className="text-sm mb-2">
          <p className="font-semibold mb-2">
            In this stage, the LLM offers an exploratory coding draft, while you
            should bring critical interpretation, contextual knowledge, and
            methodological rigor. Your revisions, notes, and reflections ensure
            that the analysis stays trustworthy and grounded in both the data
            and the research aims. Specifically, this involves:
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-2">
            <li>
              <span className="font-semibold">
                Familiarize Yourself with the Data
              </span>
              <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                <li>
                  Read and re-read both the original data chunks and the
                  LLM-generated codes.
                </li>
                <li>
                  Pay attention to recurring concepts, surprising details, or
                  emotionally charged expressions.
                </li>
                <li>
                  Jot down early impressions, insights, or questions directly in
                  your memos. These notes help capture your evolving
                  interpretation of the data.
                </li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">
                Review and Adjust Initial Codes
              </span>
              <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                <li>
                  Compare the LLM's suggested codes with your own understanding
                  of the data.
                </li>
                <li>
                  If a code feels too broad, vague, or misleading, revise its
                  name or definition to better capture the nuance.
                </li>
                <li>
                  You can also merge or split codes by re-assigning clusters, or
                  use the system to regenerate codes with a different style
                  prompt (e.g., more theory-driven or more descriptive).
                </li>
                <li>
                  For each adjustment, record a short memo explaining your
                  reasoning (e.g., "Code X was too generic; renamed to highlight
                  participants' focus on emotional impact"). These memos will
                  later be included in the final report for transparency.
                </li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">
                Focus on Your Research Questions
              </span>
              <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                <li>
                  Remember that coding is not just about labeling text—it is
                  about systematically reducing the data in ways that remain
                  meaningful for your specific research questions.
                </li>
                <li>
                  As you refine the LLM's output, ensure that the codes are
                  relevant, interpretable, and sufficiently detailed to serve as
                  a foundation for later theme development.
                </li>
              </ul>
            </li>
          </ol>
        </div>
        <div className="gap-4 flex flex-col">
          <PromptHistorySection step="card" />
          <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
            <div className="absolute -top-3 left-4 bg-white px-2 text-lg ">
              <span className="font-semibold">
                How Many Initial "Open Codes" You Want to Create for Each File?
              </span>
            </div>
            <div className="px-6 py-8">
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
            <div className="bg-[#FFF4EF] text-sm text-gray-600 rounded-xl">
              <p className="p-4">
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
        <h1 className="text-lg font-bold pt-4">
          Human Interpretation & Testing
        </h1>
        <div className="text-sm mb-2">
          <p className="font-semibold mb-2">
            In this stage, the LLM provides an initial map of sub-themes, while
            you should bring judgment, contextual understanding, and
            methodological rigor to confirm, adjust, or expand the map. Your
            engagement ensures that the sub-themes stay trustworthy, relevant,
            and analytically useful. Specifically, this involves:
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-2">
            <li>
              <span className="font-semibold">Examine and Connect Codes</span>
              <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                <li>Review each sub-theme and the codes grouped within it.</li>
                <li>
                  Ask: Do these codes really belong together? Do they reflect a
                  coherent pattern that is significant to my research question?
                </li>
                <li>
                  Merge, split, or reassign codes if the grouping feels forced,
                  too broad, or too fragmented.
                </li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">Refine Sub-Theme Boundaries</span>
              <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                <li>
                  Consider whether a sub-theme is internally consistent and
                  externally distinct from others.
                </li>
                <li>
                  Some codes may naturally overlap across more than one
                  sub-theme; document these overlaps rather than forcing a
                  single fit.
                </li>
                <li>
                  If certain codes do not align with any sub-theme, temporarily
                  place them in a miscellaneous category for further review
                  later.
                </li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">
                Iterative Adjustment with the System
              </span>
              <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                <li>
                  Use the system's functionality to regenerate sub-themes by
                  adjusting prompts (e.g., ask for more theory-driven groupings
                  or more descriptive groupings).
                </li>
                <li>
                  Edit sub-theme names and definitions directly when the LLM's
                  wording does not align with your interpretation.
                </li>
                <li>
                  For each revision, write a memo explaining your reasoning
                  (e.g., "Codes merged under Sub-theme A because they all
                  describe the emotional dimension of feedback"). These memos
                  ensure transparency and will be reflected in the final report.
                </li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">
                Maintain Research Question Focus
              </span>
              <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                <li>
                  Ensure that each sub-theme not only describes patterns in the
                  data but also connects back to your guiding research
                  question(s).
                </li>
                <li>
                  At this stage, themes may still be descriptive rather than
                  fully interpretive, but they should already highlight
                  meaningful trends that prepare for the next stage of defining
                  and naming themes.
                </li>
              </ul>
            </li>
          </ol>
        </div>
        <div className="gap-4 flex flex-col">
          <PromptHistorySection step="code" />
        </div>
      </div>

      {/* Concept step content */}
      <div className={currentStoreType === "concept" ? "block" : "hidden"}>
        <LLMTaskSection {...conceptLLMInfo} />
        <h1 className="text-lg font-bold pt-4">
          Human Interpretation & Testing
        </h1>
        <div className="text-sm text-gray-500">
          <p className="mb-2">
            This stage transforms the analysis from a preliminary structure into
            a coherent thematic framework. The LLM offers a draft map of themes,
            and you should provide the critical review, interpretive judgment,
            and theoretical alignment necessary to produce a trustworthy and
            meaningful set of final themes. Specifically, this involves:
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Review Each Theme Against the Data</strong>
              <ul className="list-disc list-inside ml-4">
                <li>
                  Carefully read through the original chunks, codes, and
                  sub-themes grouped under each theme.
                </li>
                <li>
                  Ask: Does the data really support this theme? Do the included
                  elements fit together coherently?
                </li>
                <li>
                  Eliminate weak themes with insufficient supporting data, merge
                  overlapping ones, and identify potential sub-themes where
                  finer distinctions are meaningful.
                </li>
              </ul>
            </li>
            <li>
              <strong>Refine Theme Boundaries and Relationships</strong>
              <ul className="list-disc list-inside ml-4">
                <li>
                  Ensure that each theme is internally coherent and externally
                  distinct from others.
                </li>
                <li>
                  Consider whether some themes work better as sub-themes nested
                  within a broader one.
                </li>
                <li>
                  Reflect on how themes relate to each other across the entire
                  dataset: Are they complementary, contrasting, or hierarchical?
                </li>
              </ul>
            </li>
            <li>
              <strong>Define and Name Themes Clearly</strong>
              <ul className="list-disc list-inside ml-4">
                <li>
                  Assign concise, descriptive names (4–8 words) that capture the
                  essence of each theme.
                </li>
                <li>
                  Write a short definition for each, making explicit what the
                  theme includes and excludes.
                </li>
                <li>
                  If necessary, regenerate theme suggestions in the system using
                  a different style prompt (e.g., more interpretive, more
                  descriptive).
                </li>
              </ul>
            </li>
            <li>
              <strong>Document Human Interpretation with Memos</strong>
              <ul className="list-disc list-inside ml-4">
                <li>
                  Record your reasoning for any modifications, merges, splits,
                  or renaming of themes (e.g., "Merged Theme A and Theme B into
                  'Use of Feedback' because both addressed how students engaged
                  with feedback practices").
                </li>
                <li>
                  These memos provide transparency and will appear in the final
                  report, ensuring that the analytical decisions are traceable.
                </li>
              </ul>
            </li>
            <li>
              <strong>Check Alignment with Research Questions</strong>
              <ul className="list-disc list-inside ml-4">
                <li>
                  Finally, ensure that the refined themes not only make sense
                  internally but also contribute to answering your research
                  questions.
                </li>
                <li>
                  Consider prevalence (how often a theme occurs) and
                  significance (why it matters), and reflect on whether the
                  final themes capture the key stories in the data.
                </li>
              </ul>
            </li>
          </ol>
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
          <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
            <div className="absolute -top-3 left-4 bg-white px-2 text-lg">
              <span className="font-semibold">Prompt to LLM</span>
            </div>
            <textarea
              ref={clusteringTextAreaRef}
              defaultValue={clusteringStyle || ""}
              onChange={handleClusterChange}
              className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin px-6 text-sm"
              style={{ minHeight: "60px", maxHeight: "300px" }}
            />
            <div className="mt-2 px-4">
              <p className="mb-2 text-sm font-semibold">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-2 py-1 border border-black rounded-lg hover:bg-gray-100 text-sm text-left"
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
                  className="px-2 py-1 border border-black rounded-lg hover:bg-gray-100 text-sm text-left"
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
            <div className="bg-[#FFF4EF] text-sm text-gray-600 rounded-xl mt-2">
              <p className="p-4">
                Tell us how you want to cluster your topics. This will guide the
                initial open coding of your data.
              </p>
            </div>
          </div>

          <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
            <div className="absolute -top-3 left-4 bg-white px-2 text-lg">
              <span className="font-semibold">Writing Memo</span>
            </div>
            <textarea
              ref={topicMemoTextAreaRef}
              defaultValue={topicMemo || ""}
              onChange={handleTopicMemoChange}
              placeholder="Write your thoughts, observations, or notes about the open coding process..."
              className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin px-6 text-sm"
              style={{ minHeight: "80px", maxHeight: "300px" }}
            />
            <div className="bg-[#FFF4EF] text-sm text-gray-600 rounded-xl mt-2">
              <p className="p-4">Write why you perform such interpretation.</p>
            </div>
          </div>
        </div>

        {/* Coding input - only show in code step */}
        <div className={currentStoreType === "code" ? "block" : "hidden"}>
          <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
            <div className="absolute -top-3 left-4 bg-white px-2 text-lg ">
              <span className="font-semibold">Prompt to LLM</span>
            </div>
            <div className="px-6 py-8">
              <textarea
                ref={codingTextAreaRef}
                defaultValue={codingStyle || ""}
                onChange={handleCodeChange}
                className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-sm"
                style={{ minHeight: "60px", maxHeight: "300px" }}
              />
            </div>
            <div className="mt-2 px-4">
              <p className="mb-2 text-sm font-semibold">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-2 py-1 border border-black rounded-lg hover:bg-gray-100 text-sm text-left"
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
                  className="px-2 py-1 border border-black rounded-lg hover:bg-gray-100 text-sm text-left"
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
            <div className="bg-[#FFF4EF] text-sm text-gray-600 rounded-xl">
              <p className="p-4">
                "Sub-themes" represent different "groups of open codes" sharing
                similar higher level topics. Tell us how you want to label
                sub-themes. This will influence how your open codes are
                categorized and assigned sub-theme names.
              </p>
            </div>
          </div>

          <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
            <div className="absolute -top-3 left-4 bg-white px-2 text-lg">
              <span className="font-semibold">Writing Memo</span>
            </div>
            <div className="px-6 py-8">
              <textarea
                ref={codeMemoTextAreaRef}
                defaultValue={codeMemo || ""}
                onChange={handleCodeMemoChange}
                placeholder="Write your thoughts, observations, or notes about the sub-theme labeling process..."
                className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-sm"
                style={{ minHeight: "80px", maxHeight: "300px" }}
              />
            </div>
            <div className="bg-[#FFF4EF] text-sm text-gray-600 rounded-xl">
              <p className="p-4">Write why you perform such interpretation.</p>
            </div>
          </div>
        </div>

        {/* Concept input - only show in concept step */}
        <div className={currentStoreType === "concept" ? "block" : "hidden"}>
          <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
            <div className="absolute -top-3 left-4 bg-white px-2 text-lg ">
              <span className="font-semibold">Prompt to LLM</span>
            </div>
            <div className="px-6 py-8">
              <textarea
                ref={conceptualizingTextAreaRef}
                defaultValue={conceptualizingStyle || ""}
                onChange={handleConceptChange}
                className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-sm"
                style={{ minHeight: "60px", maxHeight: "300px" }}
              />
            </div>
            <div className="mt-2 px-4">
              <p className="mb-2 text-sm font-semibold">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-2 py-1 border border-black rounded-lg hover:bg-gray-100 text-sm text-left"
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
                  className="px-2 py-1 border border-black rounded-lg hover:bg-gray-100 text-sm text-left"
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
            <div className="bg-[#FFF4EF] text-sm text-gray-600 rounded-xl">
              <p className="p-4">
                "Themes" represent high-level categories of sub-themes, sharing
                similar higher level topics. Tell us how you want to
                conceptualize your findings. This will shape the final
                interpretation of your data.
              </p>
            </div>
          </div>

          <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
            <div className="absolute -top-3 left-4 bg-white px-2 text-lg">
              <span className="font-semibold">Writing Memo</span>
            </div>
            <div className="px-6 py-8">
              <textarea
                ref={conceptMemoTextAreaRef}
                defaultValue={conceptMemo || ""}
                onChange={handleConceptMemoChange}
                placeholder="Write your thoughts, observations, or notes about the theme process..."
                className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin text-sm"
                style={{ minHeight: "80px", maxHeight: "300px" }}
              />
            </div>
            <div className="bg-[#FFF4EF] text-sm text-gray-600 rounded-xl">
              <p className="p-4">Write why you perform such interpretation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

StyleInputs.displayName = "StyleInputs";

// 简化StyleInputsWithRef，直接使用StyleInputs
export const StyleInputsWithRef = StyleInputs;

StyleInputsWithRef.displayName = "StyleInputsWithRef";

export default StyleInputs;
