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

  const addressMap: addressMap = {
    1: `/reconstruction/${project}/${step}/card`,
    2: `/labeling/${project}/${step}`,
    3: `/category/${project}/${step}`,
    4: `/visualization/${project}/${step}`,
  };

  const handleClick = () => {
    if (!active) return;
    navigate(addressMap[step]);
  };

  const stepColors: Record<number, string> = {
    1: "#CB9180",
    2: "#D39C83",
    3: "#B8856F",
    4: "#A67B6B",
  };

  const color = stepColors[step] || "#CB9180";

  return (
    <div className="flex-1 flex flex-col items-center h-full w-full">
      {/* Step indicator */}
      <div
        className="text-center text-sm font-zen font-semibold mb-2"
        style={{ color: active ? color : "#999" }}
      >
        STEP {step}
      </div>
      <div className="w-full h-9 flex items-center justify-center">
        <div
          className="flex-1 h-[2px] rounded-l-full"
          style={{ backgroundColor: active ? color : "#ddd" }}
        ></div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            border: active ? `2px solid ${color}` : "none",
            backgroundColor: active ? "white" : "#ddd",
          }}
        >
          {active && (
            <span className="text-xs font-bold" style={{ color }}>
              {step}
            </span>
          )}
        </div>
        <div
          className="flex-1 h-[2px] rounded-r-full"
          style={{ backgroundColor: active ? color : "#ddd" }}
        ></div>
      </div>

      {/* Card */}
      <div
        className={`mt-4 w-full h-80 flex flex-col items-center justify-center rounded-2xl border-[1.5px] transition-all ${
          active
            ? "border-[#CB9180]/30 cursor-pointer hover:-translate-y-1 hover:shadow-xl bg-white shadow-md"
            : "border-gray-200 bg-gray-50 shadow-sm"
        }`}
        onClick={handleClick}
      >
        <div
          className={`w-14 h-14 rounded-xl p-3 mb-4 ${
            active ? "bg-[#FFF3EE]" : "bg-[#efefef]"
          }`}
        >
          <img src={imgSrc} alt="logo" className="w-full h-full object-contain" />
        </div>
        <div
          className={`text-base font-zen px-4 text-center ${
            active ? "text-gray-800 font-semibold" : "text-[#707070]"
          }`}
        >
          {title}
        </div>
        <div className="text-center text-sm px-5 mt-3 text-gray-500 font-zen leading-relaxed">
          {description}
        </div>
      </div>
    </div>
  );
}
