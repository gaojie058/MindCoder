import savelogo from "@/assets/icon/save.png";
import Input from "@/components/ui/Input";
import AlertInfo from "@/lib/AlertInfo";
import { useState, useEffect } from "react";
import ColorSelector from "./ColorSelector";
import useCodeStore from "@/stores/useCodeStore";
import useCardStore from "@/stores/useCardStore";
import { card } from "@/types/stores";
import { nanoid } from "nanoid";

type AddCodeProps = {
  setShow: (show: boolean) => void;
  onCardToggle: (card: card) => void;
};

export default function AddCode({ setShow, onCardToggle }: AddCodeProps) {
  const [value, setValue] = useState("");
  const [definition, setDefinition] = useState("");
  const [tempColor, setTempColor] = useState<string>("#E3C8C0");
  const { cardData } = useCardStore();
  const { codeData, setCodeData } = useCodeStore();
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    new Set()
  );

  const [unselectedCards, setUnselectedCards] = useState<card[]>([]);

  useEffect(() => {
    const unselected = cardData.filter((card) => !selectedCardIds.has(card.id));
    setUnselectedCards(unselected);
  }, [selectedCardIds, cardData]);

  const handleChange = (value: string) => setValue(value);

  const generateNewId = () => {
    if (codeData.length === 0) return "1";
    const maxId = Math.max(
      ...codeData.map((code) => parseInt(code.id || "0", 10))
    );
    return (maxId + 1).toString();
  };

  const handleSave = () => {
    if (value.trim() === "") {
      AlertInfo({
        message: "Please enter a code name",
        type: "destructive",
        title: "Error",
      });
      return;
    }

    const relatedCards = Array.from(selectedCardIds).reduce((acc, cardId) => {
      const matchingCard = cardData.find((card) => card.id === cardId);
      if (matchingCard) {
        acc[cardId] = [{ ...matchingCard }];
      }
      return acc;
    }, {} as Record<string, card[]>);

    const newId = generateNewId();
    const newCode = {
      name: value.trim(),
      id: newId,
      data: relatedCards,
      color: tempColor,
      nanoid: nanoid(),
      isGPT: false,
      definition: definition.trim(),
    };

    setCodeData([...codeData, newCode]);
    setShow(false);
    setValue("");
    setDefinition("");
    setTempColor("#E3C8C0");
    setSelectedCardIds(new Set());
    onCardToggle(null);
  };

  const handleCancel = () => {
    setShow(false);
    setValue("");
    setDefinition("");
    setTempColor("#E3C8C0");
    setSelectedCardIds(new Set());
  };

  const handleCardClick = (cardId: string) => {
    setSelectedCardIds((prevSelectedCardIds) => {
      const newSelectedCardIds = new Set(prevSelectedCardIds);
      if (newSelectedCardIds.has(cardId)) {
        newSelectedCardIds.delete(cardId);
      } else {
        newSelectedCardIds.add(cardId);
      }
      return newSelectedCardIds;
    });

    const selectedCard = cardData.find((card) => card.id === cardId);
    if (selectedCard) {
      onCardToggle(selectedCard);
    }
  };

  useEffect(() => {
    return () => {
      onCardToggle(null);
    };
  }, []); 

  return (
    <div
      className="w-full shadow-md border rounded-xl overflow-hidden"
      style={{ backgroundColor: tempColor || "#E3C8C0" }}
    >
      <div className="w-full p-3 rounded-xl shadow-md flex justify-between items-center text-[#C66B50]">
        <div className="text-lg font-zen font-semibold">Add New Sub-theme</div>
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-1 p-2 bg-[#FFF3EE] rounded-md cursor-pointer"
            onClick={handleCancel}
          >
            <div className="text-sm">Cancel</div>
          </div>
          <div
            className="flex items-center gap-1 p-2 bg-[#FFF3EE] rounded-md cursor-pointer"
            onClick={handleSave}
          >
            <img src={savelogo} className="w-5 h-5" />
            <div className="text-sm">Save changes</div>
          </div>
        </div>
      </div>
      <div className="w-full p-3">
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Enter sub-theme name"
        />
      </div>
      <div className="w-full p-3">
        <textarea
          className="w-full p-2 border border-gray-300 rounded-lg resize-none min-h-[60px] outline-none"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder="Enter rationale"
        />
      </div>
      <div className="w-full p-3">
        <ColorSelector codeId="" onColorChange={setTempColor} />
      </div>
      <div className="w-full p-3">
        <div className="text-[#707070] text-lg font-zen font-semibold rounded-md">
          Choose Open Codes
        </div>
        <div className="flex flex-row gap-4 mt-3 cursor-pointer flex-wrap">
          {cardData.map((card) => (
            <div
              key={card.id}
              className={`w-[360px] text-left justify-center bg-white rounded-lg text-[#C66B50] font-zen font-semibold flex items-center p-2 ${
                selectedCardIds.has(card.id)
                  ? "border-4 border-[#C66B50] font-bold"
                  : "border-none"
              }`}
              onClick={() => handleCardClick(card.id)}
            >
              Open Code {card.id}: {card.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
