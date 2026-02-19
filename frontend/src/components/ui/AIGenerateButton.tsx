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
  label = "AI Generate",
  loadingLabel = "Generating...",
  className = "",
}: AIGenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`ml-3 flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold
        transition-all duration-200 cursor-pointer
        ${loading
          ? "bg-indigo-50 text-indigo-400 cursor-wait"
          : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-purple-600 active:scale-[0.97]"
        }
        disabled:opacity-70 ${className}`}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-500 rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
            fill="currentColor"
          />
        </svg>
      )}
      {loading ? loadingLabel : label}
    </button>
  );
}
