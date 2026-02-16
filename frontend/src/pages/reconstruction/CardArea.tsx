import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import logoAdd from "@/assets/icon/add.png";
import logoEye from "@/assets/icon/eye.png";
import logoTrash from "@/assets/icon/trash.png";
import logoDoc from "@/assets/icon/doc.png";
import Card from "./Card";
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
  const [viewMode, setViewMode] = useState("split"); // "cards" or "split" — default to split view
  const [editorReady, setEditorReady] = useState(false);
  const [editorInitialized, setEditorInitialized] = useState(false);

  const revealDialog = () => setIsHidden(false);
  const hideDialog = () => setIsHidden(true);
  const searchCard = () =>
    navigate(`/reconstruction/${project}/${step}/search`);
  const trashedCard = () =>
    navigate(`/reconstruction/${project}/${step}/trash`);

  // Optimize the toggle view mode function
  const toggleViewMode = () => {
    // Only update the view mode state, other state changes happen in useEffect
    setViewMode(viewMode === "cards" ? "split" : "cards");
  };

  // Initialize editor only once and keep it mounted
  useEffect(() => {
    if (!editorInitialized) {
      setEditorInitialized(true);
    }
  }, [editorInitialized]);

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
        <div className="w-full flex gap-3 bg-white z-20 px-6 py-3 flex-shrink-0 border-b border-gray-100">
          <Button
            onClick={toggleViewMode}
            className="w-48 h-12 rounded-2xl !text-deepbg !bg-[#FFF3EE]"
          >
            <img src={logoDoc} alt="" className="w-6 h-6 mr-2" />
            View original data
          </Button>
          <Button
            onClick={searchCard}
            className="w-40 h-12 rounded-2xl !text-deepbg !bg-[#FFF3EE]"
          >
            <img src={logoEye} alt="" className="w-6 h-6 mr-2" />
            Search data
          </Button>
          <Button
            onClick={revealDialog}
            className="w-40 h-12 rounded-2xl !text-deepbg !bg-[#FFF3EE]"
          >
            <img src={logoAdd} alt="" className="w-6 h-6 mr-2" />
            Add new code
          </Button>

          <Button
            onClick={trashedCard}
            className="w-40 h-12 rounded-2xl !text-deepbg !bg-[#FFF3EE]"
          >
            <img src={logoTrash} alt="" className="w-6 h-6 mr-2" />
            Trashed codes
          </Button>
        </div>

        <div className="w-full flex-1 flex flex-row overflow-hidden">
          {/* Editor Section - Only render when in split view */}
          {viewMode === "split" && (
            <div className="border-r h-full overflow-y-auto scrollbar-thin w-[65%]">
              {editorInitialized && (
                <LexicalEditor
                  onHighlightReady={() => setEditorReady(true)}
                  key="editor-instance"
                />
              )}
            </div>
          )}

          {/* Cards Section */}
          <div
            className="h-full overflow-auto scrollbar-thin"
            style={{
              width: viewMode === "split" ? "35%" : "100%",
            }}
          >
            <div className="flex flex-wrap gap-4 px-4 py-4 mx-auto w-full max-w-[1200px] pb-8 overflow-auto">
              {cardData
                .filter((card) => card.active)
                .map((card) => (
                  <Card
                    key={card.id}
                    id={card.id}
                    topics={card.topics}
                    active={card.active}
                    isGPT={card.isGPT}
                    name={card.name}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>

      {!isHidden && (
        <Dialog>
          <AddCard hideDialog={hideDialog} />
        </Dialog>
      )}

      <style>{`
        @keyframes card-flash {
          0%,
          100% {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          50% {
            box-shadow: 0 0 0 4px #ffd700, 0 0 20px 2px rgba(255, 215, 0, 0.6);
          }
        }

        .card-highlight-flash {
          animation: card-flash 1.5s ease;
          z-index: 10;
        }

        /* Improved styles for editor and highlighting */
        [style*="background-color: yellow"] {
          background-color: yellow !important;
          display: inline;
          padding: 2px 0;
          border-radius: 2px;
          cursor: pointer;
          position: relative;
          z-index: 5;
        }
      `}</style>
    </>
  );
}
