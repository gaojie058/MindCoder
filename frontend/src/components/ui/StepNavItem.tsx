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
      className={`px-5 h-16 rounded-2xl flex gap-2 items-center font-zen font-semibold cursor-pointer
        ${
          step === currentStep
            ? "border-[1.5px] border-deepbg bg-white"
            : "shadow-[0px_4.41px_12.35px_0px_rgba(0,0,0,0.04)]"
        }  `}
    >
      <div className="w-10 h-10 bg-shallowbg flex items-center justify-center rounded-xl">
        <img className="w-3/5" src={imgSrc} alt="Step Icon" />
      </div>
      <div
        className={`text-lg font-zen font-semibold ${
          step === currentStep ? "text-activeText" : "text-[#707070]"
        }`}
      >
        {content}
      </div>
    </div>
  );
};

export default StepNavItem;
