import { useNavigate, useParams } from "react-router-dom";

type StepProps = {
  active: boolean;
  imgSrc: string;
  title: string;
  step: number;
  description: string;
};

type addressMap = {
  [key: number]: string;
};

export default function Step({
  active,
  imgSrc,
  title,
  step,
  description,
}: StepProps) {
  const navigate = useNavigate();
  const { project } = useParams();
  // const truthStep = Number(useParams().step);

  const addressMap: addressMap = {
    // 0: `/defineneeds/${project}/${step}`,
    1: `/reconstruction/${project}/${step}/card`,
    2: `/labeling/${project}/${step}`,
    3: `/category/${project}/${step}`,
    4: `/visualization/${project}/${step}`,
  };

  const handleClick = () => {
    if (!active) return;
    navigate(addressMap[step]);
  };

  return (
    <div className="flex-1 flex flex-col items-center h-full">
      <div
        className={`text-center text mb-1 ${
          active ? "text-deepbg" : "text-gray"
        }`}
      >
        STEP {step}
      </div>
      <div className="w-full h-9 flex items-center justify-center">
        <div
          className={`flex-1 h-[2px] ${
            active ? "bg-deepbg" : "bg-gray"
          } rounded-l-full`}
        ></div>
        <div
          className={`w-9 h-9 ${
            active ? "border-[2px] border-deepbg" : "bg-gray"
          } rounded-full`}
        ></div>
        <div
          className={`flex-1 h-[2px] ${
            active ? "bg-deepbg" : "bg-gray"
          } rounded-r-full`}
        ></div>
      </div>
      <div
        className={`mt-3 w-full h-96 flex justify-center border-[1.5px]
          ${
            active
              ? "border-deepbg cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg"
              : "shadow-[0px_4.41px_12.35px_0px_rgba(8, 15, 52, 0.04)]"
          } rounded-[18px]`}
        onClick={handleClick}
      >
        <div className="mt-[30%] flex flex-col items-center">
          <div
            className={`w-12 h-12 rounded-[8px] p-3 ${
              active ? "bg-[#ff8b541a]" : "bg-[#efefef]"
            }`}
          >
            <img src={imgSrc} alt="logo" />
          </div>
          <div
            className={`mt-4 text ${
              active ? "text-activeText font-semibold" : "text-[#707070]"
            }`}
          >
            {title}
          </div>
          <div className="text-center text-sm p-4 text-slate-700">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}
