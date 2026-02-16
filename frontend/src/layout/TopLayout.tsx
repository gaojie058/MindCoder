import React from "react";
import StepNav from "@/components/ui/StepNav";
import BackgroundGenButton from "@/components/ui/BackgroundGenButton";
import { useNavigate, useParams } from "react-router-dom";

const TopLayout: React.FC = () => {
  const navigate = useNavigate();
  const { project } = useParams();

  const handleBackToHome = () => {
    // Store current location so we can return
    if (project) {
      sessionStorage.setItem("mindcoder-last-step", window.location.hash);
    }
    navigate("/");
  };

  return (
    <div className="h-14 flex items-center px-4 w-full border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-3 w-full max-w-6xl mx-auto">
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
        <div className="ml-auto shrink-0">
          <BackgroundGenButton />
        </div>
      </div>
    </div>
  );
};

export default TopLayout;
