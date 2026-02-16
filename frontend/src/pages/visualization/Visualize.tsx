import { useState, useRef, useEffect, useCallback } from "react";
import Display from "./Display";
import Report from "./Report";
import useDisplayStore from "@/stores/useDisplayStore";
import useHistoryStore from "@/stores/useHistoryStore";
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

  const [activeType, setActiveType] = useState<
    "Concept" | "Card" | "Code" | ""
  >("");

  const [activeId, setActiveId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const containerRef = useRef();
  const { codeData } = useCodeStore();
  const { graph, report } = useDisplayStore();
  const { generatePDF, pdfLoading } = useGenerate();

  const openPdfInNewTab = useCallback((entry: any) => {
    const binaryString = window.atob(
      entry.pdfData.replace(/^data:application\/pdf;base64,/, "")
    );
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, []);

  const handleViewPDF = useCallback(async () => {
    const { history } = useHistoryStore.getState();
    if (history.length > 0 && history[0].pdfData) {
      openPdfInNewTab(history[0]);
    } else if (generatePDF) {
      await generatePDF(activeGraphType);
      const { history: updatedHistory } = useHistoryStore.getState();
      if (updatedHistory.length > 0 && updatedHistory[0].pdfData) {
        openPdfInNewTab(updatedHistory[0]);
      }
    }
  }, [generatePDF, activeGraphType, openPdfInNewTab]);

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

  if (!graph || !graph.dot) {
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
        {/* Step Header */}
        <div className="w-full bg-gradient-to-r from-[#CB9180]/10 to-[#D39C83]/5 border-b border-[#CB9180]/15 px-6 py-3 flex-shrink-0">
          <h2 className="text-lg font-semibold font-zen text-[#8B5E4B]">
            <span className="text-[#CB9180] mr-2">Step 4</span>Visualization
          </h2>
          <p className="text-xs text-gray-500 font-zen mt-0.5">Key finding summary and theme map</p>
        </div>
        {/* PDF Button Bar */}
        <div className="w-full px-6 py-2 flex items-center bg-[#FFF3EE] border-b border-[#CB9180]/10 flex-shrink-0">
          <button
            onClick={handleViewPDF}
            disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#C66B50] hover:bg-[#B55A40] disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {pdfLoading ? (
              <>⏳ Generating PDF...</>
            ) : (
              <>📄 View Report PDF</>
            )}
          </button>
        </div>
        {!isFullScreen ? (
          <div className="justify-between items-center flex flex-row flex-1 overflow-hidden">
            <div className="flex flex-col w-[40%] h-full gap-2">
              <div className="h-full overflow-auto scrollbar-thin">
                <Report
                  isFullScreen={isFullScreen}
                  setIsFullScreen={setIsFullScreen}
                  setActiveId={setActiveId}
                  setActiveType={setActiveType}
                />
              </div>
            </div>
            <div className="w-[60%] h-full">
              <Display
                selectedNode={selectedNode}
                visibleNodes={visibleNodes}
                onNodesExtracted={handleNodesExtracted}
                onGraphTypeChange={setActiveGraphType}
                activeGraphType={activeGraphType}
              />
            </div>
          </div>
        ) : (
          <Report
            isFullScreen={isFullScreen}
            setIsFullScreen={setIsFullScreen}
            setActiveId={setActiveId}
            setActiveType={setActiveType}
          />
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
