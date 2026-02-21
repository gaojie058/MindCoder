import React, {
  HTMLAttributes,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Outlet } from "react-router-dom";
import Bottom from "@/components/ui/Bottom";
import frameLogo from "@/assets/frameLogo.png";
import toplogoright from "@/assets/toplogoright.png";
import TopLayout from "./TopLayout";
import { useGenerate, useGenerateStore } from "@/api/useGenerate";
import { useNavigate } from "react-router-dom";
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
import useInfoStore from "@/stores/useInfoStore";
import useGenerationStore from "@/stores/useGenerationStore";
import useVersionStore from "@/stores/useVersionStore";
import VersionPanel from "./VersionPanel";
import { CardAreaProvider, EditorPanel, CodesPanel, useCardAreaContext } from "@/pages/reconstruction/CardArea";
import HumanActBar from "./HumanActBar";

import InfoTooltip from "@/components/ui/InfoTooltip";

// Area label header
function AreaLabel({ icon, title, tooltip, titleColor = "text-gray-600", tooltipVariant = "gray", className = "" }: { icon: string; title: string; tooltip: string; titleColor?: string; tooltipVariant?: "gray" | "amber"; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 ${className}`}>
      <span className="text-sm">{icon}</span>
      <span className={`text-xs font-semibold ${titleColor}`}>{title}</span>
      <InfoTooltip text={tooltip} variant={tooltipVariant} />
    </div>
  );
}

// Collapsible Left Panel — AI Agent only
function LeftPanel({ styleInputsRef, stepName }: { styleInputsRef: React.RefObject<{ saveChangesToStore: () => void } | null>; stepName: string }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`relative flex flex-col h-full shrink-0 transition-all duration-300 ${collapsed ? 'w-10' : 'w-[280px]'}`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-3 z-10 w-6 h-6 bg-[#CB9180] text-white rounded-full flex items-center justify-center text-xs hover:bg-[#AA7667] shadow-md cursor-pointer"
        title={collapsed ? "Expand panel" : "Collapse panel"}
      >
        {collapsed ? '›' : '‹'}
      </button>
      {!collapsed && (
        <div className="flex flex-col h-full rounded-xl border border-indigo-200/60 shadow-lg overflow-hidden bg-white">
          <AreaLabel
            icon="🤖"
            title="AI Agent"
            tooltip="AI analysis results and suggestions for the current step"
            titleColor="text-indigo-600"
            className="border-b border-indigo-100 bg-indigo-50/50"
          />
          <div
            className="w-full overflow-y-auto scrollbar-thin flex-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#d1d5db #f9fafb" }}
          >
            <div className="p-3 pb-2">
              <StyleInputs
                ref={styleInputsRef}
                storeType={stepName}
                className="text-[3vw] sm:text-[2vw] md:text-[1.5vw] lg:text-[1vw]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inner layout for Step 1 — needs CardAreaContext access
function CardAreaInnerLayout({ styleInputsRef }: { styleInputsRef: React.RefObject<{ saveChangesToStore: () => void } | null> }) {
  const { codesExpanded } = useCardAreaContext();
  return (
    <div className="w-full flex justify-center flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-row items-start gap-3 h-full w-full max-w-[1400px] px-8 pt-3 pb-4">
        {/* Left — AI Agent Panel (280px) */}
        <LeftPanel styleInputsRef={styleInputsRef} stepName="card" />

        {/* Center — Document Editor (flex-1), hidden when codes expanded */}
        {!codesExpanded && (
          <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
            <div className="flex flex-col h-full rounded-xl border border-[#CB9180]/20 shadow-lg overflow-hidden bg-white">
              <AreaLabel
                icon="📊"
                title="Data Editor"
                tooltip="View, edit, and organize your coding data"
                titleColor="text-[#CB9180]"
                className="border-b border-[#CB9180]/20 bg-[#CB9180]/5"
              />
              <div className="flex-1 w-full overflow-hidden">
                <EditorPanel />
              </div>
            </div>
          </div>
        )}

        {/* Right — Codes Panel (320px normal, flex-1 when expanded) */}
        <div className={`${codesExpanded ? "flex-1" : "w-[320px]"} shrink-0 flex flex-col h-full rounded-xl border border-[#CB9180]/20 shadow-lg overflow-hidden bg-white`}>
          <AreaLabel
            icon="🏷️"
            title="Codes"
            tooltip="Open codes for the current file"
            titleColor="text-[#CB9180]"
            className="border-b border-[#CB9180]/20 bg-[#CB9180]/5"
          />
          <div className="flex-1 overflow-hidden">
            <CodesPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const autoRunTriggered = useRef(false);

  // Auto-run generation when coming directly from HomePage
  // Step 1 (card) runs via regenerateStep → shows Regenerate button spinning
  // Then code+concept run via runRemaining → shows "Generate Sub-themes & Themes" button spinning
  useEffect(() => {
    const { autoRun, setAutoRun } = useInfoStore.getState();
    if (autoRun && !autoRunTriggered.current && stepName === "card") {
      autoRunTriggered.current = true;
      setAutoRun(false);
      const gen = useGenerationStore.getState();
      gen.regenerateStep("card").then(() => {
        useGenerationStore.getState().runRemaining();
      });
    }
  }, [stepName]);

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

  const bgRunning = useGenerationStore((s) => s.bgRunning);
  const regenRunning = useGenerationStore((s) => s.regenRunning);
  const globalIsRunning = bgRunning || regenRunning;

  const savePromptToHistory = () => {
    const { addLLMHistoryEntry } = useLLMHistoryStore.getState();
    const { clusteringStyle, codingStyle, conceptualizingStyle } = useAppStore.getState();
    if (stepName === "card" && clusteringStyle?.trim()) {
      addLLMHistoryEntry("card", clusteringStyle.trim(), "Custom Prompt");
    } else if (stepName === "code" && codingStyle?.trim()) {
      addLLMHistoryEntry("code", codingStyle.trim(), "Custom Prompt");
    } else if (stepName === "concept" && conceptualizingStyle?.trim()) {
      addLLMHistoryEntry("concept", conceptualizingStyle.trim(), "Custom Prompt");
    }
  };

  const handleRegenerate = () => {
    if (!loading && !globalIsRunning) {
      saveChangesToStore();
      savePromptToHistory();
      useGenerationStore.getState().regenerateStep(stepName);
    }
  };

  const handleRegenerateRest = () => {
    if (!loading && !globalIsRunning) {
      saveChangesToStore();
      savePromptToHistory();
      useGenerationStore.getState().regenerateSubsequent(stepName);
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

      {/* Step 1 (card): 3-column layout with EditorPanel + CodesPanel */}
      {stepToName[step] === "card" && (
        <CardAreaProvider>
          <CardAreaInnerLayout styleInputsRef={styleInputsRef} />
        </CardAreaProvider>
      )}

      {/* Steps 2-3 (code/concept): Left panel + center content (Outlet) */}
      {(stepToName[step] === "code" || stepToName[step] === "concept") && (
        <div className="w-full flex justify-center flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-row items-start gap-3 h-full w-full max-w-[1400px] px-8 pt-3 pb-4">
            {/* Left — AI Agent Panel (280px) */}
            <LeftPanel
              styleInputsRef={styleInputsRef}
              stepName={stepToName[step]}
            />

            {/* Center — Step content (flex-1) */}
            <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
              <div className="flex flex-col h-full rounded-xl border border-[#CB9180]/20 shadow-lg overflow-hidden bg-white">
                <div className="flex-1 w-full overflow-hidden">
                  {children || <Outlet />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stepToName[step] === "data" ? (
        <div
          className={`flex-col w-full flex-1 mx-auto md:w-11/12 lg:w-5/6 my-3 2xl:my-5 xl:w-4/5 2xl:w-[65%] flex items-center justify-stretch shadow-lg rounded-xl overflow-hidden ${className}`}
          {...props}
        >
          {children || <Outlet />}
        </div>
      ) : stepToName[step] === "display" ? (
        <div className="w-full flex justify-center flex-1 min-h-0 overflow-hidden">
          <div className="w-full max-w-[1400px] mx-auto px-8 pt-3 pb-4 h-full flex flex-col">
            <div
              className={`flex-col w-full flex-1 flex items-center justify-stretch shadow-lg rounded-xl border border-[#CB9180]/20 overflow-hidden bg-white ${className}`}
              {...props}
            >
              {children || <Outlet />}
            </div>
          </div>
        </div>
      ) : null}

      {/* Bottom buttons for data and display pages */}
      {stepToName[step] === "data" && (
        <div className="w-full mx-auto flex justify-between items-center p-6 border-t border-gray-300 md:w-11/12 lg:w-5/6 xl:w-4/5 2xl:w-[65%]">
          {isCustomizePage ? (
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
          )}
        </div>
      )}
      {/* Bottom action bar for analysis steps (human controls) */}
      {["card", "code", "concept"].includes(stepToName[step]) && (
        <div className="w-full max-w-[1400px] mx-auto px-8 shrink-0">
          <HumanActBar
            stepName={stepToName[step]}
            onRegenerate={handleRegenerate}
            onRegenerateSubsequent={handleRegenerateRest}
            loading={loading || regenRunning}
            disabled={bgRunning}
          />
        </div>
      )}
      <VersionPanel />
      {/* FloatingMemo removed — memo is now in left panel TOOLS */}
      <HistoryModal />
      <LLMHistoryModal />
    </div>
  );
}
