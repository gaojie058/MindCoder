import StepNavItem from "./StepNavItem";
import logo1 from "@/assets/tool-active.png";
import logo2active from "@/assets/pen-active.png";
import logo3active from "@/assets/search-active.png";
import logo4active from "@/assets/graph-bar-active.png";

export default function StepNav() {
  // Route IDs retain the generation dependencies; browsing starts with themes.
  const items = [
    { step: 3, content: "Themes", imgSrc: logo3active },
    { step: 2, content: "Sub-themes", imgSrc: logo2active },
    { step: 1, content: "Codes", imgSrc: logo1 },
    { step: 4, content: "Summary", imgSrc: logo4active },
  ];
  return <nav aria-label="Analysis views" className="flex flex-wrap gap-2 justify-center items-center mx-auto">
    {items.map(item => <StepNavItem key={item.step} {...item} active />)}
  </nav>;
}
