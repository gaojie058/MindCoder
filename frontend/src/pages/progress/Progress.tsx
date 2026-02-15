import { useNavigate, useParams } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useEffect, useState, useRef } from "react";
import Step from "./Step";
import logo1 from "@/assets/tool.png";
import logo2 from "@/assets/pen.png";
import logo3 from "@/assets/search.png";
import logo4 from "@/assets/graph-bar.png";
import logo1active from "@/assets/tool-active.png";
import logo2active from "@/assets/pen-active.png";
import logo3active from "@/assets/search-active.png";
import logo4active from "@/assets/graph-bar-active.png";
import HistoryModal from "@/layout/HistoryModal";
import useInfoStore from "@/stores/useInfoStore";
import { useGenerate } from "@/api/useGenerate";

const stepKeyToNumber: Record<string, number> = {
  card: 1,
  code: 2,
  concept: 3,
  display: 4,
};

const allSteps = [
  {
    key: "card",
    step: 1,
    title: "Understand & Assign Open Codes",
    imgSrc: logo1,
    imgSrcActive: logo1active,
    description:
      "Organizing your data into open codes based solely on semantic meaning.",
  },
  {
    key: "code",
    step: 2,
    title: "Search & Review Sub-themes",
    imgSrc: logo2,
    imgSrcActive: logo2active,
    description:
      "Grouping and assigning codes to groups of open codes that share overlap in their high-level themes.",
  },
  {
    key: "concept",
    step: 3,
    title: "Define & Review Themes",
    imgSrc: logo3,
    imgSrcActive: logo3active,
    description:
      "Uncovering patterns in the underlying data by performing an additional level of grouping for Codes.",
  },
  {
    key: "display",
    step: 4,
    title: "Key Finding Summary & Theme Map",
    imgSrc: logo4,
    imgSrcActive: logo4active,
    description:
      "Reporting your concepts as key findings and presenting your codes using mind maps.",
  },
];

export default function Progress() {
  const navigate = useNavigate();
  const { project } = useParams();
  const { selectedSteps, autoRun, setAutoRun } = useInfoStore();
  const { handleGenerate, loading, progress } = useGenerate();
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const autoRunTriggered = useRef(false);

  useEffect(() => {
    if (!project) {
      navigate("/");
    }
  }, [project, navigate]);

  // Auto-run generation when coming from HomePage
  useEffect(() => {
    if (autoRun && !autoRunTriggered.current) {
      autoRunTriggered.current = true;
      setAutoRun(false);
      handleGenerate()
        .then(() => setGenerationComplete(true))
        .catch((err) => {
          console.error("Generation error:", err);
          setGenerationError(err?.message || "Generation failed");
        });
    }
  }, [autoRun]);

  // Filter steps based on selectedSteps
  const filteredSteps = allSteps.filter((s) =>
    selectedSteps.includes(s.key)
  );

  // Determine grid columns based on number of visible steps
  const gridCols =
    filteredSteps.length <= 2
      ? "md:grid-cols-2"
      : filteredSteps.length === 3
      ? "md:grid-cols-3"
      : "md:grid-cols-4";

  return (
    <div className="w-screen h-screen flex flex-col items-center bg-[#FFFBF9]">
      {/* Header */}
      <div className="h-20 shadow-sm border-b border-gray-100 flex items-center px-6 w-full justify-between bg-white">
        <div className="flex items-center gap-3">
          <img src={logo} className="h-14" alt="MindCoder" />
        </div>
        {generationComplete && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-zen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Generation complete
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-[#CB9180]/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-[#CB9180] rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold font-zen text-gray-800 mb-2">
              Running MindCoder
            </h3>
            <p className="text-sm text-[#CB9180] font-zen">{progress}</p>
            <div className="mt-4 flex gap-1 justify-center">
              {filteredSteps.map((s) => (
                <div
                  key={s.key}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    progress.toLowerCase().includes(s.key) ||
                    (s.key === "card" && progress.includes("Processing")) ||
                    (s.key === "card" && progress.includes("Open Coding")) ||
                    (s.key === "code" && progress.includes("Sub-theme")) ||
                    (s.key === "concept" && progress.includes("Theme")) ||
                    (s.key === "display" && progress.includes("Generat"))
                      ? "bg-[#CB9180]"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {generationError && (
        <div className="w-full px-6 pt-4">
          <div className="max-w-5xl mx-auto bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-zen">
            ⚠️ {generationError}
          </div>
        </div>
      )}

      {/* Step Title */}
      <div className="w-full max-w-5xl px-6 pt-8 pb-2">
        <h2 className="text-2xl font-zen font-semibold text-gray-800">
          Workflow Progress
        </h2>
        <p className="text-sm text-gray-500 font-zen mt-1">
          {selectedSteps.length} step{selectedSteps.length !== 1 ? "s" : ""} selected — click any step to view results
        </p>
      </div>

      {/* Steps Grid */}
      <div className="flex flex-col flex-1 w-full max-w-5xl px-6 pb-8">
        <div className="flex justify-center gap-6 lg:gap-4 overflow-x-auto">
          <div
            className={`grid grid-cols-1 ${gridCols} gap-6 lg:gap-4 w-full justify-items-center text-center`}
          >
            {filteredSteps.map((item) => (
              <Step
                key={item.step}
                step={item.step}
                active={true}
                title={item.title}
                imgSrc={item.imgSrcActive}
                description={item.description}
              />
            ))}
          </div>
        </div>
      </div>

      <HistoryModal />
    </div>
  );
}
