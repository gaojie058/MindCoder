import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import Button from "@/components/ui/Button";
import logoTrash from "@/assets/icon/trash.png";
import CodeLabel from "./CodeLabel";
import { useNavigate, useParams } from "react-router-dom";
import useCardStore from "@/stores/useCardStore";
import useEditorStore from "@/stores/useEditorStore";
import { card } from "@/types/stores";
import { nanoid } from "nanoid";
import { CODE_COLORS } from "@/utils/codeColors";
import LexicalEditor from "./LexicalPlugins/LexicalEditor";

// ── Shared context for split panels ──────────────────────────────
interface CardAreaContextValue {
  activeCodes: card[];
  filteredCodes: card[];
  selectedCodeId: string | null;
  handleSelect: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFilter: "all" | "ai" | "edited" | "locked";
  setActiveFilter: (f: "all" | "ai" | "edited" | "locked") => void;
  stats: { total: number; aiGenerated: number; userEdited: number; locked: number };
  editorInitialized: boolean;
  editorReady: boolean;
  setEditorReady: (v: boolean) => void;
  contextMenu: { x: number; y: number; text: string } | null;
  setContextMenu: (v: { x: number; y: number; text: string } | null) => void;
  handleEditorContextMenu: (e: React.MouseEvent) => void;
  handleAddCodeFromSelection: () => void;
}

const CardAreaContext = createContext<CardAreaContextValue | null>(null);

