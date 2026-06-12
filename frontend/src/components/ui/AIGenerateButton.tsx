interface AIGenerateButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
  className?: string;
}

export default function AIGenerateButton({
  onClick,
  loading = false,
  label = "Get AI Generate",
  loadingLabel = "Generating...",
  className = "",
}: AIGenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`ml-3 flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-footnote font-semibold
        transition-all duration-150 ease-out cursor-pointer border
        ${loading
          ? "bg-ai-tint text-ai/60 border-ai-border cursor-wait"
          : "bg-ai-tint text-ai border-ai-border hover:brightness-[0.97] active:scale-[0.97]"
        }
        disabled:opacity-70 ${className}`}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-ai/30 border-t-ai rounded-full animate-spin" />
      ) : (
        <span className="text-ai">✦</span>
      )}
      {loading ? loadingLabel : label}
    </button>
  );
}
