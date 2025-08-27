import React, {
  HTMLAttributes,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Outlet } from "react-router-dom";
import Loading from "@/components/ui/Loading";
import Bottom from "@/components/ui/Bottom";
import frameLogo from "@/assets/frameLogo.png";
import toplogoright from "@/assets/toplogoright.png";
import TopLayout from "./TopLayout";
import { useGenerate, useGenerateStore } from "@/api/useGenerate";
import { useNavigate, useParams } from "react-router-dom";
import HistoryModal from "@/layout/HistoryModal";
import LLMHistoryModal from "@/layout/LLMHistoryModal";
import useCardStore from "@/stores/useCardStore";
import useCodeStore from "@/stores/useCodeStore";
import useConceptStore from "@/stores/useConceptStore";
import useDisplayStore from "@/stores/useDisplayStore";
import useAppStore from "@/stores/useAppStore";
import useLLMHistoryStore from "@/stores/useLLMHistoryStore";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Slider from "@mui/material/Slider";

type MainLayoutProps = {
  children?: React.ReactNode;
  className?: string;
  props?: HTMLAttributes<HTMLDivElement>;
  storeType?: string;
};

const stepToName: Record<string, string> = {
  "0": "data",
  "1": "card",
  "2": "code",
  "3": "concept",
  "4": "display",
};

