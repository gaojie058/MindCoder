import React from "react";
import StepNav from "@/components/ui/StepNav";
import { useNavigate, useParams } from "react-router-dom";
import BackgroundGenButton from "@/components/ui/BackgroundGenButton";
import useGenerationStore from "@/stores/useGenerationStore";
import useVersionStore from "@/stores/useVersionStore";
import useAppStore from "@/stores/useAppStore";
import useLLMHistoryStore from "@/stores/useLLMHistoryStore";

const stepToName: Record<string, string> = {
  "0": "data",
  "1": "card",
  "2": "code",
  "3": "concept",
  "4": "display",
};

const TopLayout: React.FC = () => {
  const navigate = useNavigate();
  const { project, step } = useParams();
  const stepName = stepToName[step || "0"] || "data";
  const isAnalysisStep = ["card", "code", "concept"].includes(stepName);

  const bgRunning = useGenerationStore((s) => s.bgRunning);
  const regenRunning = useGenerationStore((s) => s.regenRunning);
  const globalIsRunning = bgRunning || regenRunning;
  const toggleVersionPanel = useVersionStore((s) => s.togglePanel);

  const handleBackToHome = () => {
    if (project) {
      sessionStorage.setItem("mindcoder-last-step", window.location.hash);
    }
    navigate("/");
  };

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
    if (!globalIsRunning) {
      useAppStore.getState().saveChangesToStore();
      savePromptToHistory();
      useGenerationStore.getState().regenerateStep(stepName);
    }
  };

  return (
    <div className="flex items-center w-full border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-3 w-full max-w-[1600px] mx-auto px-8 py-4">
        <button
          onClick={handleBackToHome}
          className="px-3 py-1.5 rounded-lg bg-[#CB9180] text-white hover:bg-[#AA7667] font-zen font-semibold text-xs cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Settings
        </button>
        <StepNav />

        {/* Right-side action buttons for analysis steps */}
        {isAnalysisStep && (
          <div className="ml-auto flex items-center gap-2">
            <BackgroundGenButton />
            <button
              onClick={toggleVersionPanel}
              className="px-3 py-1.5 rounded-lg text-xs font-zen font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors flex items-center gap-1.5"
            >
              🕐 History
            </button>
            <button
              onClick={handleRegenerate}
              disabled={globalIsRunning}
              className="px-3.5 py-1.5 rounded-lg text-xs font-zen font-semibold text-white bg-[#CB9180] hover:bg-[#AA7667] disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {regenRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                "↻ Regenerate"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopLayout;
