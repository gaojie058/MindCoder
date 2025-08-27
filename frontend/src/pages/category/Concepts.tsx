import { useState, useEffect } from "react";
import logoTrashGrey from "@/assets/icon/trash-grey.png";
import editIcon from "@/assets/icon/edit.png";
import ColorSelector from "./ConceptColorSelector";
import savelogo from "@/assets/icon/save.png";
import lightbulb from "@/assets/icon/lightbulb.png";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import useConceptStore from "@/stores/useConceptStore";
import useCodeStore from "@/stores/useCodeStore";
import { concept, code } from "@/types/stores";
import { useGenerateButton } from "@/api/useGenerateButton";
function getContrastingTextColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 128 ? "#000000" : "#FFFFFF";
}

export default function Concept({
  name,
  definition,
  setDefinition,
  codes,
  id,
  color,
  isGPT,
  onDrawerToggle,
  onTempCodeToggle,
}: concept & {
  onDrawerToggle: (
    open: boolean,
    selectedCodesData: Record<string, code[]>
  ) => void;
  onTempCodeToggle: (
    codeId: string,
    conceptId: string,
    selected: boolean
  ) => void;
  setDefinition?: (definition: string) => void;
}) {
  const { conceptData } = useConceptStore();
  const { codeData } = useCodeStore();

  // State of drawers
  const [drawerOpen, setDrawerOpen] = useState<"view" | "edit" | null>(null);
  const [value, setValue] = useState(name);
  const [localDefinition, setLocalDefinition] = useState(definition);

  useEffect(() => {
    setLocalDefinition(definition);
  }, [definition]);

  // State of AI generation
  const { generateName } = useGenerateButton();

  const [loadingConcept, setLoadingConcept] = useState(false);
  const [loadingDefinition, setLoadingDefinition] = useState(false);

  const [selectedCodes, setSelectedCodes] = useState<string[]>(
    codes ? Object.keys(codes) : []
  );

  // Temp states when editing
  const [tempCodes, setTempCodes] = useState<string[]>([]);
  const [tempColor, setTempColor] = useState<string>(color);

  const handleChange = (value: string) => setValue(value);

  const handleTextAreaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newValue = event.target.value;
    setDefinition && setDefinition(newValue);
    setLocalDefinition(newValue);
  };

  const handleSave = () => {
    console.log("Saving concept...");
    if (value.trim() === "") {
      return;
    }

    // 打印保存前的 conceptData 和 tempCodes
    console.log("Concept Data before save:", conceptData);
    console.log("Temp Codes:", tempCodes);

    const updatedConcept = conceptData.map((conceptItem) => {
      const isNameChanged = conceptItem.name !== value;
      const isDefinitionChanged = conceptItem.definition !== localDefinition;
      const isColorChanged = conceptItem.color !== tempColor;
      const isDataChanged =
        JSON.stringify(conceptItem.codes) !==
        JSON.stringify(
          tempCodes.reduce((acc, cardId) => {
            const matchingCode = codeData.find((card) => card.id === cardId);
            if (matchingCode) {
              acc[cardId] = [{ ...matchingCode }];
            }
            return acc;
          }, {} as Record<string, code[]>)
        );

      // 打印每个 conceptItem 的更新状态
      console.log(`Concept ${conceptItem.id} update status:`, {
        isNameChanged,
        isColorChanged,
        isDataChanged,
        isDefinitionChanged,
      });

      return conceptItem.id === id
        ? {
            ...conceptItem,
            name: value,
            definition: localDefinition,
            color: tempColor,
            codes: tempCodes.reduce((acc, codeId) => {
              const matchingCode = codeData.find((code) => code.id === codeId);
              if (matchingCode) {
                acc[codeId] = [{ ...matchingCode }];
              }
              return acc;
            }, {} as Record<string, code[]>),
            isGPT:
              isNameChanged ||
              isColorChanged ||
              isDataChanged ||
              isDefinitionChanged
                ? false
                : conceptItem.isGPT,
          }
        : conceptItem;
    });

    console.log("Updated Concept:", updatedConcept);

    useConceptStore.setState({ conceptData: updatedConcept });

    const updateCodeData = codeData.map((code) => {
      if (tempCodes.includes(code.id)) {
        return (
          updatedConcept.find((conceptItem) => conceptItem.id === id)?.codes[
            code.id
          ]?.[0] || code
        );
      }
      return code;
    });

    console.log("Updated CodeData:", updateCodeData);

    useCodeStore.setState({ codeData: updateCodeData });

    onDrawerToggle(false, {
      [id]: Object.values(
        updatedConcept.find((conceptItem) => conceptItem.id === id)?.codes || {}
      ).flat(),
    });

    setSelectedCodes([...tempCodes]);
    setTempCodes([]);
    // setDrawerOpen(null);
  };

  // Drawer open in different mode
  const handleToggleDrawer = (mode: "view" | "edit") => {
    if (drawerOpen === "edit" && mode === "view") {
      setDrawerOpen(null);
      return;
    }

    if (drawerOpen === mode) {
      setDrawerOpen(null);
      onDrawerToggle(false, {});
    } else {
      if (mode === "edit") {
        setTempCodes([...selectedCodes]);
        setTempColor(color);
      }

      setDrawerOpen(mode);

      const selectedCodesData = selectedCodes.reduce((acc, codeId) => {
        const matchingCode = codeData.find((code) => code.id === codeId);
        if (matchingCode) {
          acc[codeId] = [{ ...matchingCode }];
        }
        return acc;
      }, {} as Record<string, code[]>);
      console.log("Final selected Codes Data:", selectedCodesData);
      onDrawerToggle(true, { [id]: Object.values(selectedCodesData).flat() });
    }
  };

  // Select code related to concept
  const toggleCodeSelection = (codeId: string) => {
    if (drawerOpen !== "edit") return;

    setTempCodes((prevTempCodes) => {
      const updatTempCodes = prevTempCodes.includes(codeId)
        ? prevTempCodes.filter((id) => id !== codeId)
        : [...prevTempCodes, codeId];
      onTempCodeToggle(id, codeId, updatTempCodes.includes(codeId));
      return updatTempCodes;
    });
  };

  const deleteConcept = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedConcepts = conceptData.filter((concept) => concept.id !== id);
    useConceptStore.setState({ conceptData: updatedConcepts });
    setDrawerOpen(null);
    onDrawerToggle(false, {});
  };

  // useEffect(() => {
  //   console.log("Updated conceptData in store:", conceptData);
  // }, [conceptData]);

  // useEffect(() => {
  //   console.log(
  //     "Concept data after state update:",
  //     useConceptStore.getState().conceptData
  //   );
  // }, []);

  // Cancel editing
  const handleCancel = () => {
    setTempCodes([]);
    setTempColor(color);
    setDrawerOpen(null);
    onDrawerToggle(false, {});
  };

  const handleAIGenerateConcept = async () => {
    setLoadingConcept(true);
    const generatedResult = await generateName(tempCodes, codeData, "concept");
    setLoadingConcept(false);

    if (generatedResult) {
      setValue(generatedResult);
    }
  };

  const handleAIGenerateDefinition = async () => {
    setLoadingDefinition(true);
    const generatedResult = await generateName(
      tempCodes,
      codeData,
      "conceptdefinition"
    );
    setLoadingDefinition(false);

    if (generatedResult) {
      console.log("Generated Definition:", generatedResult);
      setDefinition && setDefinition(generatedResult);
      setLocalDefinition(generatedResult);
    }
  };

  // useEffect(() => {
  //   console.log("Definition updated:", localDefinition);
  // }, [localDefinition]);

  return (
    <div
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
            <div className="flex items-center justify-between w-full">
              <div className="text-[#707070] font-zen font-semibold max-w-full flex-shrink">
                {value}
              </div>
              <div className="flex gap-3 items-center whitespace-nowrap">
                {isGPT ? (
                  <div className="text-xs">GPT-generated</div>
                ) : (
                  <div className="text-xs text-red-500">User Edited</div>
                )}
                <button onClick={deleteConcept}>
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
                    onClick={handleAIGenerateConcept}
                    className="ml-4 flex-shrink-0 h-[40px] w-[160px] rounded-lg text-sm !text-[#62AD3C] font-semibold bg-gradient-to-r from-green-200 to-teal-200 shadow-md"
                  >
                    <img
                      src={lightbulb}
                      alt="Lightbulb"
                      className="w-4 h-4 mr-2"
                    />
                    {loadingConcept ? "Generating..." : "Get AI Generated"}
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

              <div className="text-[#707070] text-lg px-3 font-zen font-semibold rounded-md">
                <div className="mb-2">Choose sub-theme color</div>
                <ColorSelector
                  conceptId={id}
                  onColorChange={setTempColor}
                />{" "}
              </div>
            </div>
          )}
          <div>
            <div className="w-full">
              <div className="p-4 mb-2 cursor-pointer">
                <div className="text-[#707070] text-lg font-semibold rounded-md mb-2">
                  Rationale
                </div>
                <div className="font-zen cursor-pointer">{definition}</div>
              </div>
              <div className="text-[#707070] text-lg px-4 pb-4 font-semibold rounded-md">
                Sub-themes relating to themes
                <div className="flex flex-row gap-4 mt-3 cursor-pointer flex-wrap">
                  {codeData.map((code) => (
                    <div
                      className={`h-auto w-auto lg:max-w-[340px] 2xl:max-w-[430px] text-left p-2 justify-center bg-white rounded-lg text-[#C66B50] font-zen font-semibold text-sm flex items-center
                        
                        ${
                          drawerOpen === "edit"
                            ? "cursor-pointer"
                            : "cursor-default"
                        }
                        ${
                          (
                            drawerOpen === "edit"
                              ? tempCodes.includes(code.id)
                              : selectedCodes.includes(code.id)
                          )
                            ? "border-2 border-[#C66B50] font-bold"
                            : "border-none"
                        }`}
                      key={code.id}
                      onClick={() =>
                        drawerOpen === "edit" && toggleCodeSelection(code.id)
                      }
                    >
                      {code.name}
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
