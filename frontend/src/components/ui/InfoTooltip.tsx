import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * Info tooltip — hover to show a floating description.
 * Uses portal + fixed positioning so it never gets clipped by overflow.
 */
export default function InfoTooltip({ text, variant = "gray" }: { text: string; variant?: "gray" | "amber" }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const handleEnter = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
    }
    setShow(true);
  }, []);

  const bgClass = variant === "amber"
    ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
    : "bg-gray-200 text-gray-500 hover:bg-gray-300";

  return (
    <>
      <span
        ref={ref}
        className={`inline-flex items-center justify-center ml-1.5 w-[18px] h-[18px] rounded-full text-[10px] font-bold cursor-help transition-colors ${bgClass}`}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
      >
        ?
      </span>
      {show && createPortal(
        <div
          className="fixed z-[9999] px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-xl max-w-[280px] leading-relaxed animate-in fade-in duration-150"
          style={{ left: pos.x, top: pos.y, transform: "translateX(-50%)" }}
        >
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 rotate-45 rounded-sm" />
          <span className="relative">{text}</span>
        </div>,
        document.body
      )}
    </>
  );
}
