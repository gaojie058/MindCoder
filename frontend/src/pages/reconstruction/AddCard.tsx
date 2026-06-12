import useCardStore from "@/stores/useCardStore";
import { useRef, useState } from "react";
import { card } from "@/types/stores";
import save from "@/assets/icon/save.png";
import { nanoid } from "nanoid";
import useEditorStore from "@/stores/useEditorStore";

type addCardProps = {
  hideDialog: () => void;
};

export default function AddCard({ hideDialog }: addCardProps) {
  const { cardData, setCardData } = useCardStore();
  const { selectedFile } = useEditorStore();
  const [value, setValue] = useState("");
  const [inputs, setInputs] = useState<string[]>([]);
  const [cardName, setCardName] = useState("");

  const addCard = () => {
    const trimmedValue = value.trim();
    // if (inputs.length === 0 && trimmedValue === "") {
    //   AlertInfo({
    //     message: "At least one card is required.",
    //     type: "destructive",
    //     title: "Error",
    //   });
    //   return;
    // }

    const newInputs = trimmedValue ? [...inputs, trimmedValue] : inputs;

    const newCardId = cardData.length + 1; // new card ID = current card count + 1
    const existingDatapointCount = cardData.reduce(
      (count, card) => count + card.topics.length,
      0
    );

    // create new datapoints
    const newDatapoints = newInputs.map((input, index) => ({
      id: (existingDatapointCount + index + 1).toString(),
      content: input,
      uuid: nanoid(),
    }));

    const newCard: card = {
      id: newCardId.toString(),
      name: cardName || "Unnamed Card",
      active: true,
      topics: newDatapoints,
      isGPT: false,
    };

    // Get current file-card mapping
    const currentFileCardMap = useCardStore.getState().fileCardMap;
    const updatedFileCardMap = { ...currentFileCardMap };

    // Associate new card with current file
    if (selectedFile) {
      updatedFileCardMap[selectedFile] = [
        ...(updatedFileCardMap[selectedFile] || []),
        newCardId.toString(),
      ];
    }

    // Update store with both the new card and updated mapping
    useCardStore.setState({
      cardData: [...cardData, newCard],
      fileCardMap: updatedFileCardMap,
    });

    setInputs([]);
    setValue("");
    hideDialog();
  };

  const handleAddInput = () => {
    const trimmedValue = value.trim();
    // if (trimmedValue === "") {
    //   AlertInfo({
    //     message: "Text is empty.",
    //     type: "destructive",
    //     title: "Error",
    //   });
    //   return;
    // }

    setInputs([...inputs, trimmedValue]);
    setValue("");
  };

  const TextAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddInput();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setValue("");
    }
  };

  return (
    <div className="w-1/3 max-width-[350px] xl:max-w-[380px] 2xl:max-w-[430px] border border-[#DA9C8A] mx-auto rounded-b-2xl bg-white overflow-y-auto scrollbar-thin">
      <div className="w-full h-2 bg-[#FFE2D4]"></div>
      <div className="mt-2 flex mx-10 justify-between items-center overflow-hidden">
        <div className="text-lg text-[#C66B50] font-semibold overflow-hidden">
          <input
            type="text"
            className="text-lg text-[#C66B50] font-semibold bg-transparent outline-none border-b border-transparent focus:border-[#C66B50] w-full"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
        </div>
        <div className="flex items-center flex-shrink-0">
          <div className="text-2xl cursor-pointer" onClick={hideDialog}>
            &times;
          </div>
          <div
            className="w-24 h-10 ml-2 flex justify-center gap-1 cursor-pointer shadow-sm rounded-xl hover:shadow bg-[#FFF3EE] items-center"
            onClick={addCard}
          >
            <img src={save} alt="save-logo" className="block w-4 h-4" />
            <div className="text-[#D79B53] text-sm">Save</div>
          </div>
        </div>
      </div>
      {inputs.map((input, index) => (
        <div
          key={index}
          className="mx-8 mt-3 mb-3 min-h-[100px] max-h-[200px] border-[#FFC6A9] border-[2px] overflow-auto rounded-3xl text-sm p-2 scrollbar-thin"
        >
          {input}
        </div>
      ))}
      <div className="mx-8 mt-3 p-2 h-[100px] border-[#FFC6A9] border-[2px] rounded-3xl flex justify-stretch overflow-hidden">
        <textarea
          className="mx-2 flex-1 resize-none outline-none scrollbar-thin text-sm"
          placeholder="Enter your text here. Press Enter to add or press Esc to cancel."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          ref={TextAreaRef}
        />
      </div>
      <div
        className="mx-8 mt-3 h-[100px] border-[#FFC6A9] border-[2px] rounded-3xl flex justify-center mb-8 items-center cursor-pointer flex-col"
        onClick={handleAddInput}
      >
        <div className="font-zen text flex flex-col items-center font-semibold text-center text-[#FFA172]">
          <span className="block">+</span>
          <span className="block">Add New Text</span>
        </div>
      </div>
    </div>
  );
}
