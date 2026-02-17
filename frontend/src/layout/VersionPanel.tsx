import useVersionStore, { VersionSnapshot } from "@/stores/useVersionStore";

const stepIcons: Record<string, string> = {
  card: "📋",
  code: "🏷️",
  concept: "💡",
  display: "📊",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function VersionPanel() {
  const { versions, activeVersionId, panelOpen, togglePanel, restoreVersion, deleteVersion, clearVersions } =
    useVersionStore();

  return (
    <>
      {/* Toggle button — always visible on right edge */}
      <button
        onClick={togglePanel}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 px-1.5 py-4 rounded-l-lg shadow-lg transition-all ${
          panelOpen
            ? "bg-gray-200 text-gray-600"
            : "bg-[#CB9180] text-white hover:bg-[#AA7667]"
        }`}
        title="Version History"
      >
        <div className="flex flex-col items-center gap-1 text-[10px] font-bold writing-vertical">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span style={{ writingMode: "vertical-rl" }}>Versions</span>
        </div>
      </button>

      {/* Panel */}
      {panelOpen && (
        <div className="fixed right-0 top-0 h-full w-[280px] bg-white shadow-2xl border-l border-gray-200 z-30 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#CB9180]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-bold text-gray-700">Version History</span>
            </div>
            <button
              onClick={togglePanel}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 text-xs"
            >
              ✕
            </button>
          </div>

          {/* Version list */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {versions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-xs text-gray-400">No versions yet</p>
                <p className="text-[10px] text-gray-300 mt-1">Versions are auto-saved before each regeneration</p>
              </div>
            ) : (
              versions
                .slice()
                .reverse()
                .map((v) => (
                  <VersionCard
                    key={v.id}
                    version={v}
                    isActive={v.id === activeVersionId}
                    onRestore={() => restoreVersion(v.id)}
                    onDelete={() => deleteVersion(v.id)}
                  />
                ))
            )}
          </div>

          {/* Footer */}
          {versions.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-200">
              <button
                onClick={clearVersions}
                className="w-full text-[10px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded py-1.5 transition-colors"
              >
                Clear All Versions
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function VersionCard({
  version,
  isActive,
  onRestore,
  onDelete,
}: {
  version: VersionSnapshot;
  isActive: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const cardCount = version.cardData.filter((c) => c.active !== false).length;
  const codeCount = version.codeData.length;
  const conceptCount = version.conceptData.length;

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        isActive
          ? "border-[#CB9180] bg-[#FFF3EE] shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{stepIcons[version.step] || "📄"}</span>
            <span className="text-xs font-bold text-gray-700">{version.label}</span>
          </div>
          <span className="text-[10px] text-gray-400">{formatTime(version.timestamp)}</span>
        </div>
        {isActive && (
          <span className="text-[9px] font-bold text-[#CB9180] bg-[#CB9180]/10 px-1.5 py-0.5 rounded-full">
            ACTIVE
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-[10px] text-gray-500 mb-2.5">
        <span>📋 {cardCount} codes</span>
        <span>🏷️ {codeCount} sub-themes</span>
        <span>💡 {conceptCount} themes</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isActive && (
          <button
            onClick={onRestore}
            className="flex-1 text-[11px] font-semibold text-[#CB9180] bg-[#CB9180]/10 hover:bg-[#CB9180]/20 rounded-lg py-1.5 transition-colors"
          >
            Restore
          </button>
        )}
        <button
          onClick={onDelete}
          className="text-[11px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
