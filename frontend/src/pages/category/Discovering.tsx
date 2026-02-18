import Concept from "./Concepts";
import AddConcept from "./AddConcept";
import { useState, useRef, useEffect } from "react";
import useCodeStore from "@/stores/useCodeStore";
import useConceptStore from "@/stores/useConceptStore";
import { code, card } from "@/types/stores";
import CodeLabelReadonly from "@/pages/reconstruction/CodeLabelReadonly";
import Dialog from "@/components/ui/Dialog";

export default function Discover() {
  const { codeData } = useCodeStore();
  const { conceptData } = useConceptStore();
  const [show, setShow] = useState(false);
  const [drawerOpenConcepts, setDrawerOpenConcepts] = useState<
    Record<string, code[]>
  >({});
  const [temSelectedCodes, setTempSelectedCodes] = useState<
    Record<string, string[]>
  >({});

  const [selectedCodes, setSelectedCodes] = useState<code[]>([]);

  const [unselectedCodes, setUnselectedCodes] = useState<code[]>([]);

  const [selectedCards, setSelectedCards] = useState<card[] | null>(null);

  const [showDialog, setShowDialog] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Add code in the new concept
  const [addCodes, setAddCodes] = useState<code[]>([]);

  // console.log("ConceptData:", conceptData);
  // States of dragging
  const [topHeight, setTopHeight] = useState(70);
  const [dragging, setDragging] = useState(false);
  const dragBoxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const topContainerRef = useRef<HTMLDivElement>(null);
  const bottomContainerRef = useRef<HTMLDivElement>(null);

  // Initialize unselected codes
  useEffect(() => {
    const selectedCodeIds = new Set<string>();

    conceptData.forEach((conceptItem) => {
      Object.keys(conceptItem.codes).forEach((codeId) => {
        selectedCodeIds.add(codeId);
      });
    });

    const initialUnselectedCodes = codeData.filter(
      (code) => !selectedCodeIds.has(code.id)
    );

    setUnselectedCodes(initialUnselectedCodes);
  }, [conceptData, codeData]);

  // Toggle code selection
  const handleTempCodeToggle = (
    conceptId: string,
    codeId: string,
    selected: boolean
  ) => {
    console.log(
      `Toggling code ${codeId} for concept ${conceptId}, selected: ${selected}`
    );

    setTempSelectedCodes((prevTempCodes) => {
      const newTempCodes = { ...prevTempCodes };

      if (!newTempCodes[conceptId]) {
        newTempCodes[conceptId] = [];
      }

      if (selected) {
        if (!newTempCodes[conceptId].includes(codeId)) {
          newTempCodes[conceptId].push(codeId);
        }
      } else {
        newTempCodes[conceptId] = newTempCodes[conceptId].filter(
          (id) => id !== codeId
        );
      }
      console.log("Updated TempSelectedCodes:", newTempCodes);
      return newTempCodes;
    });

    setDrawerOpenConcepts((prevDrawerOpenConcepts) => {
      const newDrawerOpenConcept = { ...prevDrawerOpenConcepts };

      if (selected) {
        if (!newDrawerOpenConcept[conceptId]) {
          newDrawerOpenConcept[conceptId] = [];
        }
        const selectedCode = codeData.find((code) => code.id === codeId);
        if (
          selectedCode &&
          !newDrawerOpenConcept[conceptId].some((code) => code.id === codeId)
        ) {
          newDrawerOpenConcept[conceptId].push(selectedCode);
        }
      } else {
        if (newDrawerOpenConcept[conceptId]) {
          newDrawerOpenConcept[conceptId] = newDrawerOpenConcept[
            conceptId
          ].filter((code) => code.id !== codeId);
        }
      }
      console.log("Updated DrawerOpenConcepts:", newDrawerOpenConcept);
      return newDrawerOpenConcept;
    });

    setSelectedCodes((prevSelectedCodes) => {
      if (selected) {
        const selectedCode = codeData.find((code) => code.id === codeId);
        return selectedCode
          ? [...prevSelectedCodes, selectedCode]
          : prevSelectedCodes;
      } else {
        return prevSelectedCodes.filter((code) => code.id !== codeId);
      }
    });

    setUnselectedCodes((prevUnselectedCodes) => {
      if (selected) {
        return prevUnselectedCodes.filter((code) => code.id !== codeId);
      } else {
        const codeToReAdd = codeData.find((code) => code.id === codeId);
        return codeToReAdd &&
          !prevUnselectedCodes.some((code) => code.id === codeId)
          ? [...prevUnselectedCodes, codeToReAdd]
          : prevUnselectedCodes;
      }
    });
  };

  const handleCodeItemClick = (codeId: string) => {
    const selectedCode = codeData.find((c) => c.id === codeId);
    if (selectedCode) {
      const allCardsData = Object.values(selectedCode.data).flat();

      if (allCardsData.length > 0) {
        setSelectedCards(allCardsData);
        setShowDialog(true);
      }
    }
  };

  const handleUnselectedCodeItemClick = (codeId: string) => {
    const selectedCode = unselectedCodes.find((c) => c.id === codeId);
    if (selectedCode) {
      const allCardsData = Object.values(selectedCode.data).flat();

      if (allCardsData.length > 0) {
        setSelectedCards(allCardsData);
        setShowDialog(true);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        setShowDialog(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDrawerToggle = (
    open: boolean,
    selectedCodeData: Record<string, code[]>,
    conceptId: string
  ) => {
    setDrawerOpenConcepts((prevDrawerOpenConcepts) => {
      const newDrawerOpenConcepts = { ...prevDrawerOpenConcepts };
      if (open) {
        newDrawerOpenConcepts[conceptId] = selectedCodeData[conceptId] || [];
      } else {
        delete newDrawerOpenConcepts[conceptId];

        setTempSelectedCodes((prevTempCodes) => {
          const newTempCodes = { ...prevTempCodes };
          delete newTempCodes[conceptId];
          return newTempCodes;
        });
      }
      return newDrawerOpenConcepts;
    });
  };
  // Add new concept
  const handleCodeToggle = (code: code) => {
    if (code === null) {
      setDrawerOpenConcepts({});
      setAddCodes([]);
    } else {
      setAddCodes((prevAddCodes) => {
        if (prevAddCodes.some((c) => c.id === code.id)) {
          return prevAddCodes.filter((c) => c.id !== code.id);
        } else {
          return [...prevAddCodes, code];
        }
      });
      setDrawerOpenConcepts((prevDrawerOpenConcepts) => {
        const newDrawerOpenConcepts = { ...prevDrawerOpenConcepts };
        newDrawerOpenConcepts.new_concept =
          newDrawerOpenConcepts.new_concept || [];
        if (!newDrawerOpenConcepts.new_concept.some((c) => c.id === code.id)) {
          newDrawerOpenConcepts.new_concept.push(code);
        }
        return newDrawerOpenConcepts;
      });
    }
  };

  const revealAddConcept = () => setShow(true);

  // Delete code
  useEffect(() => {
    // Initialize unselected cards
    const selectedConceptIds = new Set<string>();

    codeData.forEach((concept) => {
      Object.keys(concept.data).forEach((codeId) => {
        selectedConceptIds.add(codeId);
      });
    });

    const initialUnselectedCodes = codeData.filter(
      (code) => !selectedConceptIds.has(code.id)
    );

    setSelectedCodes(initialUnselectedCodes);
  }, [conceptData, codeData]);

  // useEffect(() => {
  //   console.log("ConceptData in discovering:", conceptData);
  //   console.log("CodeData in discovering:", codeData);

  //   const selectedCodeIds = new Set<string>();

  //   conceptData.forEach((conceptItem) => {
  //     Object.keys(conceptItem.codes).forEach((codeId) => {
  //       selectedCodeIds.add(codeId);
  //     });
  //   });

  //   const initialUnselectedCodes = codeData.filter(
  //     (code) => !selectedCodeIds.has(code.id)
  //   );

  //   console.log("Unselected Codes in discovering:", initialUnselectedCodes);

  //   setUnselectedCodes(initialUnselectedCodes);
  // }, [conceptData, codeData]);

  // Error handling
  const hasError = !Array.isArray(codeData) || !Array.isArray(conceptData);

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
      {/* Step description */}
      <div className="w-full px-8 py-2.5 bg-[#FFFBF9] border-b border-[#CB9180]/10 flex-shrink-0">
        <p className="text-sm text-[#8B5E4B] font-zen"><span className="font-semibold text-[#CB9180]">Themes</span> — Uncover patterns by grouping sub-themes into higher-level themes</p>
      </div>
      {/* Stats Bar */}
      <div className="w-full px-8 py-2 flex items-center gap-4 bg-[#FFF3EE] border-b border-[#CB9180]/10 flex-shrink-0 text-xs">
        <span className="text-[#8B5E4B] font-medium">Total: {Array.isArray(conceptData) ? conceptData.length : 0}</span>
        <span className="text-[#CB9180]">•</span>
        <span className="text-[#CB9180]">🤖 AI-generated: {Array.isArray(conceptData) ? conceptData.filter(c => c.isGPT === true).length : 0}</span>
        <span className="text-[#CB9180]">•</span>
        <span className="text-[#8B5E4B]">✏️ User edited: {Array.isArray(conceptData) ? conceptData.filter(c => c.isGPT !== true).length : 0}</span>
      </div>
      {hasError && (
        <div
          className="w-full p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg"
          role="alert"
        >
          <span className="font-medium">Error:</span> Concept data or code data
          is missing or not an array.
        </div>
      )}
      <div className="px-6 pt-6 pb-6 w-full flex-1 overflow-auto flex gap-4">
        <div className="flex-1 flex flex-col overflow-auto scrollbar-thin">
          <div className="flex flex-col gap-4">
            <div
              className="w-full py-3 text-sm text-[#C66B50] flex items-center justify-center shadow-md rounded-xl border hover:-translate-y-[1px] hover:shadow-lg transition-all cursor-pointer"
              onClick={revealAddConcept}
            >
              + Add New Theme
            </div>
            {show && (
              <AddConcept setShow={setShow} onCodeToggle={handleCodeToggle} />
            )}
            {Array.isArray(conceptData) &&
              conceptData
                .slice() // Make a copy of the array
                .sort((a, b) => parseInt(b.id) - parseInt(a.id))
                .map((concept) => (
                  <div key={concept.nanoid} className="flex-shrink-0">
                    <Concept
                      {...concept}
                      onDrawerToggle={(open, selectedCodesData) =>
                        handleDrawerToggle(open, selectedCodesData, concept.id)
                      }
                      onTempCodeToggle={handleTempCodeToggle}
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
            {Object.keys(drawerOpenConcepts).length > 0 ? (
              <div className="mt-4 flex flex-col">
                <h2 className="min-w-[300px] text-[#C66B50] font-semibold w-full h-full rounded-lg font-zen text-center">
                  Added sub-themes
                </h2>
                <div>
                  {Object.values(drawerOpenConcepts)
                    .flat()
                    .reduce((uniqueCodes, code) => {
                      if (!uniqueCodes.some((c) => c.id === code.id)) {
                        uniqueCodes.push(code);
                      }
                      return uniqueCodes;
                    }, [] as code[])
                    .map((code) => (
                      <div
                        key={code.nanoid}
                        style={{ backgroundColor: code.color }}
                        className="mt-2 h-auto lg:max-w-[340px] w-full 2xl:max-w-[430px] text-left p-2 justify-start rounded-lg text-black font-zen font-semibold text-sm flex cursor-pointer"
                        onClick={() => handleCodeItemClick(code.id)}
                      >
                        {code.name}
                      </div>
                    ))}
                </div>
                {showDialog && selectedCards.length > 0 && (
                  <div className="overflow-auto">
                    <Dialog className="relative z-50">
                      <div
                        className="w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle transition-all"
                        ref={dialogRef}
                      >
                        {selectedCards.map((card, index) => (
                          <CodeLabelReadonly key={index} id={card.id} name={card.name} topics={card.topics} isGPT={card.isGPT} colorIndex={index} />
                        ))}
                      </div>
                    </Dialog>
                  </div>
                )}
              </div>
            ) : (
              <div className="min-w-[300px] w-full h-full rounded-lg font-zen text-[#C66B50] font-semibold text-center p-4">
                No sub-themes selected
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
                height: "2px",
                backgroundColor: "#444",
                margin: "3px 0",
              }}
            ></div>
          </div>
          <div
            ref={bottomContainerRef}
            className="flex flex-col overflow-auto scrollbar-thin gap-3 flex-grow-0"
          >
            {unselectedCodes.length === 0 ? (
              <div className="min-w-[300px] text-[#C66B50] font-semibold w-full h-full rounded-lg font-zen text-center p-4">
                No sub-themes left
              </div>
            ) : (
              <>
                <div className="rounded-md p-1 px-2 font-semibold items-center font-zen w-auto text-center flex-wrap text-[#C66B50]">
                  Sub-themes left
                </div>
                {unselectedCodes.map((code, index) => (
                  <div
                    key={index}
                    style={{ backgroundColor: code.color }}
                    className="rounded-md p-1 px-2 font-semibold items-center font-zen w-auto text-center flex-wrap text-[#707070] cursor-pointer"
                    onClick={() => handleUnselectedCodeItemClick(code.id)}
                  >
                    {code.name}
                  </div>
                ))}
              </>
            )}
          </div>

          {showDialog && selectedCards.length > 0 && (
            <div className="overflow-auto">
              <Dialog className="relative z-50">
                <div
                  className="w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle transition-all"
                  ref={dialogRef}
                >
                  {selectedCards.map((card, index) => (
                    <CodeLabelReadonly key={index} id={card.id} name={card.name} topics={card.topics} isGPT={card.isGPT} colorIndex={index} />
                  ))}
                </div>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
