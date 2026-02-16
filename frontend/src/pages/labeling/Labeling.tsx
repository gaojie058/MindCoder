import { useState, useRef, useEffect } from "react";
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
      {/* Step Header */}
      <div className="w-full bg-gradient-to-r from-[#CB9180]/10 to-[#D39C83]/5 border-b border-[#CB9180]/15 px-8 py-3 flex-shrink-0">
        <h2 className="text-lg font-semibold font-zen text-[#8B5E4B]">
          <span className="text-[#CB9180] mr-2">Step 2</span>Sub-themes
        </h2>
        <p className="text-xs text-gray-500 font-zen mt-0.5">Group open codes into sub-themes that share high-level overlap</p>
      </div>
      <div className="px-6 pt-4 pb-6 w-full flex-1 flex overflow-auto gap-4">
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
          className="flex-shrink-0 ml-7 h-full flex flex-col w-[320px] lg:max-w-[380px] 2xl:max-w-[430px]"
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
