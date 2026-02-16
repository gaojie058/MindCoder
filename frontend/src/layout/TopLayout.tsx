import React from "react";
import StepNav from "@/components/ui/StepNav";
// import { useGenerate } from "@/api/useGenerate";
import { useNavigate } from "react-router-dom";

const TopLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate("/");
  };

  return (
    <div className="h-16 flex items-center px-4 w-full border-b border-gray-100">
      <div className="flex items-center gap-4 w-full">
        <button
          onClick={handleBackToHome}
          className="px-4 py-2 rounded-lg bg-[#CB9180] text-white hover:bg-[#AA7667] font-zen font-semibold text-sm cursor-pointer flex items-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Settings
        </button>
        <StepNav />
      </div>
    </div>
  );
};

export default TopLayout;