export default function MainLayout({
  children,
  className,
  props,
}: MainLayoutProps) {
  const {
    handleGenerate,
    loading,
    progress,
    step,
    handleRegenerateSubsequent,
    handleGeneratePDF,
    pdfLoading,
  } = useGenerate();
  const stepName = stepToName[step] || "data";
  const navigate = useNavigate();
  const [hasNoData, setHasNoData] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const location = window.location.hash;
  const isCustomizePage = location.includes("customize");

  // LLM History functionality
  const {
    llmHistory = [],
  } = useLLMHistoryStore();

  // Get the active graph type from the display store
  const { activeGraphType = "mindmap" } = useDisplayStore((state) => ({
    activeGraphType: state.activeGraphType || "mindmap",
  }));

  const {
    clusteringStyle,
    setClusteringStyle,
    codingStyle,
    setCodingStyle,
    conceptualizingStyle,
    setConceptualizingStyle,
    numberOfTopicClusters,
    setNumberOfTopicClusters,
    topicMemo,
    setTopicMemo,
    codeMemo,
    setCodeMemo,
    conceptMemo,
    setConceptMemo,
  } = useAppStore();

  // Get LLM task information from respective stores
  const {
    whatLLMDid: cardWhatLLMDid,
    rationale: cardRationale,
    llmDescription: cardLlmDescription,
  } = useCardStore();
  const {
    whatLLMDid: codeWhatLLMDid,
    rationale: codeRationale,
    llmDescription: codeLlmDescription,
  } = useCodeStore();
  const {
    whatLLMDid: conceptWhatLLMDid,
    rationale: conceptRationale,
    llmDescription: conceptLlmDescription,
  } = useConceptStore();

  const [localTopicClusterRange, setLocalTopicClusterRange] = useState<
    [number, number]
  >(
    Array.isArray(numberOfTopicClusters)
      ? (numberOfTopicClusters as [number, number])
      : [15, 20]
  );

  // Refs to store current textarea values without re-rendering
  const clusteringValueRef = useRef(clusteringStyle || "");
  const codingValueRef = useRef(codingStyle || "");
  const conceptualizingValueRef = useRef(conceptualizingStyle || "");

  // Memo refs
  const topicMemoRef = useRef(topicMemo || "");
  const codeMemoRef = useRef(codeMemo || "");
  const conceptMemoRef = useRef(conceptMemo || "");

  // Initialize refs once from store values
  useEffect(() => {
    clusteringValueRef.current = clusteringStyle || "";
    codingValueRef.current = codingStyle || "";
    conceptualizingValueRef.current = conceptualizingStyle || "";
    topicMemoRef.current = topicMemo || "";
    codeMemoRef.current = codeMemo || "";
    conceptMemoRef.current = conceptMemo || "";

    // Also update the actual textarea elements if they exist
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
  }, [
    clusteringStyle,
    codingStyle,
    conceptualizingStyle,
    topicMemo,
    codeMemo,
    conceptMemo,
  ]);

  // Sync local topic cluster range with store value - only when store value changes
  useEffect(() => {
    if (Array.isArray(numberOfTopicClusters)) {
      setLocalTopicClusterRange(numberOfTopicClusters as [number, number]);
    }
  }, [numberOfTopicClusters]);

  // Refs for textarea elements
  const clusteringTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const codingTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const conceptualizingTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // Memo textarea refs
  const topicMemoTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const codeMemoTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const conceptMemoTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // Function to save changes to store - only called explicitly, not during typing
  const saveChangesToStore = useCallback(() => {
    // Only update if values have actually changed to prevent unnecessary re-renders
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

    // Also save to localStorage
    useAppStore.getState().saveChangesToStore();
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

  // Save when leaving the page
  useEffect(() => {
    return () => {
      saveChangesToStore();
    };
  }, [saveChangesToStore]);

  // Listen for save event before navigation
  useEffect(() => {
    const handleSaveBeforeNavigation = () => {
      saveChangesToStore();
    };

    document.addEventListener(
      "save-customizations-before-navigation",
      handleSaveBeforeNavigation
    );

    return () => {
      document.removeEventListener(
        "save-customizations-before-navigation",
        handleSaveBeforeNavigation
      );
    };
  }, [saveChangesToStore]);

  const handleClusterChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    clusteringValueRef.current = e.target.value;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    codingValueRef.current = e.target.value;
  };

  const handleConceptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    conceptualizingValueRef.current = e.target.value;
  };

  const handleTopicMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    topicMemoRef.current = e.target.value;
  };

  const handleCodeMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    codeMemoRef.current = e.target.value;
  };

  const handleConceptMemoChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    conceptMemoRef.current = e.target.value;
  };

  // Debounced handler for topic cluster range changes to prevent flashing
  const handleTopicClusterRangeChange = useCallback(
    (e: Event, newValue: number | number[]) => {
      setLocalTopicClusterRange(newValue as [number, number]);
    },
    []
  );

  const handleSuggestionClick = (
    suggestion: string,
    type: "clustering" | "coding" | "conceptualizing"
  ) => {
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
  };

  const handleRegenerate = () => {
    if (!loading) {
      saveChangesToStore(); // Save all changes to store before generation

      // Only save user prompt if there's actual user input
      const { addLLMHistoryEntry } = useLLMHistoryStore.getState();

      if (stepName === "card" && clusteringTextAreaRef.current?.value?.trim()) {
        addLLMHistoryEntry(
          "card",
          clusteringTextAreaRef.current.value.trim(),
          "Custom Prompt"
        );
      } else if (
        stepName === "code" &&
        codingTextAreaRef.current?.value?.trim()
      ) {
        addLLMHistoryEntry(
          "code",
          codingTextAreaRef.current.value.trim(),
          "Custom Prompt"
        );
      } else if (
        stepName === "concept" &&
        conceptualizingTextAreaRef.current?.value?.trim()
      ) {
        addLLMHistoryEntry(
          "concept",
          conceptualizingTextAreaRef.current.value.trim(),
          "Custom Prompt"
        );
      }

      handleGenerate(stepName);
    }
  };

  const handleRegenerateRest = () => {
    if (!loading) {
      saveChangesToStore(); // Save all changes to store before generation

      // Only save user prompt if there's actual user input
      const { addLLMHistoryEntry } = useLLMHistoryStore.getState();

      if (stepName === "card" && clusteringTextAreaRef.current?.value?.trim()) {
        addLLMHistoryEntry(
          "card",
          clusteringTextAreaRef.current.value.trim(),
          "Custom Prompt"
        );
      } else if (
        stepName === "code" &&
        codingTextAreaRef.current?.value?.trim()
      ) {
        addLLMHistoryEntry(
          "code",
          codingTextAreaRef.current.value.trim(),
          "Custom Prompt"
        );
      } else if (
        stepName === "concept" &&
        conceptualizingTextAreaRef.current?.value?.trim()
      ) {
        addLLMHistoryEntry(
          "concept",
          conceptualizingTextAreaRef.current.value.trim(),
          "Custom Prompt"
        );
      }

      handleRegenerateSubsequent(stepName);
    }
  };

  // Save when leaving customize page
  const handleSaveCustomization = () => {
    saveChangesToStore();

    const inputAreaElement = document.getElementById("input-area");
    if (inputAreaElement) {
      const saveEvent = new CustomEvent("save-input-area", {
        detail: { shouldSave: true },
      });
      inputAreaElement.dispatchEvent(saveEvent);
    }

    useAppStore.getState().setCodingButtonStatus(true);
    navigate(-1);
  };

  // Function to handle saving current state to history
  const handleSaveToHistory = async () => {
    try {
      // Save current customizations to store before generating PDF
      saveChangesToStore();

      // Use the current active graph type when saving
      const success = await handleGeneratePDF(activeGraphType);
      if (success) {
        setShowSuccessAlert(true);
        setTimeout(() => {
          setShowSuccessAlert(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

  // const Introtext = ({
  //   storeType,
  //   className,
  // }: {
  //   storeType: string;
  //   className?: string;
  // }) => {
  //   switch (storeType) {
  //     case "data":
  //       return <div className={className}></div>;
  //     case "card":
  //       return (
  //         <div className={`${className}`}>
  //           <p className={`text-left p-4`}>
  //             "Cluster" means topic clusters generated by GPT from semantic
  //             level. Under each cluster, there are a few text chunks that share
  //             similar topics.
  //           </p>
  //         </div>
  //       );
  //     case "code":
  //       return (
  //         <div className={`${className}`}>
  //           <p className={`text-left p-4`}>
  //             "Codes" represent different "groups of topic clusters" sharing
  //             similar higher level topics.
  //           </p>
  //         </div>
  //       );
  //     case "concept":
  //       return (
  //         <div className={`${className}`}>
  //           <p className={`text-left p-4`}>
  //             "Concepts" represent high-level categories of codes, sharing
  //             similar higher level topics.
  //           </p>
  //         </div>
  //       );
  //     case "display":
  //       return <div className={className}></div>;
  //     default:
  //       return null;
  //   }
  // };

  // Function to get LLM history for a specific step
  const getLLMHistoryForStep = (step: string) => {
    return (llmHistory || []).filter((entry) => entry.step === step);
  };

  // Function to format timestamp
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

  const StyleInputs = ({
    storeType,
    className,
  }: {
    storeType: string;
    className?: string;
  }) => {
    switch (storeType) {
      case "card":
        return (
          <div className={`flex flex-col w-full ${className}`}>
            {/* MindCoder Mechanical Task Section */}
            {(cardWhatLLMDid || cardRationale || cardLlmDescription) && (
              <>
                <h1 className="text-lg font-bold">MindCoder Mechanical Task</h1>
                {cardLlmDescription && (
                  <div>
                    <div className="text-sm whitespace-pre-line leading-4 font-zen font-semibold">
                      {cardLlmDescription}
                    </div>
                  </div>
                )}
                <div className="w-full flex flex-col border rounded-xl border-black relative pt-2">
                  <div className="px-6 py-2">
                    {cardWhatLLMDid && (
                      <div className="mb-3">
                        <p className="font-semibold text-sm mb-2">
                          What LLM Did:
                        </p>
                        <div className="text-sm whitespace-pre-line leading-5">
                          {cardWhatLLMDid}
                        </div>
                      </div>
                    )}
                    {cardRationale && (
                      <div className="mb-3">
                        <p className="font-semibold text-sm mb-2">
                          LLM Self Criticize:
                        </p>
                        <div className="text-sm whitespace-pre-line leading-5">
                          {cardRationale}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <h1 className="text-lg font-bold pt-4">
              Human Interpretation & Testing
            </h1>
            <div className="text-sm mb-2">
              <p className="font-semibold mb-2">In this stage, the LLM offers an exploratory coding draft, while you should bring critical interpretation, contextual knowledge, and methodological rigor. Your revisions, notes, and reflections ensure that the analysis stays trustworthy and grounded in both the data and the research aims. Specifically, this involves:</p>
              <ol className="list-decimal list-outside pl-5 space-y-2">
                <li>
                  <span className="font-semibold">Familiarize Yourself with the Data</span>
                  <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                    <li>Read and re-read both the original data chunks and the LLM-generated codes.</li>
                    <li>Pay attention to recurring concepts, surprising details, or emotionally charged expressions.</li>
                    <li>Jot down early impressions, insights, or questions directly in your memos. These notes help capture your evolving interpretation of the data.</li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold">Review and Adjust Initial Codes</span>
                  <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                    <li>Compare the LLM’s suggested codes with your own understanding of the data.</li>
                    <li>If a code feels too broad, vague, or misleading, revise its name or definition to better capture the nuance.</li>
                    <li>You can also merge or split codes by re-assigning clusters, or use the system to regenerate codes with a different style prompt (e.g., more theory-driven or more descriptive).</li>
                    <li>For each adjustment, record a short memo explaining your reasoning (e.g., “Code X was too generic; renamed to highlight participants’ focus on emotional impact”). These memos will later be included in the final report for transparency.</li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold">Focus on Your Research Questions</span>
                  <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                    <li>Remember that coding is not just about labeling text—it is about systematically reducing the data in ways that remain meaningful for your specific research questions.</li>
                    <li>As you refine the LLM’s output, ensure that the codes are relevant, interpretable, and sufficiently detailed to serve as a foundation for later theme development.</li>
                  </ul>
                </li>
              </ol>
            </div>
            <div className="gap-4 flex flex-col">
              {/* LLM Prompt History - First Section */}
              <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
                <div className="absolute -top-3 left-4 bg-white px-2 text-lg">
                  <span className="font-semibold">Prompt History</span>
                </div>
                <div className="px-6 py-4">
                  {getLLMHistoryForStep("card").length > 0 ? (
                    <div className="space-y-3">
                      {getLLMHistoryForStep("card").map((entry) => (
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

              <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
                <div className="absolute -top-3 left-4 bg-white px-2 text-lg ">
                  <span className="font-semibold">
                    How Many Initial "Open Codes" You Want to Create for Each
                    File?
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
                    "Open Codes" means codes generated by GPT from semantic
                    level. Under each open code, there are a few text chunks
                    that share similar topics, helping you group your
                    qualitative data that share common topics at the semantic
                    level. It forms a foundation for later sub-theme labeling
                    and high-level themes.
                  </p>
                </div>
              </div>

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
                      In-Vivo coding: Use the direct words and phrases of raw
                      data as open codes rather than researcher-generated words
                      and phrases
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
                      Descriptive coding: Assign basic labels to data to
                      describe the open codes
                    </button>
                  </div>
                </div>
                <div className="bg-[#FFF4EF] text-sm text-gray-600 rounded-xl mt-2">
                  <p className="p-4">
                    Tell us how you want to cluster your topics. This will guide
                    the initial open coding of your data.
                  </p>
                </div>
              </div>

              {/* Writing Memo for Open Codes */}
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
                  <p className="p-4">
                    Write why you perform such interpretation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "code":
        return (
          <div className={`flex flex-col w-full ${className}`}>
            {/* MindCoder Mechanical Task Section */}
            {(codeWhatLLMDid || codeRationale || codeLlmDescription) && (
              <>
                <h1 className="text-lg font-bold">MindCoder Mechanical Task</h1>
                {codeLlmDescription && (
                  <div>
                    <div className="text-sm whitespace-pre-line leading-4 font-zen font-semibold mb-4">
                      {codeLlmDescription}
                    </div>
                  </div>
                )}
                <div className="w-full flex flex-col border rounded-xl border-black relative">
                  <div className="px-6 py-2">
                    {codeWhatLLMDid && (
                      <div className="mb-3">
                        <p className="font-semibold text-sm mb-2">
                          What LLM Did:
                        </p>
                        <div className="text-sm whitespace-pre-line leading-5">
                          {codeWhatLLMDid}
                        </div>
                      </div>
                    )}
                    {codeRationale && (
                      <div className="mb-3">
                        <p className="font-semibold text-sm mb-2">
                          LLM Self Criticize:
                        </p>
                        <div className="text-sm whitespace-pre-line leading-5">
                          {codeRationale}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <h1 className="text-lg font-bold pt-4">
              Human Interpretation & Testing
            </h1>

            <div className="text-sm mb-2">
              <p className="font-semibold mb-2">
                In this stage, the LLM provides an initial map of sub-themes,
                while you should bring judgment, contextual understanding, and
                methodological rigor to confirm, adjust, or expand the map. Your
                engagement ensures that the sub-themes stay trustworthy,
                relevant, and analytically useful. Specifically, this involves:
              </p>
              <ol className="list-decimal list-outside pl-5 space-y-2">
                <li>
                  <span className="font-semibold">
                    Examine and Connect Codes
                  </span>
                  <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                    <li>
                      Review each sub-theme and the codes grouped within it.
                    </li>
                    <li>
                      Ask: Do these codes really belong together? Do they
                      reflect a coherent pattern that is significant to my
                      research question?
                    </li>
                    <li>
                      Merge, split, or reassign codes if the grouping feels
                      forced, too broad, or too fragmented.
                    </li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold">
                    Refine Sub-Theme Boundaries
                  </span>
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
                      If certain codes do not align with any sub-theme,
                      temporarily place them in a miscellaneous category for
                      further review later.
                    </li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold">
                    Iterative Adjustment with the System
                  </span>
                  <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                    <li>
                      Use the system’s functionality to regenerate sub-themes by
                      adjusting prompts (e.g., ask for more theory-driven
                      groupings or more descriptive groupings).
                    </li>
                    <li>
                      Edit sub-theme names and definitions directly when the
                      LLM’s wording does not align with your interpretation.
                    </li>
                    <li>
                      For each revision, write a memo explaining your reasoning
                      (e.g., “Codes merged under Sub-theme A because they all
                      describe the emotional dimension of feedback”). These
                      memos ensure transparency and will be reflected in the
                      final report.
                    </li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold">
                    Maintain Research Question Focus
                  </span>
                  <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                    <li>
                      Ensure that each sub-theme not only describes patterns in
                      the data but also connects back to your guiding research
                      question(s).
                    </li>
                    <li>
                      At this stage, themes may still be descriptive rather than
                      fully interpretive, but they should already highlight
                      meaningful trends that prepare for the next stage of
                      defining and naming themes.
                    </li>
                  </ul>
                </li>
              </ol>
            </div>
            <div className="gap-4 flex flex-col">
              {/* LLM Prompt History - First Section */}
              <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
                <div className="absolute -top-3 left-4 bg-white px-2 text-lg">
                  <span className="font-semibold">Prompt History</span>
                </div>
                <div className="px-6 py-4">
                  {getLLMHistoryForStep("code").length > 0 ? (
                    <div className="space-y-3">
                      {getLLMHistoryForStep("code").map((entry) => (
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
                      In-Vivo coding: Use the direct words and phrases of raw
                      data as sub-themes rather than researcher-generated words
                      and phrases
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
                      Descriptive coding: Assign basic labels to data to
                      describe the main sub-theme
                    </button>
                  </div>
                </div>
                <div className="bg-[#FFF4EF] text-sm text-gray-600 rounded-xl">
                  <p className="p-4">
                    "Sub-themes" represent different "groups of open codes"
                    sharing similar higher level topics. Tell us how you want to
                    label sub-themes. This will influence how your open codes
                    are categorized and assigned sub-theme names.
                  </p>
                </div>
              </div>

              {/* Writing Memo for Sub-Theme Labeling */}
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
                  <p className="p-4">
                    Write why you perform such interpretation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "concept":
        return (
          <div className={`flex flex-col w-full ${className}`}>
            {/* MindCoder Mechanical Task Section */}
            {(conceptWhatLLMDid ||
              conceptRationale ||
              conceptLlmDescription) && (
              <>
                <h1 className="text-lg font-bold">MindCoder Mechanical Task</h1>
                {conceptLlmDescription && (
                  <div>
                    <div className="text-sm whitespace-pre-line leading-4 font-zen font-semibold">
                      {conceptLlmDescription}
                    </div>
                  </div>
                )}
                <div className="w-full flex flex-col border rounded-xl border-black relative pt-2">
                  <div className="px-6 py-2">
                    {conceptWhatLLMDid && (
                      <div className="mb-3">
                        <p className="font-semibold text-sm mb-2">
                          What LLM Did:
                        </p>
                        <div className="text-sm whitespace-pre-line leading-5">
                          {conceptWhatLLMDid}
                        </div>
                      </div>
                    )}
                    {conceptRationale && (
                      <div className="mb-3">
                        <p className="font-semibold text-sm mb-2">
                          LLM Self Criticize:
                        </p>
                        <div className="text-sm whitespace-pre-line leading-5">
                          {conceptRationale}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <h1 className="text-lg font-bold pt-4">
              Human Interpretation & Testing
            </h1>
            <div className="text-sm text-gray-500">
              <p className="mb-2">
                This stage transforms the analysis from a preliminary structure
                into a coherent thematic framework. The LLM offers a draft map
                of themes, and you should provide the critical review,
                interpretive judgment, and theoretical alignment necessary to
                produce a trustworthy and meaningful set of final themes.
                Specifically, this involves:
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
                      Ask: Does the data really support this theme? Do the
                      included elements fit together coherently?
                    </li>
                    <li>
                      Eliminate weak themes with insufficient supporting data,
                      merge overlapping ones, and identify potential sub-themes
                      where finer distinctions are meaningful.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Refine Theme Boundaries and Relationships</strong>
                  <ul className="list-disc list-inside ml-4">
                    <li>
                      Ensure that each theme is internally coherent and
                      externally distinct from others.
                    </li>
                    <li>
                      Consider whether some themes work better as sub-themes
                      nested within a broader one.
                    </li>
                    <li>
                      Reflect on how themes relate to each other across the
                      entire dataset: Are they complementary, contrasting, or
                      hierarchical?
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Define and Name Themes Clearly</strong>
                  <ul className="list-disc list-inside ml-4">
                    <li>
                      Assign concise, descriptive names (4–8 words) that capture
                      the essence of each theme.
                    </li>
                    <li>
                      Write a short definition for each, making explicit what
                      the theme includes and excludes.
                    </li>
                    <li>
                      If necessary, regenerate theme suggestions in the system
                      using a different style prompt (e.g., more interpretive,
                      more descriptive).
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Document Human Interpretation with Memos</strong>
                  <ul className="list-disc list-inside ml-4">
                    <li>
                      Record your reasoning for any modifications, merges,
                      splits, or renaming of themes (e.g., "Merged Theme A and
                      Theme B into 'Use of Feedback' because both addressed how
                      students engaged with feedback practices").
                    </li>
                    <li>
                      These memos provide transparency and will appear in the
                      final report, ensuring that the analytical decisions are
                      traceable.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Check Alignment with Research Questions</strong>
                  <ul className="list-disc list-inside ml-4">
                    <li>
                      Finally, ensure that the refined themes not only make
                      sense internally but also contribute to answering your
                      research questions.
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
              {/* LLM Prompt History - First Section */}
              <div className="w-full flex flex-col mt-2 border rounded-xl border-black relative pt-6 mx-0">
                <div className="absolute -top-3 left-4 bg-white px-2 text-lg">
                  <span className="font-semibold">Prompt History</span>
                </div>
                <div className="px-6 py-4">
                  {getLLMHistoryForStep("concept").length > 0 ? (
                    <div className="space-y-3">
                      {getLLMHistoryForStep("concept").map((entry) => (
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
                      Theoretical conceptualization: Link findings to
                      established theories
                    </button>
                  </div>
                </div>
                <div className="bg-[#FFF4EF] text-sm text-gray-600 rounded-xl">
                  <p className="p-4">
                    "Themes" represent high-level categories of sub-themes,
                    sharing similar higher level topics. Tell us how you want to
                    conceptualize your findings. This will shape the final
                    interpretation of your data.
                  </p>
                </div>
              </div>

              {/* Writing Memo for Theme */}
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
                  <p className="p-4">
                    Write why you perform such interpretation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const showCustomAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 2000);
  };

  const handleDeleteAllData = () => {
    // Clear all data including uploaded files
    useAppStore.getState().clearAllData();
    useAppStore.getState().setNumberOfTopicClusters([15, 20]);

    // Additionally clear other stores
    useCardStore.getState().setCardData([]);
    useCodeStore.getState().setCodeData([]);
    useConceptStore.getState().setConceptData([]);
    useDisplayStore.getState().setReport({ title: "", sections: [] });
    useDisplayStore.getState().setGraph({ id: "graph", dot: "" });

    // Reset generation status
    useGenerateStore.getState().setHasFullGenerated(false);

    // Reset local state variables to match the reset store
    setLocalTopicClusterRange([15, 20]);

    // Trigger a reset in the InputArea component
    const inputAreaElement = document.getElementById("input-area");
    if (inputAreaElement) {
      const resetEvent = new CustomEvent("reset-input-area");
      inputAreaElement.dispatchEvent(resetEvent);
    }

    // Set flag to show alert if user tries to access reasoning or download
    setHasNoData(true);

    // Show confirmation to user
    showCustomAlert("Data Deleted", "All data has been deleted successfully.");
  };

  const handleResetCustomizations = () => {
    // Use resetStore which properly clears localStorage and sets default values
    useAppStore.getState().resetStore();

    // Force refresh local state variables to match the reset store
    setLocalTopicClusterRange([15, 20]);

    // Reset the textarea refs
    if (clusteringTextAreaRef.current) {
      clusteringTextAreaRef.current.value = "";
    }
    if (codingTextAreaRef.current) {
      codingTextAreaRef.current.value = "";
    }
    if (conceptualizingTextAreaRef.current) {
      conceptualizingTextAreaRef.current.value = "";
    }
    if (topicMemoTextAreaRef.current) {
      topicMemoTextAreaRef.current.value = "";
    }
    if (codeMemoTextAreaRef.current) {
      codeMemoTextAreaRef.current.value = "";
    }
    if (conceptMemoTextAreaRef.current) {
      conceptMemoTextAreaRef.current.value = "";
    }

    // Force a re-render by updating the refs
    clusteringValueRef.current = "";
    codingValueRef.current = "";
    conceptualizingValueRef.current = "";
    topicMemoRef.current = "";
    codeMemoRef.current = "";
    conceptMemoRef.current = "";

    // Show confirmation to user
    showCustomAlert(
      "Customizations Reset",
      "All customizations have been reset. Your uploaded documents are preserved."
    );
  };

  const handleCancel = () => {
    const inputAreaElement = document.getElementById("input-area");
    if (inputAreaElement) {
      // Dispatch event with shouldSave set to false
      const saveEvent = new CustomEvent("save-input-area", {
        detail: { shouldSave: false },
      });
      inputAreaElement.dispatchEvent(saveEvent);
    }
    navigate(-1);
  };

  return (
    <div
      className="w-full h-screen items-center flex flex-col overflow-hidden"
      id="main-layout"
    >
      {showAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-80">
          <Alert
            variant="default"
            className="bg-white border-[#CB9180] shadow-md"
          >
            <AlertTitle className="text-[#CB9180]">{alertTitle}</AlertTitle>
            <AlertDescription>{alertMessage}</AlertDescription>
          </Alert>
        </div>
      )}
      {showSuccessAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-80">
          <Alert className="bg-white border-[#CB9180] shadow-md">
            <AlertTitle className="text-[#CB9180]">Success</AlertTitle>
            <AlertDescription>Version successfully added!</AlertDescription>
          </Alert>
        </div>
      )}
      {stepName !== "data" && <TopLayout />}
      {stepName === "data" && (
        <div className="w-full flex justify-between items-center pt-2 px-10 pb-2 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]">
          <img src={frameLogo} alt="Frame Logo" className="w-[15%]" />
          <img src={toplogoright} alt="Top Right Logo" className="w-1/4" />
        </div>
      )}

      {stepToName[step] !== "data" && stepToName[step] !== "display" && (
        <div className="w-full flex flex-row items-start px-4 gap-6 h-[calc(100vh-60px)] overflow-hidden">
          {/* Left side - Style Inputs */}
          <div
            className="w-1/3 min-w-[350px] max-w-[700px] overflow-y-scroll scrollbar-thin h-full"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#4a5568 #edf2f7",
              maxHeight: "calc(100vh - 60px)",
            }}
          >
            <div className="p-4 pb-8">
              <StyleInputs
                storeType={stepToName[step] || "data"}
                className="text-[3vw] sm:text-[2vw] md:text-[1.5vw] lg:text-[1vw]"
              />
            </div>
          </div>

          {/* Right side - Content Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div
              className={`flex-col w-full h-full flex items-center justify-stretch border shadow-lg rounded-xl overflow-hidden ${className}`}
              {...props}
            >
              {children || <Outlet />}
            </div>

            {/* Bottom buttons for non-data/non-display pages */}
            <div className="w-full flex justify-between items-center p-6 border-t border-gray-300 flex-shrink-0">
              <div className="w-full flex justify-between gap-4">
                <button
                  onClick={handleSaveToHistory}
                  disabled={pdfLoading || showSuccessAlert}
                  className={`bg-[#CB9180] hover:bg-[#b8816f] text-white px-6 py-2 rounded-md text-sm font-semibold font-zen ${
                    (pdfLoading || showSuccessAlert) &&
                    "opacity-50 cursor-not-allowed"
                  }`}
                >
                  {pdfLoading ? "Adding..." : "Save Current Version"}
                </button>
                <Bottom
                  bottomType={stepName === "display" ? "display" : "regenerate"}
                  regenerate={handleRegenerate}
                  regenerateSubsequent={handleRegenerateRest}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {stepToName[step] === "data" || stepToName[step] === "display" ? (
        <div
          className={`flex-col w-full flex-1 mx-auto md:w-11/12 lg:w-5/6 my-3 2xl:my-5 xl:w-4/5 2xl:w-[65%] flex items-center justify-stretch shadow-lg rounded-xl overflow-hidden ${className}`}
          {...props}
        >
          {children || <Outlet />}
        </div>
      ) : null}

      {/* Bottom buttons for data and display pages */}
      {(stepToName[step] === "data" || stepToName[step] === "display") && (
        <div className="w-full flex justify-between items-center p-6 border-t border-gray-300">
          {stepName === "data" ? (
            isCustomizePage ? (
              // Show Save button when on customize page
              <div className="w-full flex justify-between">
                <div className="flex gap-4">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-400 text-white bg-[#C66B50] rounded-md hover:bg-[#AA7667] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCustomization}
                    className="px-4 py-2 bg-[#CB9180] text-white rounded-md hover:bg-[#AA7667] transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              // Show Delete and Reset buttons on main AllNeeds page
              <div className="w-full flex justify-between">
                <div className="flex gap-4">
                  <button
                    onClick={handleResetCustomizations}
                    className="px-4 py-2 bg-[#FFA500] text-white rounded-md hover:bg-[#FF8C00] transition-colors"
                  >
                    Reset Customizations
                  </button>
                  <button
                    onClick={handleDeleteAllData}
                    className="px-4 py-2 bg-[#f64141] text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Delete All My Data
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="w-full flex justify-between">
              <button
                onClick={handleSaveToHistory}
                disabled={pdfLoading || showSuccessAlert}
                className={`bg-[#CB9180] hover:bg-[#b8816f] text-white px-4 py-2 rounded-md font-zen font-semibold text-sm ${
                  (pdfLoading || showSuccessAlert) &&
                  "opacity-50 cursor-not-allowed"
                }`}
              >
                {pdfLoading ? "Adding..." : "Save Current Version"}
              </button>
              <Bottom
                bottomType={stepName === "display" ? "display" : "regenerate"}
                regenerate={handleRegenerate}
                regenerateSubsequent={handleRegenerateRest}
              />
            </div>
          )}
        </div>
      )}
      {loading && <Loading progress={progress} />}
      <HistoryModal />
      <LLMHistoryModal />
    </div>
  );
}
