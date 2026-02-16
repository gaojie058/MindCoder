import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import logoAdd from "@/assets/icon/add.png";
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
  const [viewMode, setViewMode] = useState("split"); // "codes" = full-width codes, "split" = editor + codes
  const [editorReady, setEditorReady] = useState(false);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const revealDialog = () => setIsHidden(false);
  const hideDialog = () => setIsHidden(true);
  const trashedCard = () =>
    navigate(`/reconstruction/${project}/${step}/trash`);

  const toggleViewMode = () => {
    setViewMode(viewMode === "codes" ? "split" : "codes");
  };

  useEffect(() => {
    if (!editorInitialized) {
      setEditorInitialized(true);
    }
  }, [editorInitialized]);

  const activeCodes = cardData.filter((card) => card.active);
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const handleSelect = useCallback((id: string | null) => setSelectedCodeId(id), []);

  // Filter codes by search query
  const filteredCodes = searchQuery.trim()
    ? activeCodes.filter((card) => {
        const q = searchQuery.toLowerCase();
        return (
          card.name.toLowerCase().includes(q) ||
          card.id.toString().includes(q) ||
          card.topics.some((t) => t.content.toLowerCase().includes(q))
        );
      })
    : activeCodes;

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
        <div className="w-full flex gap-2 bg-white z-20 px-6 py-2 flex-shrink-0 border-b border-gray-100 items-center">
          <Button
            onClick={toggleViewMode}
            className="h-9 rounded-xl !text-deepbg !bg-[#FFF3EE] text-xs px-3"
          >
            <img src={logoDoc} alt="" className="w-4 h-4 mr-1.5" />
            {viewMode === "split" ? "Expand Codes" : "Show Original"}
          </Button>
          <Button
            onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}
            className={`h-9 rounded-xl text-xs px-3 ${showSearch ? "!text-white !bg-[#CB9180]" : "!text-deepbg !bg-[#FFF3EE]"}`}
          >
            🔍 Search
          </Button>
          <Button
            onClick={revealDialog}
            className="h-9 rounded-xl !text-deepbg !bg-[#FFF3EE] text-xs px-3"
          >
            <img src={logoAdd} alt="" className="w-4 h-4 mr-1.5" />
            Add Code
          </Button>
          <Button
            onClick={trashedCard}
            className="h-9 rounded-xl !text-deepbg !bg-[#FFF3EE] text-xs px-3"
          >
            <img src={logoTrash} alt="" className="w-4 h-4 mr-1.5" />
            Trash
          </Button>

          {/* Inline search input */}
          {showSearch && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search codes or segments..."
              autoFocus
              className="ml-2 flex-1 h-9 px-3 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#CB9180]"
            />
          )}
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
                  Open Codes ({filteredCodes.length}{searchQuery ? ` / ${activeCodes.length}` : ""})
                </span>
              </div>
              <div className={viewMode === "codes" ? "grid grid-cols-2 gap-2" : "space-y-0.5"}>
                {filteredCodes.map((card, index) => {
                  // Find original index for consistent color
                  const origIndex = activeCodes.findIndex((c) => c.id === card.id);
                  return (
                    <CodeLabel
                      key={card.id}
                      id={card.id}
                      name={card.name}
                      topics={card.topics}
                      active={card.active ?? true}
                      isGPT={card.isGPT ?? false}
                      colorIndex={origIndex >= 0 ? origIndex : index}
                      selectedCodeId={selectedCodeId}
                      onSelect={handleSelect}
                    />
                  );
                })}
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

      <style>{`
        @keyframes code-label-flash {
          0%, 100% { background-color: transparent; }
          30% { background-color: rgba(203,145,128,0.25); }
          60% { background-color: rgba(203,145,128,0.1); }
        }
        .code-label-flash {
          animation: code-label-flash 1.5s ease;
        }
      `}</style>
    </>
  );
}
