import { useNavigate, useParams } from "react-router-dom";
import Button from "./Button";
import reloadIcon from "../../assets/icon/reload.svg";
import nextIcon from "../../assets/icon/next.svg";
import backIcon from "../../assets/icon/back.svg";

type BottomLayoutProps = {
  bottomType: "generate" | "regenerate" | "display";
  generate?: () => void;
  regenerate?: () => void;
  regenerateSubsequent?: () => void;
  saveAndBack?: () => void;
  viewDownload?: () => void;
  reasoning?: () => void;
  versionHistory?: () => void;
  storeType?: "card" | "code" | "concept" | "display";
};

export default function Bottom({
  bottomType,
  // generate = () => {},
  regenerate,
  regenerateSubsequent,
}: BottomLayoutProps) {
  const navigate = useNavigate();
  const { project, step } = useParams();
  const currentStep = Number(step) || 0;

  const goback = () => {
    navigate(`/progress/${project}/${currentStep}`);
  };

  // const gonext = () => {
  //   const nextStep = currentStep + 1;
  //   if (project) {
  //     navigate(`/progress/${project}/${nextStep}`);
  //   } else {
  //     console.error("Project is undefined, cannot navigate.");
  //   }
  // };

  // console.log("Current step:", storeType);

  return (
    <div className="w-full flex justify-end mx-auto md:w-11/12 lg:w-5/6 xl:w-4/5 2xl:w-3/4 gap-3">
      {/* {bottomType === "generate" && (
        <>
          <Button
            onClick={generate}
            className="p-3 rounded-lg !bg-[#CB9180] hover:!bg-[#AA7667] 2xl:p-5"
          >
            Generate
          </Button>
        </>
      )} */}
      {bottomType === "regenerate" && (
        <>
          <Button
            onClick={goback}
            className="px-4 py-4 rounded-lg !bg-[#FFF3EE] !text-[#CB9180] hover:!bg-[#F3E8E4] text-sm font-semibold font-zen"
          >
            <img src={backIcon} alt="reload" className="w-4 h-4 mr-1" />
            Return to Reasoning Page
          </Button>
          <Button
            onClick={regenerate}
            className="px-4 py-4 rounded-lg !bg-[#CB9180] hover:!bg-[#AA7667] flex text-sm font-semibold font-zen"
          >
            <img
              src={reloadIcon}
              alt="reload"
              className="w-4 h-4 justify-center items-center mr-1"
            />
            Regenerate Current Page
          </Button>
          <Button
            onClick={regenerateSubsequent}
            className="px-4 py-4 rounded-lg !bg-[#E8C0B3] hover:!bg-[#D1A696] text-sm font-semibold font-zen"
          >
            <img
              src={nextIcon}
              alt="reload"
              className="w-4 h-4 justify-center items-center mr-1"
            />
            Update the Rest Coding
          </Button>
          {/* <Button
            onClick={saveAndBack}
            className="p-3 rounded-lg !bg-[#FFF3EE] !text-[#CB9180] hover:!bg-[#F3E8E4] 2xl:p-5"
          >
            Update the rest coding
          </Button> */}
        </>
      )}
      {bottomType === "display" && (
        <>
          <Button
            onClick={goback}
            className="px-4 py-4 rounded-lg !bg-[#FFF3EE] !text-[#CB9180] hover:!bg-[#F3E8E4] text-sm font-semibold font-zen"
          >
            <img
              src={backIcon}
              alt="reload"
              className="w-4 h-4 justify-center items-center mr-1"
            />
            Return to Reasoning page
          </Button>
          <Button
            onClick={regenerate}
            className="px-4 py-4 rounded-lg !bg-[#CB9180] hover:!bg-[#AA7667] flex text-sm font-semibold font-zen"
          >
            <img
              src={reloadIcon}
              alt="reload"
              className="w-4 h-4 justify-center items-center mr-1"
            />
            Regenerate Current Page
          </Button>
          {/* <Button
            onClick={generate}
            className="p-3 rounded-lg !bg-[#FFF3EE] !text-[#CB9180] hover:!bg-[#F3E8E4] 2xl:p-5"
          >
            Save to PDF
          </Button> */}
        </>
      )}
      {/* <Button
            onClick={saveAndBack}
            className="p-3 rounded-lg !bg-[#FFF3EE] !text-[#CB9180] hover:!bg-[#F3E8E4] 2xl:p-5"
          >
            Update the rest coding
          </Button> */}
    </div>
  );
}
