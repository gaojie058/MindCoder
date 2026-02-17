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
import useInfoStore from "@/stores/useInfoStore";
import useGenerationStore from "@/stores/useGenerationStore";

// Persist memo open/position across route changes
const memoState = { open: false, x: 0, y: 0, initialized: false };

// Floating Research Memo
function FloatingMemo({ stepName }: { stepName: string }) {
  const [open, _setOpen] = useState(memoState.open);
  const setOpen = (v: boolean) => { memoState.open = v; _setOpen(v); };
  const [position, _setPosition] = useState({ x: memoState.x, y: memoState.y });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const {
    topicMemo, setTopicMemo,
    codeMemo, setCodeMemo,
    conceptMemo, setConceptMemo,
  } = useEditStore();

  const memo = stepName === "card" ? topicMemo : stepName === "code" ? codeMemo : conceptMemo;
  const setMemo = stepName === "card" ? setTopicMemo : stepName === "code" ? setCodeMemo : setConceptMemo;
  const placeholder = stepName === "card" ? "Your notes on the open coding process..."
    : stepName === "code" ? "Your notes on the sub-theme process..."
    : "Your notes on the theme process...";

  const setPosition = (p: { x: number; y: number }) => {
    memoState.x = p.x; memoState.y = p.y; _setPosition(p);
  };

  // Initialize position on first open
  useEffect(() => {
    if (open && !memoState.initialized) {
      memoState.initialized = true;
      setPosition({ x: window.innerWidth - 380, y: 120 });
    }
  }, [open]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    setDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [dragging]);

  if (stepName === "data" || stepName === "display") return null;

  return (
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-[#CB9180] hover:bg-[#AA7667] text-white rounded-full shadow-lg flex items-center justify-center text-lg transition-all hover:scale-105"
          title="Research Memo"
        >
          📝
        </button>
      )}

      {/* Floating memo panel */}
      {open && (
        <div
          className="fixed z-50 w-[320px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ left: position.x, top: position.y, maxHeight: "400px" }}
        >
          <div
            className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-move select-none"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <span>📝</span>
              <span className="text-xs font-bold text-gray-600">Research Memo</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 text-xs"
            >
              ✕
            </button>
          </div>
          <div className="p-3 flex-1">
            <textarea
              value={memo || ""}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={placeholder}
              className="w-full outline-none resize-none font-zen scrollbar-thin text-xs border border-gray-200 rounded-md p-2"
              style={{ minHeight: "200px", maxHeight: "300px" }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// Collapsible Left Panel
function LeftPanel({ styleInputsRef, stepName }: { styleInputsRef: React.RefObject<{ saveChangesToStore: () => void } | null>; stepName: string }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`relative flex h-full shrink-0 transition-all duration-300 ${collapsed ? 'w-10' : 'w-[320px]'}`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-3 z-10 w-6 h-6 bg-[#CB9180] text-white rounded-full flex items-center justify-center text-xs hover:bg-[#AA7667] shadow-md cursor-pointer"
        title={collapsed ? "Expand panel" : "Collapse panel"}
      >
        {collapsed ? '›' : '‹'}
      </button>
      {!collapsed && (
        <div
          className="w-full overflow-y-auto scrollbar-thin h-full border-r border-gray-100"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#d1d5db #f9fafb" }}
        >
          <div className="p-3 pb-8">
            <StyleInputs
              ref={styleInputsRef}
              storeType={stepName}
              className="text-[3vw] sm:text-[2vw] md:text-[1.5vw] lg:text-[1vw]"
            />
          </div>
        </div>
      )}
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
  useEffect(() => {
    const { autoRun, setAutoRun } = useInfoStore.getState();
    if (autoRun && !autoRunTriggered.current && stepName === "card") {
      autoRunTriggered.current = true;
      setAutoRun(false);
      handleGenerate("card");
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

  const globalIsRunning = useGenerationStore((s) => s.isRunning);

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

      {stepToName[step] !== "data" && stepToName[step] !== "display" && (
        <div className="w-full flex justify-center h-[calc(100vh-73px)] overflow-hidden">
          <div className="flex flex-row items-start gap-3 h-full w-full max-w-[1400px] px-8 pt-3">
            {/* Left side - Collapsible Panel */}
            <LeftPanel
              styleInputsRef={styleInputsRef}
              stepName={stepToName[step] || "data"}
            />

            {/* Right side - Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
              <div
                className={`flex-col w-full h-full flex items-center justify-stretch border shadow-lg rounded-xl overflow-hidden ${className}`}
                {...props}
              >
                {children || <Outlet />}
              </div>

              {/* Bottom buttons */}
              <div className="w-full flex justify-between items-center py-2 px-4 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={handleSaveToHistory}
                  disabled={pdfLoading || showSuccessAlert}
                  className={`bg-[#CB9180] hover:bg-[#b8816f] text-white px-4 py-1.5 rounded-md text-sm font-semibold font-zen ${
                    (pdfLoading || showSuccessAlert) &&
                    "opacity-50 cursor-not-allowed"
                  }`}
                >
                  {pdfLoading ? "Adding..." : "Save Version"}
                </button>
                <Bottom loading={loading || globalIsRunning}
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
        <div className="w-full mx-auto md:w-11/12 lg:w-5/6 xl:w-4/5 2xl:w-[65%] flex justify-between items-center p-6 border-t border-gray-300">
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
              <Bottom loading={loading || globalIsRunning}
                bottomType={stepName === "display" ? "display" : "regenerate"}
                regenerate={handleRegenerate}
                regenerateSubsequent={handleRegenerateRest}
              />
            </div>
          )}
        </div>
      )}
      {/* Loading indicator removed — spinner is now inline in the Regenerate button */}
      <FloatingMemo stepName={stepName} />
      <HistoryModal />
      <LLMHistoryModal />
    </div>
  );
}
