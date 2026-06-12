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
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-footnote font-zen font-semibold transition-all duration-150 ease-out active:scale-[0.97] ${
        bgRunning
          ? "bg-primary/10 text-primary cursor-wait"
          : bgStage === "done"
          ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
          : bgStage === "error"
          ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
          : "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md cursor-pointer"
      }`}
    >
      {bgRunning && (
        <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      )}
      {bgStage === "done" && !bgRunning && "✓ "}
      {stageLabels[bgStage]}
    </button>
  );
}
