import { useState, useRef, useEffect, useCallback } from "react";
import Report from "./Report";
import Trajectory from "./Trajectory";
import ThemeMap from "./ThemeMap";
import useDisplayStore from "@/stores/useDisplayStore";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Dialog from "@/components/ui/Dialog";
import Card from "../reconstruction/Card";
import useConceptStore from "@/stores/useConceptStore";
import { concept, code, card } from "@/types/stores";
import useCodeStore from "@/stores/useCodeStore";
import { useGenerate } from "@/api/useGenerate";

const Visualize = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  // const [selectedLevel, setSelectedLevel] = useState<
  //   "all" | "concepts" | "codes"
  // >("all");
  const [visibleNodes, setVisibleNodes] = useState<string[]>([]);
  // const [conceptNodes, setConceptNodes] = useState<string[]>([]);
  // const [codeNodes, setCodeNodes] = useState<string[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeGraphType, setActiveGraphType] = useState<string>("mindmap");
  const [activeTab, setActiveTab] = useState<"trajectory" | "report" | "map">("map");

  const [activeType, setActiveType] = useState<
    "Concept" | "Card" | "Code" | ""
  >("");

  const [activeId, setActiveId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const containerRef = useRef();
  const { codeData } = useCodeStore();
  // graph no longer needed
  const { generatePDF, pdfLoading } = useGenerate();

  const handleExportPDF = useCallback(async () => {
    if (generatePDF) {
      await generatePDF(activeGraphType);
    }
  }, [generatePDF, activeGraphType]);

  const handleNodesExtracted = (nodes: {
    conceptNodes: string[];
    codeNodes: string[];
  }) => {
    // setConceptNodes(nodes.conceptNodes);
    // setCodeNodes(nodes.codeNodes);
    setVisibleNodes([...nodes.conceptNodes, ...nodes.codeNodes]);
  };

  const handleClose = () => {
    gsap.to(containerRef.current, {
      duration: 0.5,
      x: 800,
      scale: 0,
      opacity: 0,
      onComplete: () => {
        setIsDialogOpen(false);
        // Wait a bit before resetting the state to avoid flicker
        setTimeout(() => {
          setActiveId(null);
          setActiveType("");
        }, 100);
      },
    });
  };

  // Watch for changes in activeId and activeType to open dialog
  useEffect(() => {
    if (activeId && activeType) {
      setIsDialogOpen(true);
    }
  }, [activeId, activeType]);

  useGSAP(() => {
    if (isFullScreen) {
      gsap.from("#report", {
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scale: 0.2,
        transformOrigin: "left top",
      });
    }

    if (activeId && activeType && isDialogOpen) {
      gsap.from(containerRef.current, {
        x: 800,
        scale: 0,
        opacity: 0,
        ease: "back.out",
        duration: 0.5,
      });
    }
  }, [isFullScreen, activeId, activeType, isDialogOpen]);

  useEffect(() => {
    useDisplayStore.getState().set({ activeGraphType });
  }, [activeGraphType]);

  // Graph is no longer generated (ThemeMap replaces it), so only check report
  const { report } = useDisplayStore();
  if (!report) {
    return <div>Loading...</div>;
  }

  // Get data from concept store
  function filterConceptData() {
    const conceptStore = useConceptStore.getState().conceptData;
    return conceptStore.map((conceptItem: concept) => ({
      id: conceptItem.id,
      name: conceptItem.name,
      definition: conceptItem.definition,
      codes: conceptItem.codes,
    }));
  }

  const conceptData = filterConceptData();

  const formattedConceptData = conceptData.map(
    (conceptItem: Partial<concept>) => {
      const { id, name, definition, codes } = conceptItem;

      const formattedCodes = Object.keys(codes || {})
        .map((codeKey) => {
          const codeItems = codes![codeKey];
          return codeItems.map((code: code) => ({
            id: code.id,
            name: code.name,
            color: code.color,
            cards: Object.values(code.data || {}).flatMap((cards: card[]) =>
              cards.map((card: card) => ({
                id: card.id,
                name: card.name,
                cards: card.topics,
              }))
            ),
          }));
        })
        .flat();

      return {
        id: String(id),
        name,
        definition,
        codes: formattedCodes,
      };
    }
  );

  return (
    <>
      <div className="w-full h-full flex-1 flex flex-col overflow-auto bg-[#FFFBF9]">
        {/* Tab Bar */}
        <div className="w-full px-6 py-2 flex items-center justify-between bg-[#FFF3EE] border-b border-[#CB9180]/10 flex-shrink-0">
          <div className="flex items-center gap-1 bg-white/60 rounded-lg p-0.5">
            {([
              { key: "map", label: "🗺️ Map", disabled: false },
              { key: "report", label: "📊 Findings (unavailable)", disabled: true },
            ] as const).map(({ key, label, disabled }) => (
              <button
                key={key}
                onClick={() => !disabled && setActiveTab(key as "report" | "map")}
                disabled={disabled}
                title={disabled ? "Coming soon" : undefined}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  disabled
                    ? "text-[#B89A8E] cursor-not-allowed opacity-60"
                    : activeTab === key
                    ? "bg-[#CB9180] text-white shadow-sm"
                    : "text-[#8B5E4B] hover:bg-[#CB9180]/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("trajectory")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "trajectory"
                  ? "bg-[#CB9180] text-white"
                  : "bg-white/80 text-[#8B5E4B] hover:bg-[#CB9180]/10 border border-gray-200"
              }`}
            >
              🔄 Iteration Trajectory
            </button>
            <button
              onClick={handleExportPDF}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C66B50] hover:bg-[#B55A40] disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {pdfLoading ? <>⏳ Generating...</> : <>📄 Export to PDF</>}
            </button>
          </div>
        </div>
        {activeTab === "trajectory" ? (
          <div className="flex-1 overflow-hidden">
            <Trajectory />
          </div>
        ) : activeTab === "report" ? (
          <div className="flex-1 overflow-auto scrollbar-thin">
            <Report
              isFullScreen={isFullScreen}
              setIsFullScreen={setIsFullScreen}
              setActiveId={setActiveId}
              setActiveType={setActiveType}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ThemeMap />
          </div>
        )}
      </div>
      {activeType && activeId && isDialogOpen && (
        <Dialog onClose={handleClose}>
          <div
            ref={containerRef}
            className="relative bg-transparent rounded-lg p-6"
          >
            {activeType === "Code" && (
              <div className="mt-4 max-h-[70vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="list-disc ml-5 space-y-2">
                  {(codeData.find((code) => code.id === String(activeId))
                    ?.data &&
                    Object.values(
                      codeData.find((code) => code.id === String(activeId))
                        ?.data
                    )
                      .flat()
                      .map((card) => (
                        <Card
                          key={card.id}
                          id={card.id}
                          name={card.name}
                          topics={card.topics}
                          active={card.active}
                          isGPT={card.isGPT}
                        />
                      ))) || <li>No Cards Available</li>}
                </div>
              </div>
            )}

            {activeType === "Concept" && (
              <div className="mt-4 bg-white shadow-lg p-4 flex flex-col w-full max-w-md mx-auto my-auto max-h-[70vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-lg">
                <h3 className="text-lg font-bold mb-2">
                  {formattedConceptData.find(
                    (concept) => concept.id === String(activeId)
                  )?.name || "No Name Available"}
                </h3>
                <p className="mb-4">
                  {formattedConceptData.find(
                    (concept) => concept.id === String(activeId)
                  )?.definition || "No Data Available"}
                </p>
                <h4 className="font-semibold">Codes:</h4>
                <div className="space-y-2">
                  {formattedConceptData
                    .find((concept) => concept.id === String(activeId))
                    ?.codes?.map((code) => (
                      <div
                        key={code.id}
                        className="rounded-lg p-2"
                        style={{ backgroundColor: code.color || "#D9D9D9" }}
                      >
                        {code.name}
                      </div>
                    )) || <li>No Codes Available</li>}
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
};

export default Visualize;
