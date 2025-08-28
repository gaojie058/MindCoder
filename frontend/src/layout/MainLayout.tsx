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
import useDisplayStore from "@/stores/useDisplayStore";
import useAppStore from "@/stores/useAppStore";
import useLLMHistoryStore from "@/stores/useLLMHistoryStore";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { StyleInputsWithRef as StyleInputs } from "./StyleInputs";
import useCardStore from "@/stores/useCardStore";
import useCodeStore from "@/stores/useCodeStore";
import useConceptStore from "@/stores/useConceptStore";
import useEditStore from "@/stores/useEditStore";

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

  // Get the active graph type from the display store
  const { activeGraphType = "mindmap" } = useDisplayStore((state) => ({
    activeGraphType: state.activeGraphType || "mindmap",
  }));

  // Ref for StyleInputs component to access its saveChangesToStore method
  const styleInputsRef = useRef<{ saveChangesToStore: () => void }>(null);

  // Function to save changes to store - delegated to StyleInputs component
  const saveChangesToStore = useCallback(() => {
    if (styleInputsRef.current) {
      styleInputsRef.current.saveChangesToStore();
    }
    // Also save to localStorage
    useAppStore.getState().saveChangesToStore();
  }, []);

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

  const handleRegenerate = () => {
    if (!loading) {
      saveChangesToStore(); // Save all changes to store before generation

      // Get current store values to save to history
      const { addLLMHistoryEntry } = useLLMHistoryStore.getState();
      const { clusteringStyle, codingStyle, conceptualizingStyle } =
        useAppStore.getState();

      if (stepName === "card" && clusteringStyle?.trim()) {
        addLLMHistoryEntry("card", clusteringStyle.trim(), "Custom Prompt");
      } else if (stepName === "code" && codingStyle?.trim()) {
        addLLMHistoryEntry("code", codingStyle.trim(), "Custom Prompt");
      } else if (stepName === "concept" && conceptualizingStyle?.trim()) {
        addLLMHistoryEntry(
          "concept",
          conceptualizingStyle.trim(),
          "Custom Prompt"
        );
      }

      handleGenerate(stepName);
    }
  };

  const handleRegenerateRest = () => {
    if (!loading) {
      saveChangesToStore(); // Save all changes to store before generation

      // Get current store values to save to history
      const { addLLMHistoryEntry } = useLLMHistoryStore.getState();
      const { clusteringStyle, codingStyle, conceptualizingStyle } =
        useAppStore.getState();

      if (stepName === "card" && clusteringStyle?.trim()) {
        addLLMHistoryEntry("card", clusteringStyle.trim(), "Custom Prompt");
      } else if (stepName === "code" && codingStyle?.trim()) {
        addLLMHistoryEntry("code", codingStyle.trim(), "Custom Prompt");
      } else if (stepName === "concept" && conceptualizingStyle?.trim()) {
        addLLMHistoryEntry(
          "concept",
          conceptualizingStyle.trim(),
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

    useCardStore.getState().setCardData([]);
    useCodeStore.getState().setCodeData([]);
    useConceptStore.getState().setConceptData([]);
    useDisplayStore.getState().setReport({ title: "", sections: [] });
    useDisplayStore.getState().setGraph({ id: "graph", dot: "" });

    // Reset generation status
    useGenerateStore.getState().setHasFullGenerated(false);

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

    // Reset current memo and prompt inputs, but keep LLM history
    useEditStore.getState().clearAllMemos();
    useEditStore.getState().clearAllPrompts();

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
                ref={styleInputsRef}
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