function useCardAreaContext() {
  const ctx = useContext(CardAreaContext);
  if (!ctx) throw new Error("useCardAreaContext must be used within CardAreaProvider");
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────
export function CardAreaProvider({ children }: { children: React.ReactNode }) {
  const { cardData, getCardsForFile } = useCardStore();
  const { selectedFile } = useEditorStore();

  const [editorReady, setEditorReady] = useState(false);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "ai" | "edited" | "locked">("all");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!editorInitialized) setEditorInitialized(true);
  }, [editorInitialized]);

  const allActiveCodes = cardData.filter((card) => card.active);
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

  const stats = useMemo(() => {
    const total = activeCodes.length;
    const aiGenerated = activeCodes.filter(c => c.isGPT === true).length;
    const locked = activeCodes.filter(c => lockedCardIds.has(c.id)).length;
    return { total, aiGenerated, userEdited: total - aiGenerated, locked };
  }, [activeCodes, lockedCardIds]);

  const filteredCodes = useMemo(() => {
    let codes = activeCodes;
    if (activeFilter === "ai") codes = codes.filter(c => c.isGPT === true && !lockedCardIds.has(c.id));
    else if (activeFilter === "edited") codes = codes.filter(c => c.isGPT === false);
    else if (activeFilter === "locked") codes = codes.filter(c => lockedCardIds.has(c.id));
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
    const currentCards = useCardStore.getState().cardData;
    const currentSelectedFile = useEditorStore.getState().selectedFile;
    const newId = String(Math.max(0, ...currentCards.map(c => parseInt(c.id) || 0)) + 1);
    const fileCodeNum = activeCodes.length + 1;
    const colorIndex = activeCodes.length;
    const color = CODE_COLORS[colorIndex % CODE_COLORS.length];

    const newCard: card = {
      id: newId,
      name: `Code ${fileCodeNum}`,
      topics: [{ id: "1", content: contextMenu.text, uuid: nanoid() }],
      active: true,
      isGPT: false,
    };

    useCardStore.getState().setCardData([...currentCards, newCard]);
    if (currentSelectedFile) {
      const updatedMap = { ...useCardStore.getState().fileCardMap };
      updatedMap[currentSelectedFile] = [...(updatedMap[currentSelectedFile] || []), newId];
      useCardStore.setState({ fileCardMap: updatedMap });
    }
    setSelectedCodeId(newId);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("selectCodeInEditor", {
          detail: { codeId: newId, color: color.bg, newCardText: contextMenu.text },
        })
      );
      const el = document.querySelector(`[data-code-id="${newId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    setContextMenu(null);
    window.getSelection()?.removeAllRanges();
  }, [contextMenu, activeCodes]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  const value: CardAreaContextValue = {
    activeCodes, filteredCodes, selectedCodeId, handleSelect,
    searchQuery, setSearchQuery, activeFilter, setActiveFilter,
    stats, editorInitialized, editorReady, setEditorReady,
    contextMenu, setContextMenu, handleEditorContextMenu, handleAddCodeFromSelection,
  };

  return <CardAreaContext.Provider value={value}>{children}</CardAreaContext.Provider>;
}

// ── EditorPanel (center column) ──────────────────────────────────
export function EditorPanel() {
  const { editorInitialized, setEditorReady, handleEditorContextMenu, contextMenu, handleAddCodeFromSelection } = useCardAreaContext();

  return (
    <>
      <div className="w-full h-full overflow-y-auto scrollbar-thin" onContextMenu={handleEditorContextMenu}>
        {editorInitialized && (
          <LexicalEditor
            onHighlightReady={() => setEditorReady(true)}
            key="editor-instance"
          />
        )}
      </div>

      {/* Right-click context menu */}
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
    </>
  );
}

// ── CodesPanel (right column) ────────────────────────────────────
export function CodesPanel() {
  const navigate = useNavigate();
  const { project, step } = useParams();
  const { selectedFile } = useEditorStore();
  const {
    activeCodes, filteredCodes, selectedCodeId, handleSelect,
    searchQuery, setSearchQuery, activeFilter, setActiveFilter, stats,
  } = useCardAreaContext();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const trashedCard = () => navigate(`/reconstruction/${project}/${step}/trash`);

  return (
    <div className="h-full flex flex-col bg-[#FFFBF9]">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#CB9180]/10 bg-[#FFF3EE] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#CB9180] uppercase tracking-wider">
            Open Codes {selectedFile && <span className="text-[10px] font-normal text-[#CB9180]/60">— {selectedFile}</span>}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
              className="text-[11px] text-gray-400 hover:text-[#CB9180] transition-colors flex items-center gap-1"
            >
              {viewMode === "list" ? "⊞ Expand" : "☰ List"}
            </button>
            <Button
              onClick={trashedCard}
              className="h-7 rounded-lg !text-deepbg !bg-white/80 text-[11px] px-2.5 border border-gray-200"
            >
              <img src={logoTrash} alt="" className="w-3.5 h-3.5 mr-1" />
              Trash
            </Button>
          </div>
        </div>
        {/* Filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { key: "all", label: `All (${stats.total})`, icon: "" },
            { key: "ai", label: `AI (${stats.aiGenerated})`, icon: "🤖" },
            { key: "edited", label: `Edited (${stats.userEdited})`, icon: "✏️" },
            { key: "locked", label: `Locked (${stats.locked})`, icon: "🔒" },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(activeFilter === key ? "all" : key)}
              className={`px-2.5 py-1 rounded-full transition-all text-xs ${
                activeFilter === key
                  ? "bg-[#CB9180] text-white font-medium shadow-sm"
                  : "text-[#8B5E4B] hover:bg-[#CB9180]/10"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative mt-2">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search codes..."
            className="h-7 w-full pl-7 pr-2 border border-gray-200 rounded-lg text-[11px] outline-none focus:border-[#CB9180] bg-white/80"
          />
        </div>
      </div>

      {/* Code cards list */}
      <div className="flex-1 overflow-auto scrollbar-thin px-3 py-3">
        <div className={viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-0.5"}>
          {filteredCodes.map((card, index) => {
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
  );
}

// ── Default export (backward compat) ─────────────────────────────
export default function CardArea() {
  return (
    <CardAreaProvider>
      <div className="w-full h-full flex flex-col bg-[#FFFBF9]">
        <div className="w-full flex-1 flex flex-row overflow-hidden">
          <div className="border-r h-full overflow-y-auto scrollbar-thin w-[60%]">
            <EditorPanel />
          </div>
          <div className="h-full overflow-auto scrollbar-thin w-[40%]">
            <CodesPanel />
          </div>
        </div>
      </div>

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
    </CardAreaProvider>
  );
}
