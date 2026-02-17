import useGenerationStore, { stageLabels } from "@/stores/useGenerationStore";

export default function BackgroundGenButton() {
  const stage = useGenerationStore((s) => s.stage);
  const errorMsg = useGenerationStore((s) => s.errorMsg);
  const isRunning = useGenerationStore((s) => s.isRunning);
  const runRemaining = useGenerationStore((s) => s.runRemaining);

  return (
    <button
      onClick={runRemaining}
      disabled={isRunning}
      title={errorMsg || undefined}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-zen font-semibold transition-all ${
        isRunning
          ? "bg-[#CB9180]/10 text-[#CB9180] cursor-wait"
          : stage === "done"
          ? "bg-green-50 text-green-600 hover:bg-green-100"
          : stage === "error"
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : "bg-[#CB9180] text-white hover:bg-[#AA7667] cursor-pointer"
      }`}
    >
      {isRunning && (
        <div className="w-3.5 h-3.5 border-2 border-[#CB9180]/30 border-t-[#CB9180] rounded-full animate-spin" />
      )}
      {stage === "done" && "✓ "}
      {stageLabels[stage]}
    </button>
  );
}
