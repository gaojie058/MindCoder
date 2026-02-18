import { useState, useRef, useEffect, useMemo } from "react";
import CodeLabelReadonly from "@/pages/reconstruction/CodeLabelReadonly";
import Code from "./Code";
import AddCode from "./AddCode";
import useCodeStore from "@/stores/useCodeStore";
import useCardStore from "@/stores/useCardStore";
import { card } from "@/types/stores";

export default function Labeling() {
  const { codeData } = useCodeStore();
  const { cardData } = useCardStore();
  const [show, setShow] = useState(false);
  const [drawerOpenCodes, setDrawerOpenCodes] = useState<
    Record<string, card[]>
  >({});

  const [tempSelectedCards, setTempSelectedCards] = useState<
    Record<string, string[]>
  >({});
  const [selectedCards, setSelectedCards] = useState<card[]>([]);

  const [unselectedCards, setUnselectedCards] = useState<card[]>([]);

  // Add cards in the new code
  const [addCards, setAddCards] = useState<card[]>([]);

  // States of the drag box
  const [topHeight, setTopHeight] = useState(300); // Increased initial height
  const [dragging, setDragging] = useState(false);
  const dragBoxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const topContainerRef = useRef<HTMLDivElement>(null);
  const bottomContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize unselected cards
    const selectedCardIds = new Set<string>();

    try {
      if (Array.isArray(codeData)) {
        codeData.forEach((code) => {
          if (code && code.data) {
            Object.keys(code.data).forEach((cardId) => {
              selectedCardIds.add(cardId);
            });
          }
        });
      }
    } catch (error) {
      console.error("Error processing codeData:", error);
      // Continue with empty selection set
    }

    try {
      const initialUnselectedCards = cardData.filter(
        (card) => !selectedCardIds.has(card.id)
      );
      // console.log("initial selected cards:",selectedCardIds);
      // console.log("initial unselected cards:",initialUnselectedCards);
      setUnselectedCards(initialUnselectedCards);
    } catch (error) {
      console.error("Error filtering unselected cards:", error);
      setUnselectedCards([]);
    }
  }, [codeData, cardData]);

  // Toggle card selection
  const handleTempCardToggle = (
    codeId: string,
    cardId: string,
    selected: boolean
  ) => {
    setTempSelectedCards((prevTempCards) => {
      const newTempCards = { ...prevTempCards };

      if (!newTempCards[codeId]) {
        newTempCards[codeId] = [];
      }

      if (selected) {
        if (!newTempCards[codeId].includes(cardId)) {
          newTempCards[codeId].push(cardId);
        }
      } else {
        newTempCards[codeId] = newTempCards[codeId].filter(
          (id) => id !== cardId
        );
      }

      return newTempCards;
    });

    setDrawerOpenCodes((prevDrawerOpenCodes) => {
      const newDrawerOpenCodes = { ...prevDrawerOpenCodes };

      if (selected) {
        if (!newDrawerOpenCodes[codeId]) {
          newDrawerOpenCodes[codeId] = [];
        }
        const selectedCard = cardData.find((card) => card.id === cardId);
        if (
          selectedCard &&
          !newDrawerOpenCodes[codeId].some((card) => card.id === cardId)
        ) {
          newDrawerOpenCodes[codeId].push(selectedCard);
        }
      } else {
        if (newDrawerOpenCodes[codeId]) {
          newDrawerOpenCodes[codeId] = newDrawerOpenCodes[codeId].filter(
            (card) => card.id !== cardId
          );
        }
      }

      return newDrawerOpenCodes;
    });

    setSelectedCards((prevSelectedCards) => {
      if (selected) {
        const selectedCard = cardData.find((card) => card.id === cardId);
        return selectedCard
          ? [...prevSelectedCards, selectedCard]
          : prevSelectedCards;
      } else {
        return prevSelectedCards.filter((card) => card.id !== cardId);
      }
    });

    setUnselectedCards((prevUnselectedCards) => {
      if (selected) {
        return prevUnselectedCards.filter((card) => card.id !== cardId);
      } else {
        const cardToReAdd = cardData.find((card) => card.id === cardId);
        return cardToReAdd &&
          !prevUnselectedCards.some((card) => card.id === cardId)
          ? [...prevUnselectedCards, cardToReAdd]
          : prevUnselectedCards;
      }
    });
  };

  // console.log("drawerOpenCodes:", drawerOpenCodes);
  // console.log("tempSelectedCards:", tempSelectedCards);

  const handleDrawerToggle = (
    open: boolean,
    selectedCardsData: Record<string, card[]>,
    codeId: string
  ) => {
    const cardsForThisCode = selectedCardsData[codeId]
      ? [...selectedCardsData[codeId]]
      : [];

    setDrawerOpenCodes((prevDrawerOpenCodes) => {
      const newDrawerOpenCodes = { ...prevDrawerOpenCodes };

      if (open) {
        newDrawerOpenCodes[codeId] = cardsForThisCode;
      } else {
        delete newDrawerOpenCodes[codeId];

        // Clean up any temp selections
        setTempSelectedCards((prevTempCards) => {
          const newTempCards = { ...prevTempCards };
          delete newTempCards[codeId];
          return newTempCards;
        });
      }

      return newDrawerOpenCodes;
    });
  };

  // Add new code
  const handleAddCardToggle = (card: card | null) => {
    if (card === null) {
      setDrawerOpenCodes({});
      setAddCards([]);
    } else {
      setAddCards((prevAddCards) => {
        if (prevAddCards.some((c) => c.id === card.id)) {
          return prevAddCards.filter((c) => c.id !== card.id);
        } else {
          return [...prevAddCards, card];
        }
      });

      setDrawerOpenCodes((prevDrawerOpenCodes) => {
        const newDrawerOpenCodes = { ...prevDrawerOpenCodes };
        newDrawerOpenCodes.new_code = newDrawerOpenCodes.new_code || [];
        if (!newDrawerOpenCodes.new_code.some((c) => c.id === card.id)) {
          newDrawerOpenCodes.new_code.push(card);
        }
        return newDrawerOpenCodes;
      });
    }
  };

  const revealAddCode = () => setShow(true);

  const [summaryOpen, setSummaryOpen] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = Array.isArray(codeData) ? codeData.length : 0;
    const aiGenerated = Array.isArray(codeData) ? codeData.filter(c => c.isGPT === true).length : 0;
    const userEdited = total - aiGenerated;

    // Per-file stats: count how many codes reference each card
    const perFile: Record<string, { name: string; codeCount: number; aiCount: number }> = {};
    if (Array.isArray(cardData)) {
      cardData.forEach(card => {
        perFile[card.id] = { name: card.name || card.id, codeCount: 0, aiCount: 0 };
      });
    }
    if (Array.isArray(codeData)) {
      codeData.forEach(code => {
        if (code && code.data) {
          Object.keys(code.data).forEach(cardId => {
            if (perFile[cardId]) {
              perFile[cardId].codeCount++;
              if (code.isGPT) perFile[cardId].aiCount++;
            }
          });
        }
      });
    }

    return { total, aiGenerated, userEdited, perFile };
  }, [codeData, cardData]);

  // Delete code
  useEffect(() => {
    // Initialize unselected cards
    const selectedCardIds = new Set<string>();

    try {
      if (Array.isArray(codeData)) {
        codeData.forEach((code) => {
          if (code && code.data) {
            Object.keys(code.data).forEach((cardId) => {
              selectedCardIds.add(cardId);
            });
          }
        });
      }
    } catch (error) {
      console.error("Error processing codeData for deletion:", error);
      // Continue with empty selection set
    }

    try {
      // Initialize selected cards based on what's in the code data
      const initialSelectedCards = cardData.filter((card) =>
        selectedCardIds.has(card.id)
      );
      setSelectedCards(initialSelectedCards);
    } catch (error) {
      console.error("Error setting selected cards:", error);
      setSelectedCards([]);
    }
  }, [codeData, cardData]);

  // Drag box
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging && dragBoxRef.current && dragRef.current) {
        const dragBoxRect = dragBoxRef.current.getBoundingClientRect();
        const moveLen = e.clientY - dragBoxRect.top;
        const maxT = dragBoxRect.height - dragRef.current.offsetHeight;

        let newHeight = moveLen;
        if (newHeight < 100) newHeight = 100; // Adjust the minimum height
        if (newHeight > maxT - 100) newHeight = maxT - 100; // Adjust the maximum height

        setTopHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    if (dragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  const handleMouseDown = () => {
    setDragging(true);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between items-center overflow-auto bg-[#FFFBF9]">
      {/* Stats Bar */}
      <div className="w-full px-8 py-2 flex items-center gap-4 bg-[#FFF3EE] border-b border-[#CB9180]/10 flex-shrink-0 text-xs">
        <span className="text-[#8B5E4B] font-medium">Total: {stats.total}</span>
        <span className="text-[#CB9180]">•</span>
        <span className="text-[#CB9180]">🤖 AI-generated: {stats.aiGenerated}</span>
        <span className="text-[#CB9180]">•</span>
        <span className="text-[#8B5E4B]">✏️ User edited: {stats.userEdited}</span>
        <button
          className="ml-auto text-[#CB9180] hover:text-[#8B5E4B] transition-colors text-xs underline"
          onClick={() => setSummaryOpen(!summaryOpen)}
        >
          {summaryOpen ? "Hide" : "Show"} per-file summary
        </button>
      </div>
      {/* Per-file Summary Panel */}
      {summaryOpen && (
        <div className="w-full px-8 py-3 bg-[#FFFBF9] border-b border-[#CB9180]/10 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            {Object.entries(stats.perFile)
              .filter(([, v]) => v.codeCount > 0)
              .map(([id, v]) => (
                <div key={id} className="bg-white rounded-lg p-2 border border-[#CB9180]/15 shadow-sm">
                  <div className="font-medium text-[#8B5E4B] truncate">{v.name}</div>
                  <div className="text-gray-500 mt-0.5">
                    {v.codeCount} codes ({v.aiCount} AI, {v.codeCount - v.aiCount} user)
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      <div className="px-6 pt-6 pb-6 w-full flex-1 flex overflow-auto gap-4">
        <div className="flex-1 flex flex-col overflow-auto scrollbar-thin">
          <div className="flex flex-col gap-4">
            <div
              className="w-full py-3 text-sm text-[#C66B50] flex items-center justify-center shadow-md rounded-xl border hover:-translate-y-[1px] hover:shadow-lg transition-all cursor-pointer"
              onClick={revealAddCode}
            >
              + Add New Sub-theme
            </div>
            {show && (
              <AddCode setShow={setShow} onCardToggle={handleAddCardToggle} />
            )}
            {Array.isArray(codeData) &&
              codeData
                .slice() // Make a copy of the array
                .sort((a, b) => parseInt(b.id) - parseInt(a.id))
                .map((code) => (
                  <div key={code.nanoid} className="flex-shrink-0">
                    <Code
                      {...code}
                      onDrawerToggle={(open, selectedCardsData) =>
                        handleDrawerToggle(open, selectedCardsData, code.id)
                      }
                      onTempCardToggle={handleTempCardToggle}
                      setDefinition={(definition: string) => {
                        const updatedCodes = codeData.map((codeItem) =>
                          codeItem.id === code.id
                            ? { ...codeItem, definition, isGPT: false }
                            : codeItem
                        );
                        useCodeStore.setState({ codeData: updatedCodes });
                      }}
                    />
                  </div>
                ))}
          </div>
        </div>
        <div
          ref={dragBoxRef}
          className="flex-shrink-0 ml-4 h-full flex flex-col w-[320px] lg:max-w-[380px] 2xl:max-w-[430px] border-l border-gray-100 pl-4 pt-2"
        >
          <div
            ref={topContainerRef}
            className="flex-grow-0 overflow-auto items-center scrollbar-thin"
            style={{ height: `${topHeight}px` }}
          >
            {Object.values(drawerOpenCodes).flat().length > 0 ? (
              <>
                <div className="min-w-[300px] text-[#C66B50] font-semibold rounded-lg font-zen text-center p-4">
                  Open codes added
                </div>
                {Object.values(drawerOpenCodes)
                  .flat()
                  .map((card, index) => (
                    <CodeLabelReadonly key={index} id={card.id} name={card.name} topics={card.topics} isGPT={card.isGPT} colorIndex={index} />
                  ))}
              </>
            ) : (
              <div className="min-w-[300px] w-full h-full rounded-lg font-zen text-[#C66B50] font-semibold text-center p-4">
                Click on any code to check details
              </div>
            )}
          </div>

          <div
            ref={dragRef}
            className="flex items-center justify-center bg-gray-300 cursor-row-resize"
            style={{
              margin: "10px",
              width: "100%",
              height: "10px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              display: "flex",
              borderRadius: "5px",
              position: "relative",
            }}
            onMouseDown={handleMouseDown}
          >
            <div
              style={{
                width: "30px",
                height: "5px",
                backgroundColor: "#444",
                margin: "3px 0",
              }}
            ></div>
          </div>
          <div
            ref={bottomContainerRef}
            className="flex-grow-0 overflow-auto scrollbar-thin"
          >
            {unselectedCards.length === 0 ? (
              <div className="min-w-[300px] text-[#C66B50] font-semibold w-full h-full rounded-lg font-zen text-center p-4">
                No open code left
              </div>
            ) : (
              <div>
                <div className="min-w-[300px] text-[#C66B50] font-semibold rounded-lg font-zen text-center p-4">
                  Open codes left
                </div>
                {unselectedCards.map((card, index) => (
                  <CodeLabelReadonly key={index} id={card.id} name={card.name} topics={card.topics} isGPT={card.isGPT} colorIndex={index} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
