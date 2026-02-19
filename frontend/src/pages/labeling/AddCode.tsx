import savelogo from "@/assets/icon/save.png";
import Input from "@/components/ui/Input";
import AlertInfo from "@/lib/AlertInfo";
import { useState, useEffect } from "react";
import ColorSelector from "./ColorSelector";
import useCodeStore from "@/stores/useCodeStore";
import useCardStore from "@/stores/useCardStore";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";
import { card } from "@/types/stores";
import { nanoid } from "nanoid";
import { useGenerateButton } from "@/api/useGenerateButton";
import AIGenerateButton from "@/components/ui/AIGenerateButton";

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
  const [loadingName, setLoadingName] = useState(false);
  const [loadingDef, setLoadingDef] = useState(false);
  const { generateName } = useGenerateButton();

  useEffect(() => {
    const unselected = cardData.filter((card) => !selectedCardIds.has(card.id));
    setUnselectedCards(unselected);
  }, [selectedCardIds, cardData]);

  const handleChange = (value: string) => setValue(value);

  const handleAIGenerateName = async () => {
    setLoadingName(true);
    const result = await generateName(Array.from(selectedCardIds), cardData, "code");
    setLoadingName(false);
    if (result) setValue(result);
  };

  const handleAIGenerateDefinition = async () => {
    setLoadingDef(true);
    const result = await generateName(Array.from(selectedCardIds), cardData, "codedefinition");
    setLoadingDef(false);
    if (result) setDefinition(result);
  };

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
      className="w-full shadow-md border rounded-xl overflow-visible"
      style={{ backgroundColor: tempColor || "#E3C8C0" }}
    >
      <div className="w-full px-3 py-2 rounded-xl shadow-sm flex justify-between items-center text-[#C66B50]">
        <div className="text-sm font-zen font-semibold">Add New Sub-theme</div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 px-2 py-1.5 bg-[#FFF3EE] rounded-md cursor-pointer"
            onClick={handleCancel}
          >
            <div className="text-xs">Cancel</div>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1.5 bg-[#FFF3EE] rounded-md cursor-pointer"
            onClick={handleSave}
          >
            <img src={savelogo} className="w-4 h-4" />
            <div className="text-xs">Save</div>
          </div>
        </div>
      </div>
      <div className="w-full px-3 py-2">
        <div className="w-[96%] flex items-center border rounded-lg shadow-sm mb-2 p-1 mx-auto bg-white">
          <Input
            type="text"
            className="text-ellipsis resize-none outline-none h-8 text-sm border border-gray"
            value={value}
            onChange={handleChange}
            placeholder="Enter sub-theme name"
          />
          <AIGenerateButton onClick={handleAIGenerateName} loading={loadingName} />
        </div>
        <div className="w-[96%] flex items-center border border-gray-300 rounded-lg shadow-sm mb-2 p-1 mx-auto bg-white">
          <textarea
            className="rounded-lg text-ellipsis p-1 min-h-[40px] flex-grow outline-none text-xs border border-gray"
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="Enter rationale"
          />
          <AIGenerateButton onClick={handleAIGenerateDefinition} loading={loadingDef} />
        </div>
      </div>
      <div className="w-full px-3 py-1.5">
        <ColorSelector codeId="" onColorChange={setTempColor} />
      </div>
      <div className="w-full px-3 py-2 pb-4">
        <MultiSelectDropdown
          label="Choose Open Codes"
          options={cardData.map((card) => ({ id: card.id, label: `#${card.id} ${card.name}` }))}
          selected={Array.from(selectedCardIds)}
          onChange={(id) => handleCardClick(id)}
          placeholder="Select open codes..."
        />
      </div>
    </div>
  );
}
