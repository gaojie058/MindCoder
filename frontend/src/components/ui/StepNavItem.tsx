import { useNavigate, useParams } from "react-router-dom";
import React, { useState, useEffect } from "react";

type StepNavItemProps = {
  step: number;
  active: boolean;
  content: string;
  imgSrc: string;
  // allActive: boolean;
};

const StepNavItem: React.FC<StepNavItemProps> = ({
  step,
  active,
  content,
  imgSrc,
  // allActive,
}) => {
  const navigate = useNavigate();
  const { project, step: currentStepParam } = useParams();
  const currentStep = Number(currentStepParam);

  const [maxStep, setMaxStep] = useState(currentStep);

  useEffect(() => {
    if (currentStep > maxStep) {
      setMaxStep(currentStep);
    }
  }, [currentStep, maxStep]);

  const addressMap: { [key: number]: string } = {
    // 0: `/defineneeds/${project}/${step}`,
    1: `/reconstruction/${project}/${step}/card`,
    2: `/labeling/${project}/${step}`,
    3: `/category/${project}/${step}`,
    4: `/visualization/${project}/${step}`,
  };

  const handleClick = () => {

    // Dispatch event to save current customizations before navigating
    const saveEvent = new CustomEvent("save-customizations-before-navigation");
    document.dispatchEvent(saveEvent);

    // Small delay to ensure the save event is processed before navigation
    setTimeout(() => {
      navigate(addressMap[step]);
    }, 100);
  };

  return (
    <div
      onClick={handleClick}
      className={`px-4 py-2 rounded-xl flex gap-2 items-center font-zen font-semibold cursor-pointer transition-all
        ${
          step === currentStep
            ? "border-[1.5px] border-[#CB9180] bg-white shadow-sm"
            : "bg-gray-50 hover:bg-gray-100"
        }  `}
    >
      <div className="w-8 h-8 bg-shallowbg flex items-center justify-center rounded-lg">
        <img className="w-3/5" src={imgSrc} alt="Step Icon" />
      </div>
      <div
        className={`text-sm font-zen font-semibold ${
          step === currentStep ? "text-[#CB9180]" : "text-[#707070]"
        }`}
      >
        {content}
      </div>
    </div>
  );
};

export default StepNavItem;
