import logo from "@/assets/frameLogo.png";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAppStore from "@/stores/useAppStore";

const SAMPLE_FILES = [
  { name: "Interview_1.txt", path: "/sample_data/Interview_1.txt" },
  { name: "Interview_2.txt", path: "/sample_data/Interview_2.txt" },
  { name: "Interview_3.txt", path: "/sample_data/Interview_3.txt" },
];

function SampleDataPreview() {
  const navigate = useNavigate();
  const { setUploadedFiles } = useAppStore();
  const [contents, setContents] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(SAMPLE_FILES.map((f) => [f.name, true]))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      SAMPLE_FILES.map(async (f) => {
        const res = await fetch(f.path);
        if (!res.ok) {
          console.error(`Failed to load ${f.path}: ${res.status}`);
          return [f.name, ""] as [string, string];
        }
        const text = await res.text();
        return [f.name, text] as [string, string];
      })
    ).then((entries) => {
      setContents(Object.fromEntries(entries));
      setLoading(false);
    });
  }, []);

  const handleConfirm = () => {
    const files = SAMPLE_FILES.filter((f) => selected[f.name]).map((f) => {
      const blob = new Blob([contents[f.name] || ""], { type: "text/plain" });
      return new File([blob], f.name, { type: "text/plain" });
    });
    if (files.length === 0) {
      alert("Please select at least one file.");
      return;
    }
    setUploadedFiles(files);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#FFFBF9] flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-8 py-4 max-w-[1400px] mx-auto w-full">
          <div className="flex items-center gap-4">
            <img src={logo} className="h-10 object-contain" alt="MindCoder" />
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <h2 className="text-xl font-semibold font-zen mb-6">Select Sample Data Files</h2>

        {loading ? (
          <p className="text-gray-500 font-zen">Loading sample files...</p>
        ) : (
          <div className="space-y-6">
            {SAMPLE_FILES.map((f) => (
              <div key={f.name} className="bg-white rounded-2xl shadow-md p-6">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={selected[f.name]}
                    onChange={() =>
                      setSelected((s) => ({ ...s, [f.name]: !s[f.name] }))
                    }
                    className="w-5 h-5 accent-[#CB9180]"
                  />
                  <span className="text-lg font-semibold font-zen">{f.name}</span>
                </label>
                <div className="border border-gray-200 rounded-lg p-4 max-h-[200px] overflow-y-auto bg-[#FAFAFA]">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {contents[f.name] || ""}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 font-zen"
          >
            ← Back
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-3 bg-[#D39C83] text-white rounded-xl hover:bg-[#CB9180] font-zen font-semibold"
          >
            ✓ Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
}

export default SampleDataPreview;
