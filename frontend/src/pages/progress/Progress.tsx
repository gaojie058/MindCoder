import { useNavigate, useParams } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useEffect } from "react";
import Step from "./Step";
// import logo0 from "@/assets/chat.png";
import logo1 from "@/assets/tool.png";
import logo2 from "@/assets/pen.png";
import logo3 from "@/assets/search.png";
import logo4 from "@/assets/graph-bar.png";
import logo1active from "@/assets/tool-active.png";
import logo2active from "@/assets/pen-active.png";
import logo3active from "@/assets/search-active.png";
import logo4active from "@/assets/graph-bar-active.png";
import HistoryModal from "@/layout/HistoryModal";

export default function Progress() {
  const navigate = useNavigate();
  const { project } = useParams();

  // const step = Number(useParams().step);
  useEffect(() => {
    if (!project) {
      navigate("/");
    }
  }, [project, navigate]);

  const stepList = [
    // {
    //   step: 0,
    //   title: "Define Your Needs",
    //   imgSrc: logo0,
    //   imgSrcActive: logo0,
    //   description:
    //     "Understand your coding needs by chatting with our LLM. Specify your coding needs and data organisation preferences.",
    // },
    {
      step: 1,
      title: "Understand & Assign Open Codes",
      imgSrc: logo1,
      imgSrcActive: logo1active,
      description:
        "Organizing your data into open codes based solely on semantic meaning. ",
    },
    {
      step: 2,
      title: "Search & Review Sub-themes",
      imgSrc: logo2,
      imgSrcActive: logo2active,
      description:
        "Grouping and assigning codes to groups of open codes that share overlap in their high-level themes.",
    },
    {
      step: 3,
      title: "Define & Review Themes",
      imgSrc: logo3,
      imgSrcActive: logo3active,
      description:
        "Uncovering patterns in the underlying data by performing an additional level of grouping for Codes.",
    },
    {
      step: 4,
      title: "Key Finding Summary & Theme Map",
      imgSrc: logo4,
      imgSrcActive: logo4active,
      description:
        "Reporting your concepts as key findings and presenting your codes using mind maps.",
    },
  ];

  return (
    <div className="w-screen h-screen flex flex-col items-center">
      <div className="h-24 shadow-[7px_-1px_12px_0px_rgba(0,0,0,0.11%)] flex items-center p-3 w-full justify-between">
        <img src={logo} className=" h-[90%]" />
      </div>

      <div className="flex flex-col flex-1 w-full lg:w-5/6 xl:w-4/5 2xl:w-3/4">
        {/* <div className=" my-14 text-4xl font-zen font-semibold">
          {capitalizeWords(project)}'s Workflow Progress
        </div> */}
        <div className="flex justify-center gap-6 lg:gap-3 overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-3 w-full justify-items-center text-center">
            {stepList.map((item) => {
              const isActive = true;
              return (
                <Step
                  key={item.step}
                  step={item.step}
                  active={isActive}
                  title={item.title}
                  imgSrc={isActive ? item.imgSrcActive : item.imgSrc}
                  description={item.description}
                />
              );
            })}
          </div>
        </div>
      </div>

      <HistoryModal />
    </div>
  );
}
