import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import logoAdd from "@/assets/icon/add.png";
import logoEye from "@/assets/icon/eye.png";
import logoTrash from "@/assets/icon/trash.png";
import logoDoc from "@/assets/icon/doc.png";
import CodeLabel from "./CodeLabel";
import Dialog from "@/components/ui/Dialog";
import { useNavigate, useParams } from "react-router-dom";
import AddCard from "./AddCard";
import useCardStore from "@/stores/useCardStore";
import LexicalEditor from "./LexicalPlugins/LexicalEditor";

export default function CardArea() {
  const { cardData } = useCardStore();

  const [isHidden, setIsHidden] = useState(true);

  const navigate = useNavigate();
  const { project, step } = useParams();
  const [viewMode, setViewMode] = useState("split");
  const [editorReady, setEditorReady] = useState(false);
  const [editorInitialized, setEditorInitialized] = useState(false);

  const revealDialog = () => setIsHidden(false);
  const hideDialog = () => setIsHidden(true);
  const searchCard = () =>
    navigate(`/reconstruction/${project}/${step}/search`);
  const trashedCard = () =>
    navigate(`/reconstruction/${project}/${step}/trash`);

  const toggleViewMode = () => {
    setViewMode(viewMode === "cards" ? "split" : "cards");
  };

  useEffect(() => {
    if (!editorInitialized) {
      setEditorInitialized(true);
    }
  }, [editorInitialized]);

  const activeCodes = cardData.filter((card) => card.active);

  return (
    <>
      <div className="w-full h-full flex flex-col bg-[#FFFBF9]">
        {/* Step Header */}
        <div className="w-full bg-gradient-to-r from-[#CB9180]/10 to-[#D39C83]/5 border-b border-[#CB9180]/15 px-6 py-3 flex-shrink-0">
          <h2 className="text-lg font-semibold font-zen text-[#8B5E4B]">
            <span className="text-[#CB9180] mr-2">Step 1</span>Open Coding
          </h2>
          <p className="text-xs text-gray-500 font-zen mt-0.5">Organize your data into open codes based on semantic meaning</p>
        </div>
        <div className="w-full flex gap-3 bg-white z-20 px-6 py-2.5 flex-shrink-0 border-b border-gray-100">
          <Button
            onClick={toggleViewMode}
            className="h-10 rounded-xl !text-deepbg !bg-[#FFF3EE] text-sm px-3"
          >
            <img src={logoDoc} alt="" className="w-5 h-5 mr-1.5" />
            View original data
          </Button>
          <Button
            onClick={searchCard}
            className="h-10 rounded-xl !text-deepbg !bg-[#FFF3EE] text-sm px-3"
          >
            <img src={logoEye} alt="" className="w-5 h-5 mr-1.5" />
            Search data
          </Button>
          <Button
            onClick={revealDialog}
            className="h-10 rounded-xl !text-deepbg !bg-[#FFF3EE] text-sm px-3"
          >
            <img src={logoAdd} alt="" className="w-5 h-5 mr-1.5" />
            Add new code
          </Button>
          <Button
            onClick={trashedCard}
            className="h-10 rounded-xl !text-deepbg !bg-[#FFF3EE] text-sm px-3"
          >
            <img src={logoTrash} alt="" className="w-5 h-5 mr-1.5" />
            Trashed codes
          </Button>
        </div>

        <div className="w-full flex-1 flex flex-row overflow-hidden">
          {/* Editor Section */}
          {viewMode === "split" && (
            <div className="border-r h-full overflow-y-auto scrollbar-thin w-[60%]">
              {editorInitialized && (
                <LexicalEditor
                  onHighlightReady={() => setEditorReady(true)}
                  key="editor-instance"
                />
              )}
            </div>
          )}

          {/* Codes List Section */}
          <div
            className="h-full overflow-auto scrollbar-thin"
            style={{ width: viewMode === "split" ? "40%" : "100%" }}
          >
            <div className="px-3 py-3">
              <div className="flex items-center justify-between mb-2 px-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Open Codes ({activeCodes.length})
                </span>
              </div>
              <div className="space-y-0.5">
                {activeCodes.map((card, index) => (
                  <CodeLabel
                    key={card.id}
                    id={card.id}
                    name={card.name}
                    topics={card.topics}
                    active={card.active ?? true}
                    isGPT={card.isGPT ?? false}
                    colorIndex={index}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isHidden && (
        <Dialog>
          <AddCard hideDialog={hideDialog} />
        </Dialog>
      )}
    </>
  );
}
