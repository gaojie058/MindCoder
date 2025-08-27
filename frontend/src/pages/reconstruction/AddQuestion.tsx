import { ChangeEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "@/components/ui/Loading";
import lightbulb from "@/assets/icon/lightbulb.png";
import Bottom from "@/components/ui/Bottom";
import frameLogo from "@/assets/frameLogo.png";
import Button from "@/components/ui/Button";

export default function AddQuestion() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { project, step } = useParams();

    const handleGenerate = async () => {
      setLoading(true);

      setTimeout(() => {
        setLoading(false);
        navigate(`/progress/${project}/${Number(step) + 1}`);
      }, 2000);
    };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleSave = () => {
    // Add your save logic here
  };

  const handleAdd = () => {
    // Add your add logic here
  };

  const handleDelete = () => {
    setValue("");
  };

  const handleAIGenerate = () => {
    // Add your AI generate logic here
  };

  return (
    <div className="w-full h-full flex-1 flex flex-col justify-stretch overflow-hidden">
      <div className="p-8 w-full flex-1">
        <h1 className="w-full flex-1 text-4xl font-medium mb-4">
          Research Question
        </h1>
        <p className="mb-4 mt-8 text-2xl font-zen">
          Identify the research question(s) that align with your content
          objectives. You may also choose to use AI to suggest research
          question(s).
        </p>
        <div className="w-full h-16 flex mt-8 p-2 border border-gray-300 rounded-2xl shadow-sm mb-4 justify-between">
          <input
            type="text"
            className="w-1/2 resize-none outline-none"
            placeholder="Enter research question here"
            value={value}
            onChange={handleChange}
          />
          <div className="flex justify-between items-center p-4 gap-4">
            <Button
              onClick={handleAIGenerate}
              className="p-2 px-3 rounded-lg text-sm text-[#62AD3C] font-semibold bg-gradient-to-r from-green-200 to-teal-200 shadow-md"
            >
              <img src={lightbulb} alt="Lightbulb" className="w-4 h-4 mr-2" />
              get AI generated
            </Button>
            <Button
              onClick={handleSave}
              className="p-2 px-3 rounded-lg !bg-[#CB9180] hover:!bg-[#AA7667] text-sm"
            >
              save
            </Button>
            <Button
              onClick={handleAdd}
              className="p-2 px-3 rounded-lg !bg-[#CB9180] hover:!bg-[#AA7667] text-sm"
            >
              add
            </Button>
            <Button
              onClick={handleDelete}
              className="p-2 px-3 rounded-lg !bg-[#CB9180] hover:!bg-[#AA7667] text-sm"
            >
              delete
            </Button>
          </div>
        </div>
      </div>
      <div className="w-full flex justify-between items-center p-4 border-t border-gray-300">
        <img src={frameLogo} alt="Frame Logo" className="w-1/5 opacity-50" />
        <Bottom bottomType="generate" generate={handleGenerate} />
      </div>
      {loading && <Loading />}
    </div>
  );
}
