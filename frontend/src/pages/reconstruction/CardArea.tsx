import { useState, useEffect, useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import logoAdd from "@/assets/icon/add.png";
import logoTrash from "@/assets/icon/trash.png";
import logoDoc from "@/assets/icon/doc.png";
import CodeLabel from "./CodeLabel";
import Dialog from "@/components/ui/Dialog";
import { useNavigate, useParams } from "react-router-dom";
import AddCard from "./AddCard";
import useCardStore from "@/stores/useCardStore";
import useEditorStore from "@/stores/useEditorStore";
import LexicalEditor from "./LexicalPlugins/LexicalEditor";

export default function CardArea() {
  const { cardData, fileCardMap, getCardsForFile } = useCardStore();
  const { selectedFile } = useEditorStore();

  const [isHidden, setIsHidden] = useState(true);

  const navigate = useNavigate();
  const { project, step } = useParams();
  const [viewMode, setViewMode] = useState("split"); // "codes" = full-width codes, "split" = editor + codes
  const [editorReady, setEditorReady] = useState(false);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const allActiveCodes = cardData.filter((card) => card.active);
  
  // When a file is selected, only show codes belonging to that file
  const activeCodes = selectedFile
    ? (() => {
        const fileCards = getCardsForFile(selectedFile);
        const fileCardIds = new Set(fileCards.map(c => c.id));
        return allActiveCodes.filter(card => fileCardIds.has(card.id));
      })()
    : allActiveCodes;
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const handleSelect = useCallback((id: string | null) => setSelectedCodeId(id), []);

  // Stats
  const stats = useMemo(() => {
    const total = activeCodes.length;
    const aiGenerated = activeCodes.filter(c => c.isGPT === true).length;
    return { total, aiGenerated, userEdited: total - aiGenerated };
  }, [activeCodes]);

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
        {/* Stats Bar */}
        <div className="w-full px-6 py-2 flex items-center gap-4 bg-[#FFF3EE] border-b border-[#CB9180]/10 flex-shrink-0 text-xs">
          <span className="text-[#8B5E4B] font-medium">Total: {stats.total}</span>
          <span className="text-[#CB9180]">•</span>
          <span className="text-[#CB9180]">🤖 AI-generated: {stats.aiGenerated}</span>
          <span className="text-[#CB9180]">•</span>
          <span className="text-[#8B5E4B]">✏️ User edited: {stats.userEdited}</span>
        </div>
        <div className="w-full flex gap-2 bg-white z-20 px-6 py-2 flex-shrink-0 border-b border-gray-100 items-center">
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
          {/* Always-visible search input */}
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search codes..."
              className="w-full h-9 pl-8 pr-3 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#CB9180] bg-gray-50/50"
            />
          </div>
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
                  {selectedFile && (
                    <span className="ml-1 text-[10px] font-normal text-gray-400">
                      — {selectedFile}
                    </span>
                  )}
                </span>
                <button
                  onClick={toggleViewMode}
                  className="text-[11px] text-gray-400 hover:text-[#CB9180] transition-colors flex items-center gap-1"
                >
                  <img src={logoDoc} alt="" className="w-3.5 h-3.5 opacity-50" />
                  {viewMode === "split" ? "Expand" : "Show Original"}
                </button>
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
