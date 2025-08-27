import useHistoryStore, { HistoryEntry } from "@/stores/useHistoryStore";
import trashIcon from "@/assets/icon/history_trash.png";
import viewIcon from "@/assets/icon/history_download.png";
export default function HistoryModal() {
  const { history, showHistoryModal, setShowHistoryModal, deleteHistoryEntry } =
    useHistoryStore();

  // Function to view a specific PDF
  const viewPdf = (entry: HistoryEntry) => {
    // Create a blob from the base64 data
    const binaryString = window.atob(
      entry.pdfData.replace(/^data:application\/pdf;base64,/, "")
    );
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Open the PDF in a new tab
    window.open(url, "_blank");

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000); // Revoke after 1 minute
  };

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

  if (!showHistoryModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-3/4 max-h-3/4 overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">PDF History</h2>
          <button
            onClick={() => setShowHistoryModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-center py-4">No PDF history available.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Date</th>
                <th className="pb-2">Time</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, index) => {
                const { date, time } = formatDate(entry.timestamp);
                return (
                  <tr key={entry.id} className="border-t">
                    <td className="py-2">
                      {entry.title || `Version ${history.length - index}`}
                    </td>
                    <td className="py-2">{date}</td>
                    <td className="py-2">{time}</td>
                    <td className="py-2 flex space-x-2">
                      <button
                        onClick={() => viewPdf(entry)}
                        className="text-blue-500 hover:text-blue-700"
                        title="View PDF"
                      >
                        <img
                          src={viewIcon}
                          alt="View PDF"
                          className="w-5 h-5"
                        />
                      </button>

                      <button
                        onClick={() => deleteHistoryEntry(entry.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <img src={trashIcon} alt="Delete" className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
