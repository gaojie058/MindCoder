import { useParams } from "react-router-dom";
import StepNavItem from "./StepNavItem";
import logo1 from "@/assets/tool-active.png";
import logo2active from "@/assets/pen-active.png";
import logo3active from "@/assets/search-active.png";
import logo4active from "@/assets/graph-bar-active.png";

// type StepNavProps = {
//   hasFullGenerated: boolean;
// };

const StepNav = () => {
  // const { step: stepParam } = useParams();
  // const currentStep = Number(stepParam);
  const stepList = [
    // {
    //   step: 0,
    //   content: "Back to Customization",
    //   imgSrc: logo1,
    // },
    {
      step: 1,
      content: "Open Codes",
      imgSrc: logo1,
    },
    {
      step: 2,
      content: "Sub-themes",
      imgSrc: logo2active,
    },
    {
      step: 3,
      content: "Themes",
      imgSrc: logo3active,
    },
    {
      step: 4,
      content: "Summary",
      imgSrc: logo4active,
    },
  ];

  return (
    <div className="flex gap-4 justify-center items-center mx-auto">
      {stepList.map((item) => (
        <StepNavItem
          key={item.step}
          step={item.step}
          content={item.content}
          imgSrc={item.imgSrc}
          active={true}
          // allActive={hasFullGenerated}
        />
      ))}
    </div>
  );
};

export default StepNav;
