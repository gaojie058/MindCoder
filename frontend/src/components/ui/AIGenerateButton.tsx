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
      className={`ml-3 flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold
        transition-all duration-200 cursor-pointer border
        ${loading
          ? "bg-purple-50 text-purple-400 border-purple-200 cursor-wait"
          : "bg-[#EEF2FF] text-[#6366F1] border-[#C7D2FE] hover:bg-[#E0E7FF] hover:border-[#A5B4FC] active:scale-[0.97]"
        }
        disabled:opacity-70 ${className}`}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-purple-500 rounded-full animate-spin" />
      ) : (
        <span className="text-[#8F93F5]">✦</span>
      )}
      {loading ? loadingLabel : label}
    </button>
  );
}
