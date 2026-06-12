import { useEffect, useRef, useState } from "react";
import useCodeStore from "@/stores/useCodeStore";

type Props = {
  codeId: string;
  onColorChange?: (color: string) => void; 
};

export default function ColorSelector({ codeId, onColorChange }: Props) {
  const { codeData } = useCodeStore(); 
  const colorFromStore =
    codeData.find((code) => code.id === codeId)?.color || "#E3C8C0";

  const [color, setColor] = useState(colorFromStore);
  const colorList = [
    "#E3C8C0",
    "#FFE2D4",
    "#FFE2D4",
    "#C9ECCF",
    "#C9ECE6",
    "#D5ECF9",
    "#DDDDF3",
    "#F9D5F8",
    "#F9D5D5",
  ];
  const [active, setActive] = useState(
    colorList.indexOf(colorFromStore) !== -1
      ? colorList.indexOf(colorFromStore)
      : 0
  );

  const inputRef = useRef<HTMLInputElement>(null);

  // Update color state when store data changes
  useEffect(() => {
    setColor(colorFromStore);
    setActive(colorList.indexOf(colorFromStore));
  }, [colorFromStore]);

  const inputColorClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
    setActive(9); // Custom color selection
    if (onColorChange) {
      onColorChange(newColor); // invoke the provided callback
    }
  };

  const handleColorClick = (index: number) => {
    const newColor = colorList[index];
    setColor(newColor);
    setActive(index);
    if (onColorChange) {
      onColorChange(newColor); // invoke the provided callback
    }
  };

  return (
    <div className="flex gap-2 relative">
      {colorList.map((colorOption, index) => (
        <div
          key={index}
          className={`w-5 h-5 rounded-full cursor-pointer ${
            active === index ? "outline outline-offset-2 outline-slate-300" : ""
          }`}
          onClick={() => handleColorClick(index)}
          style={{ backgroundColor: colorOption }}
        ></div>
      ))}
      <div>
        <div
          className={`w-5 h-5 rounded-full cursor-pointer ${
            active === 9 ? "outline outline-offset-2 outline-slate-300" : ""
          }`}
          style={{ backgroundColor: color }}
          onClick={inputColorClick}
        ></div>
        <input
          type="color"
          value={color}
          className="opacity-0 absolute"
          ref={inputRef}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
