import useGenerationStore, { stageLabels } from "@/stores/useGenerationStore";

export default function BackgroundGenButton() {
  const bgStage = useGenerationStore((s) => s.bgStage);
  const bgError = useGenerationStore((s) => s.bgError);
  const bgRunning = useGenerationStore((s) => s.bgRunning);
  const regenRunning = useGenerationStore((s) => s.regenRunning);
  const runRemaining = useGenerationStore((s) => s.runRemaining);

  const disabled = bgRunning || regenRunning;

  return (
    <button
      onClick={runRemaining}
      disabled={disabled}
      title={bgError || undefined}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-zen font-semibold transition-all ${
        bgRunning
          ? "bg-[#CB9180]/10 text-[#CB9180] cursor-wait"
          : bgStage === "done"
          ? "bg-green-50 text-green-600 hover:bg-green-100"
          : bgStage === "error"
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : "bg-[#CB9180] text-white hover:bg-[#AA7667] cursor-pointer"
      }`}
    >
      {bgRunning && (
        <div className="w-3.5 h-3.5 border-2 border-[#CB9180]/30 border-t-[#CB9180] rounded-full animate-spin" />
      )}
      {bgStage === "done" && !bgRunning && "✓ "}
      {stageLabels[bgStage]}
    </button>
  );
}
