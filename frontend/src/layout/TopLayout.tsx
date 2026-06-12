import React from "react";
import StepNav from "@/components/ui/StepNav";
import { useNavigate, useParams } from "react-router-dom";
import BackgroundGenButton from "@/components/ui/BackgroundGenButton";
import Button from "@/components/ui/Button";

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
  const isAnalysisStep = ["card", "code", "concept", "display"].includes(stepName);

  const handleBackToHome = () => {
    if (project) {
      sessionStorage.setItem("mindcoder-last-step", window.location.hash);
    }
    navigate("/");
  };

  return (
    <div className="material-bar sticky top-0 z-30 flex items-center w-full border-b border-border shrink-0">
      <div className="flex items-center gap-3 w-full max-w-[1400px] mx-auto px-8 py-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleBackToHome}
          className="font-zen shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Settings
        </Button>
        <StepNav />

        {/* Right-side: Background Gen button for analysis steps */}
        {isAnalysisStep && (
          <div className="ml-auto flex items-center gap-2">
            <BackgroundGenButton />
          </div>
        )}
      </div>
    </div>
  );
};

export default TopLayout;
