type BottomLayoutProps = {
  bottomType: "generate" | "regenerate" | "display";
  generate?: () => void;
  regenerate?: () => void;
  regenerateSubsequent?: () => void;
  loading?: boolean;
  saveAndBack?: () => void;
  viewDownload?: () => void;
  reasoning?: () => void;
  versionHistory?: () => void;
  storeType?: "card" | "code" | "concept" | "display";
};

export default function Bottom({
  bottomType,
  regenerate,
  regenerateSubsequent,
  loading = false,
}: BottomLayoutProps) {
  return (
    <div className="flex items-center gap-2">
      {(bottomType === "regenerate" || bottomType === "display") && (
        <>
          <button
            onClick={regenerate}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-zen font-semibold transition-colors ${
              loading ? "bg-[#CB9180]/60 cursor-wait" : "bg-[#CB9180] hover:bg-[#AA7667]"
            }`}
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {loading ? "Generating…" : "Regenerate"}
          </button>
          {/* Regen All removed */}
        </>
      )}
    </div>
  );
}
