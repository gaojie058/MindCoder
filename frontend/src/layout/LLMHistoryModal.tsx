import useLLMHistoryStore, {
  LLMHistoryEntry,
} from "@/stores/useLLMHistoryStore";
import trashIcon from "@/assets/icon/history_trash.png";
import viewIcon from "@/assets/icon/history_download.png";

export default function LLMHistoryModal() {
  const {
    llmHistory = [],
    showLLMHistoryModal,
    setShowLLMHistoryModal,
    deleteLLMHistoryEntry,
  } = useLLMHistoryStore();

  // Format date and time for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  };

  // Get step display name
  const getStepDisplayName = (step: string) => {
    switch (step) {
      case "card":
        return "Open Coding";
      case "code":
        return "Sub-Theme";
      case "concept":
        return "Theme";
      default:
        return step;
    }
  };

  // View prompt details
  const viewPrompt = (entry: LLMHistoryEntry) => {
    // Create a modal or expand the entry to show the full prompt
    // For now, we'll just log it to console
    console.log("User Prompt:", entry.userPrompt);

    // You could also create a more sophisticated modal here
    alert(
      `User Prompt for ${getStepDisplayName(
        entry.step
      )}:\n\n${entry.userPrompt.substring(0, 500)}${
        entry.userPrompt.length > 500 ? "..." : ""
      }`
    );
  };

  if (!showLLMHistoryModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">LLM Prompt History</h2>
          <button
            onClick={() => setShowLLMHistoryModal(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {llmHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No LLM prompts have been saved yet.
            </div>
          ) : (
            <div className="space-y-4">
              {llmHistory.map((entry) => {
                const { date, time } = formatDate(entry.timestamp);
                return (
                  <div
                    key={entry.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{entry.title}</h3>
                        <p className="text-sm text-gray-600">
                          {getStepDisplayName(entry.step)} • {date} at {time}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => viewPrompt(entry)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          title="View Prompt"
                        >
                          <img src={viewIcon} alt="View" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteLLMHistoryEntry(entry.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete Entry"
                        >
                          <img
                            src={trashIcon}
                            alt="Delete"
                            className="w-4 h-4"
                          />
                        </button>
                      </div>
                    </div>

                    {/* Show a preview of the prompt */}
                    <div className="bg-gray-100 p-3 rounded text-sm font-mono max-h-32 overflow-y-auto">
                      <div className="text-gray-700">
                        {entry.userPrompt.length > 300
                          ? `${entry.userPrompt.substring(0, 300)}...`
                          : entry.userPrompt}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {llmHistory.length} prompt{llmHistory.length !== 1 ? "s" : ""} saved
          </div>
          <button
            onClick={() => setShowLLMHistoryModal(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
