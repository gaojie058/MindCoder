import savelogo from "@/assets/icon/save.png";
import Input from "@/components/ui/Input";
import AlertInfo from "@/lib/AlertInfo";
import { useEffect, useState } from "react";
import ColorSelector from "./ConceptColorSelector";
import useCodeStore from "@/stores/useCodeStore";
import useConceptStore from "@/stores/useConceptStore";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";
import { code } from "@/types/stores";
import { nanoid } from "nanoid";
import { useGenerateButton } from "@/api/useGenerateButton";
import AIGenerateButton from "@/components/ui/AIGenerateButton";

type addConceptProps = {
  setShow: (show: boolean) => void;
  onCodeToggle: (code: code) => void;
};

export default function AddConcept({ setShow, onCodeToggle }: addConceptProps) {
  const [value, setValue] = useState("");
  const [tempColor, setTempColor] = useState<string>("#E3C8C0");
  const { codeData } = useCodeStore();
  const { conceptData, setConceptData } = useConceptStore();
  const [selectedCodes, setselectedCodes] = useState<Set<string>>(new Set());
  const [definition, setDefinition] = useState("");
  const [loadingName, setLoadingName] = useState(false);
  const [loadingDef, setLoadingDef] = useState(false);
  const { generateName } = useGenerateButton();

  const [unselectedCodes, setUnselectedCodes] = useState<code[]>([]);

  useEffect(() => {
    const unselected = codeData.filter(
      (concept) => !selectedCodes.has(concept.id)
    );
    setUnselectedCodes(unselected);
  }, [selectedCodes, codeData]);

  const handleChange = (value: string) => setValue(value);

  const generateNewId = () => {
    if (conceptData.length === 0) return "1";
    // Use the length of the array + 1 for the new ID
    return (conceptData.length + 1).toString();
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

    const relatedCodes = Array.from(selectedCodes).reduce((acc, codeId) => {
      const matchingCode = codeData.find((code) => code.id === codeId);
      if (matchingCode) {
        acc[codeId] = [{ ...matchingCode }];
      }
      return acc;
    }, {} as Record<string, code[]>);
    const newId = generateNewId();
    const newConcept = {
      name: value.trim(),
      definition: definition.trim(),
      id: newId,
      codes: relatedCodes,
      color: tempColor,
      isGPT: false,
      nanoid: nanoid(),
    };

    setConceptData([...conceptData, newConcept]);
    setShow(false);
    setValue("");
    setTempColor("#E3C8C0");
    setselectedCodes(new Set());
    onCodeToggle(null);
  };

  const handleCancel = () => {
    setShow(false);
    setValue("");
    setDefinition("");
    setTempColor("#E3C8C0");
    setselectedCodes(new Set());
  };

  const handleAIGenerateName = async () => {
    setLoadingName(true);
    const result = await generateName(Array.from(selectedCodes), codeData, "concept");
    setLoadingName(false);
    if (result) setValue(result);
  };

  const handleAIGenerateDefinition = async () => {
    setLoadingDef(true);
    const result = await generateName(Array.from(selectedCodes), codeData, "conceptdefinition");
    setLoadingDef(false);
    if (result) setDefinition(result);
  };

  const handleCodeClick = (cardId: string) => {
    setselectedCodes((prevselectedCodes) => {
      const newselectedCodes = new Set(prevselectedCodes);
      if (newselectedCodes.has(cardId)) {
        newselectedCodes.delete(cardId);
      } else {
        newselectedCodes.add(cardId);
      }
      return newselectedCodes;
    });

    const selectedCodes = codeData.filter((code) => code.id === cardId);
    if (selectedCodes) {
      onCodeToggle(selectedCodes[0]);
    }
  };

  useEffect(() => {
    return () => {
      onCodeToggle(null);
    };
  }, []);

  return (
    <div
      className=" w-full  shadow-md border rounded-xl overflow-visible"
      style={{ backgroundColor: tempColor || "#E3C8C0" }}
    >
      <div className="w-full px-3 py-2 rounded-xl shadow-sm flex justify-between items-center text-[#C66B50]">
        <div className="text-sm font-zen font-semibold">Add New Theme</div>
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
            placeholder="Enter theme name"
          />
          <AIGenerateButton onClick={handleAIGenerateName} loading={loadingName} />
        </div>
        <div className="w-[96%] flex items-center border border-gray-300 rounded-lg shadow-sm mb-2 p-1 mx-auto bg-white">
          <textarea
            className="rounded-lg text-ellipsis p-1 min-h-[40px] flex-grow outline-none text-xs border border-gray"
            value={definition}
            placeholder="Enter definition"
            onChange={(e) => setDefinition(e.target.value)}
          />
          <AIGenerateButton onClick={handleAIGenerateDefinition} loading={loadingDef} />
        </div>
      </div>

      <div className="text-[#707070] text-xs px-3 font-zen font-semibold rounded-md">
        <div className="mb-1.5">Choose a color for this Theme</div>
        <ColorSelector conceptId="" onColorChange={setTempColor} />
      </div>
      <div className="w-full px-3 py-2">
        <MultiSelectDropdown
          label="Choose Sub-Theme(s) for this Theme"
          options={codeData.map((code) => ({ id: code.id, label: code.name }))}
          selected={Array.from(selectedCodes)}
          onChange={(id) => handleCodeClick(id)}
          placeholder="Select sub-themes..."
        />
      </div>
    </div>
  );
}
