import logo from "@/assets/mindcoder.png";
import { useRef, useState } from "react";
import useInfoStore from "@/stores/useInfoStore";
import useAppStore from "@/stores/useAppStore";
import { useNavigate } from "react-router-dom";
import mammoth from "mammoth";

function HomePage() {
  const {
    model, setModel,
    selectedSteps, setSelectedSteps,
    setNickname, setProjectname,
  } = useInfoStore();

  const {
    uploadedFiles, setUploadedFiles,
    researchQuestion, setResearchQuestion,
    numberOfTopicClusters, setNumberOfTopicClusters,
    clusteringStyle, setClusteringStyle,
    codingStyle, setCodingStyle,
    conceptualizingStyle, setConceptualizingStyle,
  } = useAppStore();

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localResearchQuestion, setLocalResearchQuestion] = useState(researchQuestion);
  const [minCodes, setMinCodes] = useState(numberOfTopicClusters[0]);
  const [maxCodes, setMaxCodes] = useState(numberOfTopicClusters[1]);

  const allowedFileTypes = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  const convertDocxToText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    let text = result.value;
    text = text
      .replace(/<p[^>]*>/gi, "")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text;
  };

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((file) => allowedFileTypes.includes(file.type));
    if (validFiles.length < fileArray.length) {
      alert("Please upload only .docx or .txt format files");
    }
    const processedFiles = await Promise.all(
      validFiles.map(async (file) => {
        if (
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword"
        ) {
          const textContent = await convertDocxToText(file);
          const textBlob = new Blob([textContent], { type: "text/plain" });
          return new File([textBlob], `${file.name}.txt`, { type: "text/plain" });
        }
        return file;
      })
    );
    const updatedFiles = [
      ...(Array.isArray(uploadedFiles) ? uploadedFiles : []),
      ...processedFiles,
    ];
    setUploadedFiles(updatedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleDeleteFile = (index: number) => {
    const updated = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updated);
  };

  const toggleStep = (step: string) => {
    if (selectedSteps.includes(step)) {
      setSelectedSteps(selectedSteps.filter((s) => s !== step));
    } else {
      setSelectedSteps([...selectedSteps, step]);
    }
  };

  const { setAutoRun } = useInfoStore();

  const handleRun = () => {
    const projectName = `project-${Date.now()}`;
    setNickname("user");
    setProjectname(projectName);
    setResearchQuestion(localResearchQuestion);
    setNumberOfTopicClusters([minCodes, maxCodes]);
    setAutoRun(true);
    navigate(`/progress/${projectName}/1`);
  };

  const handleLoadSample = () => {
    navigate("/sample-preview");
  };

  const stepLabels: Record<string, string> = {
    card: "Step 1: Open Coding",
    code: "Step 2: Sub-themes",
    concept: "Step 3: Themes",
    display: "Step 4: Visualization (Report + Mind Map)",
  };

  return (
    <div className="min-h-screen bg-[#FFFBF9] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-8 py-4 border-b border-gray-200">
        <img src={logo} className="h-12 object-contain" alt="MindCoder" />
        <h1 className="text-2xl font-semibold font-zen">MindCoder</h1>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left: Upload + Run */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Upload Area */}
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-xl font-semibold font-zen mb-4">Upload Dataset</h2>
            <div
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 cursor-pointer transition-colors ${
                isDragging
                  ? "border-[#CB9180] bg-[#FFF3EE]"
                  : "border-gray-300 bg-[#FAFAFA] hover:border-[#CB9180] hover:bg-[#FFF3EE]"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-12 h-12 text-[#CB9180] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-zen font-semibold text-gray-600">Drag & drop files here</p>
              <p className="text-sm text-gray-400 mt-1">.txt or .docx files</p>
              <button className="mt-4 px-6 py-2 bg-[#CB9180] text-white rounded-lg hover:bg-[#AA7667] font-zen">
                Browse Files
              </button>
              <input
                type="file"
                multiple
                accept=".txt,.doc,.docx"
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-500 mb-2">{uploadedFiles.length} file(s) uploaded</p>
                <ul className="space-y-1">
                  {uploadedFiles.map((file, i) => (
                    <li key={i} className="flex items-center justify-between text-sm bg-[#FFF3EE] px-3 py-2 rounded-lg">
                      <span className="truncate">{file.name}</span>
                      <button className="text-red-400 hover:text-red-600 ml-2" onClick={(e) => { e.stopPropagation(); handleDeleteFile(i); }}>✕</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleLoadSample}
                className="px-4 py-2 border border-[#CB9180] text-[#CB9180] rounded-lg hover:bg-[#FFF3EE] font-zen text-sm"
              >
                ✨ Try with Sample Data
              </button>
            </div>
          </div>

          {/* Research Questions */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold font-zen mb-3">Research Questions</h2>
            <textarea
              value={localResearchQuestion}
              onChange={(e) => setLocalResearchQuestion(e.target.value)}
              placeholder="Enter your research question(s) to guide the coding process..."
              className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px] resize-y outline-none focus:border-[#CB9180] font-zen text-sm"
            />
          </div>

          {/* Run Mode */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold font-zen mb-3">Run Steps</h2>
            <div className="space-y-2 mb-4">
              {(["card", "code", "concept", "display"] as const).map((step) => (
                <label key={step} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSteps.includes(step)}
                    onChange={() => toggleStep(step)}
                    className="w-4 h-4 accent-[#CB9180]"
                  />
                  <span className="font-zen text-sm">{stepLabels[step]}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleRun}
              disabled={uploadedFiles.length === 0}
              className={`w-full py-3 rounded-xl text-white font-zen font-semibold text-lg transition-colors ${
                uploadedFiles.length > 0
                  ? "bg-[#D39C83] hover:bg-[#CB9180]"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              🚀 Run MindCoder
            </button>
          </div>
        </div>

        {/* Right: Configuration Panel */}
        <div className="lg:w-80 flex flex-col gap-6">
          {/* Model Selection */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold font-zen mb-3">Model</h2>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-[#CB9180] font-zen text-sm"
            >
              <option value="gpt-5-2025-08-07">GPT-5</option>
              <option value="claude-sonnet">Claude Sonnet</option>
            </select>
          </div>

          {/* Number of Codes */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold font-zen mb-3">Number of Codes</h2>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Min</label>
                <input
                  type="number"
                  value={minCodes}
                  onChange={(e) => setMinCodes(Number(e.target.value))}
                  min={1}
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-[#CB9180] text-sm"
                />
              </div>
              <span className="text-gray-400 mt-4">–</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Max</label>
                <input
                  type="number"
                  value={maxCodes}
                  onChange={(e) => setMaxCodes(Number(e.target.value))}
                  min={1}
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-[#CB9180] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Coding Styles */}
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
            <h2 className="text-lg font-semibold font-zen mb-1">Coding Styles</h2>
            <div>
              <label className="text-xs text-gray-500 font-zen">Open Coding Style</label>
              <input
                type="text"
                value={clusteringStyle}
                onChange={(e) => setClusteringStyle(e.target.value)}
                placeholder="e.g., thematic, descriptive..."
                className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-[#CB9180] text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-zen">Sub-theme Style</label>
              <input
                type="text"
                value={codingStyle}
                onChange={(e) => setCodingStyle(e.target.value)}
                placeholder="e.g., axial coding..."
                className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-[#CB9180] text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-zen">Theme Style</label>
              <input
                type="text"
                value={conceptualizingStyle}
                onChange={(e) => setConceptualizingStyle(e.target.value)}
                placeholder="e.g., selective coding..."
                className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-[#CB9180] text-sm mt-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
