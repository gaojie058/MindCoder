import React from "react";
import StepNav from "@/components/ui/StepNav";
// import { useGenerate } from "@/api/useGenerate";
import { useNavigate } from "react-router-dom";

const TopLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate("/defineneeds/current/0");
  };

  return (
    <div className="h-24 flex items-center p-3 w-full">
      <div className="flex items-center gap-8 mx-auto">
        <button
          onClick={handleBackToHome}
          className="p-4 rounded-xl bg-[#CB9180] text-white hover:bg-[#AA7667] font-zen font-semibold cursor-pointer"
        >
          Back to Home Page
        </button>
        <StepNav />
      </div>
    </div>
  );
};

export default TopLayout;
