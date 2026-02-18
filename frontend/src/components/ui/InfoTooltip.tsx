import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Info tooltip — click to toggle description.
 * Uses portal + fixed positioning so it never gets clipped by overflow.
 */
export default function InfoTooltip({ text, variant = "gray" }: { text: string; variant?: "gray" | "amber" }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
    }
    setShow((s) => !s);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!show) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [show]);

  // All variants use the same amber circle style for consistency
  const bgClass = "bg-amber-100 text-amber-600 hover:bg-amber-200";

  return (
    <>
      <span
        ref={ref}
        className={`inline-flex items-center justify-center ml-1.5 w-[18px] h-[18px] rounded-full text-[10px] font-bold cursor-pointer transition-colors select-none ${bgClass}`}
        onClick={handleClick}
      >
        ?
      </span>
      {show && createPortal(
        <div
          className="fixed z-[9999] px-3 py-2 rounded-lg shadow-xl max-w-[280px] leading-relaxed text-xs text-white"
          style={{ backgroundColor: "#1f2937", left: pos.x, top: pos.y, transform: "translateX(-50%)" }}
        >
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 rounded-sm" style={{ backgroundColor: "#1f2937" }} />
          <span className="relative">{text}</span>
        </div>,
        document.body
      )}
    </>
  );
}
