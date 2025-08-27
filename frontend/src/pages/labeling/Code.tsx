import { useState, useRef, useEffect } from "react";
import logoTrashGrey from "@/assets/icon/trash-grey.png";
import editIcon from "@/assets/icon/edit.png";
import ColorSelector from "./ColorSelector";
import savelogo from "@/assets/icon/save.png";
import lightbulb from "@/assets/icon/lightbulb.png";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import useCodeStore from "@/stores/useCodeStore";
import useCardStore from "@/stores/useCardStore";
import { code, card } from "@/types/stores";
import { useGenerateButton } from "@/api/useGenerateButton";

function getContrastingTextColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 128 ? "#000000" : "#FFFFFF";
}

export default function Code({
  name,
  id,
  data,
  color,
  isGPT,
  definition,
  onDrawerToggle,
  onTempCardToggle,
  setDefinition,
}: code & {
  onDrawerToggle: (
    open: boolean,
    selectedCardsData: Record<string, card[]>
  ) => void;
  onTempCardToggle: (codeId: string, cardId: string, selected: boolean) => void;
  setDefinition?: (definition: string) => void;
}) {
  const { codeData } = useCodeStore();
  const { cardData } = useCardStore();
  const [drawerOpen, setDrawerOpen] = useState<"view" | "edit" | null>(null);
  const { generateName, loading, error } = useGenerateButton();
  const [value, setValue] = useState(name);
  const [localDefinition, setLocalDefinition] = useState(definition);
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>(
    data ? Object.keys(data) : []
  );

  useEffect(() => {
    setLocalDefinition(definition);
  }, [definition]);

  // Temp states when editing
  const [tempCards, setTempCards] = useState<string[]>([]);
  const [tempColor, setTempColor] = useState<string>(color);
  const codeRef = useRef<HTMLDivElement>(null);

  const handleChange = (value: string) => setValue(value);

  const handleTextAreaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newValue = event.target.value;
    setDefinition && setDefinition(newValue);
    setLocalDefinition(newValue);
  };

  const handleSave = () => {
    // console.log("code data before update", codeData);

    // Update the codes array
    const updatedCodes = codeData.map((codeItem) => {
      const isNameChanged = codeItem.name !== value;
      const isDefinitionChanged = codeItem.definition !== localDefinition;
      const isColorChanged = codeItem.color !== tempColor;
      const isDataChanged =
        JSON.stringify(codeItem.data) !==
        JSON.stringify(
          tempCards.reduce((acc, cardId) => {
            const matchingCard = cardData.find((card) => card.id === cardId);
            if (matchingCard) {
              acc[cardId] = [{ ...matchingCard }];
            }
            return acc;
          }, {} as Record<string, card[]>)
        );

      return codeItem.id === id
        ? {
            ...codeItem,
            name: value,
            definition: localDefinition,
            color: tempColor,
            data: tempCards.reduce((acc, cardId) => {
              const matchingCard = cardData.find((card) => card.id === cardId);
              if (matchingCard) {
                acc[cardId] = [{ ...matchingCard }];
              }
              return acc;
            }, {} as Record<string, card[]>),
            isGPT:
              isNameChanged ||
              isDefinitionChanged ||
              isColorChanged ||
              isDataChanged
                ? false
                : codeItem.isGPT,
          }
        : codeItem;
    });

    useCodeStore.setState({ codeData: updatedCodes });

    // Update the cards, ensuring no duplicates card ids
    const updatedCardData = cardData.map((card) => {
      if (tempCards.includes(card.id)) {
        return (
          updatedCodes.find((codeItem) => codeItem.id === id)?.data[
            card.id
          ]?.[0] || card
        );
      }
      return card;
    });

    useCardStore.setState({ cardData: updatedCardData });

    // Update drawer data without duplicating cards
    onDrawerToggle(false, {
      [id]: Object.values(
        updatedCodes.find((codeItem) => codeItem.id === id)?.data || {}
      ).flat(),
    });

    setSelectedCards([...tempCards]); // Ensure tempCards are used
    setTempCards([]); // Clear temporary cards
    // console.log("code data after update", updatedCodes);
  };

  const handleToggleDrawer = (mode: "view" | "edit") => {
    if (drawerOpen === "edit" && mode === "view") {
      setDrawerOpen(null);
      return;
    }

    if (drawerOpen === mode) {
      setDrawerOpen(null);
      // setSelectedCards([]);
      onDrawerToggle(false, {});
    } else {
      if (mode === "edit") {
        setTempCards([...selectedCards]);
        setTempColor(color);
      }
      setDrawerOpen(mode);

      const selectedCardsData = selectedCards.reduce((acc, cardId) => {
        const matchingCard = cardData.find((card) => card.id === cardId);
        if (matchingCard) {
          acc[cardId] = [{ ...matchingCard }];
        }
        return acc;
      }, {} as Record<string, card[]>);
      // console.log("Final selected cards data", selectedCardsData);
      onDrawerToggle(true, { [id]: Object.values(selectedCardsData).flat() });
    }
  };

  const toggleCardSelection = (cardId: string) => {
    if (drawerOpen !== "edit") return;

    setTempCards((prevTempCards) => {
      const updatedTempCards = prevTempCards.includes(cardId)
        ? prevTempCards.filter((id) => id !== cardId)
        : [...prevTempCards, cardId];

      onTempCardToggle(id, cardId, updatedTempCards.includes(cardId));

      return updatedTempCards;
    });
  };

  const deleteCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    // console.log("Before delete:", codeData);
    const updatedCodes = codeData.filter((codeItem) => codeItem.id !== id);
    // console.log("After delete:", updatedCodes);

    // console.log("Before save:", codeData);
    // console.log("Updated code:", updatedCodes);

    useCodeStore.setState({ codeData: updatedCodes });
    setDrawerOpen(null);
    onDrawerToggle(false, {});
  };

  // Cancel editing
  const handleCancel = () => {
    setTempCards([]);
    setTempColor(color);
    setDrawerOpen(null);
    onDrawerToggle(false, {});
  };

  const handleAIGenerate = async () => {
    const generatedCodeName = await generateName(tempCards, cardData, "code");
    if (generatedCodeName) {
      setValue(generatedCodeName);
    }
  };

  const handleAIGenerateDefinition = async () => {
    setLoadingDefinition(true);
    const generatedResult = await generateName(
      tempCards,
      cardData,
      "codedefinition"
    );
    setLoadingDefinition(false);
    if (generatedResult) {
      console.log("Generated Rationale:", generatedResult);
      setDefinition && setDefinition(generatedResult);
      setLocalDefinition(generatedResult);
    }
  };

  return (
    <div
      ref={codeRef}
      className="rounded-xl flex flex-col shadow-md cursor-pointer"
      style={{
        backgroundColor: drawerOpen === "edit" ? tempColor : color,
        color: getContrastingTextColor(
          drawerOpen === "edit" ? tempColor : color
        ),
      }}
      onClick={() => handleToggleDrawer("view")}
    >
      <div
        className="shadow-lg rounded-xl p-4 text-lg cursor-pointer"
        style={{
          position: "relative",
          zIndex: 10,
        }}
      >
        <div className="text-[#707070] rounded-xl flex w-full items-center font-zen font-semibold">
          {drawerOpen === "edit" ? (
            <div className="flex items-center justify-between w-full">
              <div className="text-[#707070] font-zen font-semibold">Edit</div>
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center gap-1 p-2 bg-[#FFF3EE] rounded-md cursor-pointer text-sm"
                  onClick={handleCancel}
                >
                  Cancel
                </div>
                <div
                  className="flex items-center gap-1 p-2 bg-[#FFF3EE] rounded-md cursor-pointer text-sm"
                  onClick={handleSave}
                >
                  <img src={savelogo} className="w-5 h-5" />
                  Save changes
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-row items-center justify-between w-full">
              <div className="text-[#707070] font-zen font-semibold max-w-full flex-shrink">
                {value}
              </div>
              <div className="flex gap-4 items-center whitespace-nowrap">
                {isGPT ? (
                  <div className="text-xs font-semibold">GPT-generated</div>
                ) : (
                  <div className="text-xs font-semibold text-red-500">
                    User Edited
                  </div>
                )}
                <button onClick={deleteCode}>
                  <img
                    src={logoTrashGrey}
                    className="h-auto w-auto max-h-[20px] max-w-[20px] cursor-pointer"
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleDrawer("edit");
                  }}
                  className="rounded-md p-2 flex items-center"
                >
                  <img
                    src={editIcon}
                    className="h-auto w-auto max-h-[16px] max-w-[16px] transform transition-transform"
                    alt="Edit"
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div
          className="w-full shadow-md rounded-xl font-zen flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {drawerOpen === "edit" && (
            <div className="mt-5">
              <div className="flex flex-col justify-center w-full">
                <div className="w-[96%] flex items-center border rounded-lg shadow-sm mb-4 p-1 mx-auto bg-white">
                  <Input
                    type="text"
                    className=" text-ellipsis  resize-none outline-none h-10 font-semibold border border-gray"
                    value={value}
                    onChange={handleChange}
                  />
                  <Button
                    onClick={handleAIGenerate}
                    className="ml-4 flex-shrink-0 h-[40px] w-[160px] rounded-lg text-sm !text-[#62AD3C] font-semibold bg-gradient-to-r from-green-200 to-teal-200 shadow-md"
                  >
                    <img
                      src={lightbulb}
                      alt="Lightbulb"
                      className="w-4 h-4 mr-2"
                    />
                    {loading ? "Generating..." : "Get AI Generated"}
                  </Button>
                </div>
                <div className="w-[96%] flex items-center border border-gray-300 rounded-lg shadow-sm mb-4 p-1 mx-auto bg-white ">
                  <textarea
                    className=" rounded-lg text-ellipsis p-1  min-h-[60px] flex-grow outline-none font-semibold border border-gray"
                    value={localDefinition}
                    placeholder="Enter definition"
                    onChange={handleTextAreaChange}
                  />
                  <Button
                    onClick={handleAIGenerateDefinition}
                    className="ml-4 flex-shrink-0 h-[40px] p-2 w-[160px] rounded-lg text-sm !text-[#62AD3C] font-semibold bg-gradient-to-r from-green-200 to-teal-200 shadow-md"
                  >
                    <img src={lightbulb} alt="Lightbulb" className="w-4 h-4" />
                    {loadingDefinition ? "Generating..." : "Get AI Generated"}
                  </Button>
                </div>
              </div>
              {error && <div className="text-red-500">{error}</div>}
              <div className="text-[#707070] text-lg px-3 font-zen font-semibold rounded-md">
                <div className="mb-2">Choose sub-theme color</div>
                <ColorSelector codeId={id} onColorChange={setTempColor} />{" "}
              </div>
            </div>
          )}
          <div>
            <div className="w-full">
              <div className="p-4 mb-2 cursor-pointer">
                <div className="text-[#707070] text-lg font-semibold rounded-md mb-2">
                  Rationale
                </div>
                <div className="font-zen cursor-pointer">{localDefinition}</div>
              </div>
              <div className="text-[#707070] text-lg p-4 font-semibold rounded-md">
                Open Codes
                <div className="flex flex-row gap-4 mt-3 cursor-pointer flex-wrap">
                  {cardData.map((card) => (
                    <div
                      className={`w-[360px] text-left justify-center bg-white rounded-lg text-[#C66B50] font-zen font-semibold flex items-center p-2
                        ${
                          drawerOpen === "edit"
                            ? "cursor-pointer"
                            : "cursor-default"
                        }
                        ${
                          (
                            drawerOpen === "edit"
                              ? tempCards.includes(card.id)
                              : selectedCards.includes(card.id)
                          )
                            ? "border-2 border-[#C66B50] font-bold"
                            : "border-none"
                        }`}
                      key={card.id}
                      onClick={() =>
                        drawerOpen === "edit" && toggleCardSelection(card.id)
                      }
                    >
                      Open Code {card.id}: {card.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
