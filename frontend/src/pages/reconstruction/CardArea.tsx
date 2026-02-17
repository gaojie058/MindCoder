import { useState, useEffect, useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import logoTrash from "@/assets/icon/trash.png";
import logoDoc from "@/assets/icon/doc.png";
import CodeLabel from "./CodeLabel";
import { useNavigate, useParams } from "react-router-dom";
import useCardStore from "@/stores/useCardStore";
import useEditorStore from "@/stores/useEditorStore";
import { card } from "@/types/stores";
import { nanoid } from "nanoid";
import LexicalEditor from "./LexicalPlugins/LexicalEditor";

export default function CardArea() {
  const { cardData, fileCardMap, getCardsForFile } = useCardStore();
  const { selectedFile } = useEditorStore();

  const navigate = useNavigate();
  const { project, step } = useParams();
  const [viewMode, setViewMode] = useState("split");
  const [editorReady, setEditorReady] = useState(false);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "ai" | "edited" | "locked">("all");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; text: string } | null>(null);

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

  const { lockedCardIds } = useCardStore();

  // Stats
  const stats = useMemo(() => {
    const total = activeCodes.length;
    const aiGenerated = activeCodes.filter(c => c.isGPT === true).length;
    const locked = activeCodes.filter(c => lockedCardIds.has(c.id)).length;
    return { total, aiGenerated, userEdited: total - aiGenerated, locked };
  }, [activeCodes, lockedCardIds]);

  // Filter codes by active filter + search query
  const filteredCodes = useMemo(() => {
    let codes = activeCodes;

    // Apply category filter
    if (activeFilter === "ai") {
      codes = codes.filter(c => c.isGPT === true && !lockedCardIds.has(c.id));
    } else if (activeFilter === "edited") {
      codes = codes.filter(c => c.isGPT === false);
    } else if (activeFilter === "locked") {
      codes = codes.filter(c => lockedCardIds.has(c.id));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      codes = codes.filter((card) =>
        card.name.toLowerCase().includes(q) ||
        card.id.toString().includes(q) ||
        card.topics.some((t) => t.content.toLowerCase().includes(q))
      );
    }

    return codes;
  }, [activeCodes, activeFilter, searchQuery, lockedCardIds]);

  // Right-click context menu for adding code from selected text
  const handleEditorContextMenu = useCallback((e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 0) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, text });
    }
  }, []);

  const handleAddCodeFromSelection = useCallback(() => {
    if (!contextMenu) return;
    const { setCardData } = useCardStore.getState();
    const currentCards = useCardStore.getState().cardData;
    const newId = String(Math.max(0, ...currentCards.map(c => parseInt(c.id) || 0)) + 1);
    const newCard: card = {
      id: newId,
      name: `Code ${newId}`,
      topics: [{ id: "1", content: contextMenu.text, uuid: nanoid() }],
      active: true,
      isGPT: false,
    };
    setCardData([...currentCards, newCard]);

    // Add to file card map if a file is selected
    const { selectedFile } = useEditorStore.getState();
    if (selectedFile) {
      const { fileCardMap } = useCardStore.getState();
      const updatedMap = { ...fileCardMap };
      updatedMap[selectedFile] = [...(updatedMap[selectedFile] || []), newId];
      useCardStore.setState({ fileCardMap: updatedMap });
    }

    // Select the new code and scroll to it
    setSelectedCodeId(newId);
    setTimeout(() => {
      const el = document.querySelector(`[data-code-id="${newId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    setContextMenu(null);
    window.getSelection()?.removeAllRanges();
  }, [contextMenu]);

  // Close context menu on click elsewhere
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

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
        {/* Stats Bar + Trash + Search */}
        <div className="w-full px-6 py-2 flex items-center gap-2 bg-[#FFF3EE] border-b border-[#CB9180]/10 flex-shrink-0 text-xs">
          {([
            { key: "all", label: `All (${stats.total})`, icon: "" },
            { key: "ai", label: `AI (${stats.aiGenerated})`, icon: "🤖" },
            { key: "edited", label: `Edited (${stats.userEdited})`, icon: "✏️" },
            { key: "locked", label: `Locked (${stats.locked})`, icon: "🔒" },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(activeFilter === key ? "all" : key)}
              className={`px-2.5 py-1 rounded-full transition-all ${
                activeFilter === key
                  ? "bg-[#CB9180] text-white font-medium shadow-sm"
                  : "text-[#8B5E4B] hover:bg-[#CB9180]/10"
              }`}
            >
              {icon} {label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={trashedCard}
              className="h-7 rounded-lg !text-deepbg !bg-white/80 text-[11px] px-2.5 border border-gray-200"
            >
              <img src={logoTrash} alt="" className="w-3.5 h-3.5 mr-1" />
              Trash
            </Button>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="h-7 w-36 pl-7 pr-2 border border-gray-200 rounded-lg text-[11px] outline-none focus:border-[#CB9180] bg-white/80"
              />
            </div>
          </div>
        </div>

        <div className="w-full flex-1 flex flex-row overflow-hidden">
          {/* Editor Section */}
          {viewMode === "split" && (
            <div
              className="border-r h-full overflow-y-auto scrollbar-thin w-[60%]"
              onContextMenu={handleEditorContextMenu}
            >
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

      {/* Right-click context menu for adding code */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleAddCodeFromSelection}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[#FFF3EE] text-[#8B5E4B] flex items-center gap-2"
          >
            <span>➕</span>
            <span>Add as New Code</span>
          </button>
          <div className="px-3 py-1 text-[10px] text-gray-400 border-t border-gray-100 mt-1 truncate max-w-[250px]">
            "{contextMenu.text.length > 60 ? contextMenu.text.slice(0, 60) + "..." : contextMenu.text}"
          </div>
        </div>
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
