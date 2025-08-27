import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

interface CustomBarProps {
  selectedLevel: "all" | "concepts" | "codes";
  setSelectedLevel: (level: "all" | "concepts" | "codes") => void;
  visibleNodes: string[];
  setVisibleNodes: (nodes: string[]) => void;
  conceptNodes: string[];
  codeNodes: string[];
}

const CustomBar: React.FC<CustomBarProps> = ({
  selectedLevel,
  setSelectedLevel,
  visibleNodes,
  setVisibleNodes,
  conceptNodes,
  codeNodes,
}) => {
  console.log("conceptNodes in CustomBar:", conceptNodes);
  console.log("codeNodes in CustomBar:", codeNodes);


  useEffect(() => {
    if (selectedLevel === "all") {
      const allNodes = [...conceptNodes, ...codeNodes];
      setVisibleNodes(allNodes);
    }
  }, [selectedLevel, conceptNodes, codeNodes, setVisibleNodes]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setVisibleNodes((prev) => {
      if (checked) {
        return [...prev, value];
      } else {
        return prev.filter((node) => node !== value);
      }
    });
  };

  const handleDefaultClick = () => {
    setSelectedLevel("all");
    const allNodes = [...conceptNodes, ...codeNodes];
    setVisibleNodes(allNodes);
  };

  

  return (
    <div className="flex flex-col h-full gap-4 bg-gray-200 border-r border-t font-zen pt-4 px-8">
      <div className="text-2xl font-extrabold text-[#707070]">
        Customisation Bar
      </div>
      <div>
        <Button
          className="px-2 py-1 !text-[#C66B50] font-extrabold  w-[120px] rounded-lg mb-3"
          onClick={handleDefaultClick} 
        >
          Default
        </Button>
        <div className="flex flex-row gap-4">
          <Button
            className="px-2 py-1 !text-[#C66B50] font-extrabold w-[120px] rounded-lg"
            onClick={() => setSelectedLevel("codes")}
          >
            Codes
          </Button>
          <Button
            className="px-2 py-1 !text-[#C66B50] font-extrabold w-[120px] rounded-lg"
            onClick={() => setSelectedLevel("concepts")}
          >
            Concepts
          </Button>
        </div>
        {selectedLevel === "codes" && (
          <div>
            {codeNodes.map((codeKey) => (
              <label key={codeKey}>
                <input
                  type="checkbox"
                  value={codeKey}
                  onChange={handleCheckboxChange}
                  checked={visibleNodes.includes(codeKey)}
                />
                {codeKey}
              </label>
            ))}
          </div>
        )}
        {selectedLevel === "concepts" && (
          <div>
            {conceptNodes.map((conceptKey) => (
              <label key={conceptKey}>
                <input
                  type="checkbox"
                  value={conceptKey}
                  onChange={handleCheckboxChange}
                  checked={visibleNodes.includes(conceptKey)}
                />
                {conceptKey}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomBar;
