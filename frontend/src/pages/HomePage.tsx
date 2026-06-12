import logo from "@/assets/frameLogo.png";
import { useRef, useState } from "react";
import useInfoStore from "@/stores/useInfoStore";
import useAppStore from "@/stores/useAppStore";
import useGenerationStore, { stageLabels } from "@/stores/useGenerationStore";
import { useNavigate } from "react-router-dom";
import mammoth from "mammoth";
import { convertTrajectoryToText } from "@/utils/trajectoryToText";
import { FileText, FileType2, FileJson2 } from "lucide-react";

// Data types accepted by the upload area — shown as large icons in the dropzone.
const SUPPORTED_TYPES = [
  { Icon: FileText, label: "Plain Text", ext: ".txt" },
  { Icon: FileType2, label: "Word Doc", ext: ".doc / .docx" },
  { Icon: FileJson2, label: "Trajectory", ext: ".json / .jsonl" },
];

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
  const [savedStep] = useState(() => sessionStorage.getItem("mindcoder-last-step"));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const bgStage = useGenerationStore((s) => s.bgStage);
  const bgRunning = useGenerationStore((s) => s.bgRunning);
  const regenStage = useGenerationStore((s) => s.regenStage);
  const regenRunning = useGenerationStore((s) => s.regenRunning);
  const genIsRunning = bgRunning || regenRunning;

  const allowedFileTypes = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/json",
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
    const validFiles = fileArray.filter(
      (file) =>
        allowedFileTypes.includes(file.type) ||
        /\.(txt|doc|docx|json|jsonl)$/i.test(file.name)
    );
    if (validFiles.length < fileArray.length) {
      alert("Please upload only .txt, .docx, or .json format files");
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
        // Trajectory JSON/JSONL → readable transcript for the coding pipeline.
        if (file.type === "application/json" || /\.(json|jsonl)$/i.test(file.name)) {
          const rawText = await file.text();
          const transcript = convertTrajectoryToText(rawText);
          if (transcript) {
            const textBlob = new Blob([transcript], { type: "text/plain" });
            const stem = file.name.replace(/\.(json|jsonl)$/i, "");
            return new File([textBlob], `${stem}.txt`, { type: "text/plain" });
          }
          // Not a recognizable trajectory — keep the raw JSON as plain text.
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
    navigate(`/reconstruction/${projectName}/1/card`);
  };

  const handleLoadSample = () => {
    navigate("/sample-preview");
  };

  const stepLabels: Record<string, string> = {
    card: "Step 1: Open Coding",
    code: "Step 2: Sub-themes",
    concept: "Step 3: Themes",
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="material-bar sticky top-0 z-30 border-b border-border">
        <div className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 max-w-[1400px] mx-auto w-full">
          <div className="flex items-center gap-4">
            <img src={logo} className="h-8 sm:h-10 object-contain" alt="MindCoder" />
          </div>
          {savedStep && (
            <button
              onClick={() => {
                window.location.hash = savedStep.replace(/^#/, "");
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md transition-all active:scale-[0.97] font-zen text-footnote sm:text-subhead flex items-center gap-2"
            >
              Return to Analysis
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Generation status banner */}
      {genIsRunning && (
        <div className="mx-auto max-w-[1400px] w-full px-4 sm:px-6 pt-3 sm:pt-4 space-y-2">
          {bgRunning && (
            <div className="flex items-center gap-3 bg-primary-tint border border-primary/30 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
              <span className="font-zen text-footnote sm:text-subhead text-primary font-semibold">
                {stageLabels[bgStage]}
              </span>
            </div>
          )}
          {regenRunning && (
            <div className="flex items-center gap-3 bg-ai-tint border border-ai-border/60 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3">
              <div className="w-4 h-4 border-2 border-ai/30 border-t-ai rounded-full animate-spin shrink-0" />
              <span className="font-zen text-footnote sm:text-subhead text-ai font-semibold">
                {stageLabels[regenStage]}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 p-4 sm:p-6 max-w-[1400px] mx-auto w-full">
        {/* Left: Upload + Run */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-6">
          {/* Upload Area */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-8">
            <h2 className="text-lg sm:text-xl font-semibold font-zen mb-3 sm:mb-4">Upload Dataset</h2>
            <div
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 sm:p-12 cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary-tint"
                  : "border-input bg-muted/40 hover:border-primary hover:bg-primary-tint"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex items-start justify-center gap-4 sm:gap-7 mb-4 sm:mb-5">
                {SUPPORTED_TYPES.map(({ Icon, label, ext }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 w-[72px] sm:w-20">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-tint border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
                    </div>
                    <span className="text-xs sm:text-sm font-zen font-semibold text-foreground leading-tight text-center">{label}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground leading-none text-center">{ext}</span>
                  </div>
                ))}
              </div>
              <p className="text-base sm:text-lg font-zen font-semibold text-muted-foreground text-center">
                <span className="hidden sm:inline">Drag & drop files here</span>
                <span className="sm:hidden">Tap to upload files</span>
              </p>
              <button className="mt-3 sm:mt-4 px-5 sm:px-6 py-2 bg-primary text-primary-foreground rounded-xl shadow-sm hover:bg-primary-hover hover:shadow-md transition-all active:scale-[0.97] font-zen text-subhead">
                Browse Files
              </button>
              <input
                type="file"
                multiple
                accept=".txt,.doc,.docx,.json,.jsonl"
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 sm:mt-4">
                <p className="text-sm font-semibold text-muted-foreground mb-2">{uploadedFiles.length} file(s) uploaded</p>
                <ul className="space-y-1">
                  {uploadedFiles.map((file, i) => (
                    <li key={i} className="flex items-center justify-between text-subhead bg-primary-tint px-3 py-2 rounded-xl">
                      <span className="truncate">{file.name}</span>
                      <button className="text-destructive/70 hover:text-destructive ml-2 p-1" onClick={(e) => { e.stopPropagation(); handleDeleteFile(i); }}>✕</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 sm:mt-4">
              <button
                onClick={handleLoadSample}
                className="px-4 py-2 border border-primary/40 text-primary rounded-xl hover:bg-primary-tint transition-colors active:scale-[0.97] font-zen text-subhead w-full sm:w-auto"
              >
                ✨ Try with Sample Data
              </button>
            </div>
          </div>

          {/* Research Questions */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold font-zen mb-2 sm:mb-3">Research Questions</h2>
            <textarea
              value={localResearchQuestion}
              onChange={(e) => setLocalResearchQuestion(e.target.value)}
              placeholder="Enter your research question(s) to guide the coding process..."
              className="w-full border border-input rounded-lg p-3 min-h-[80px] sm:min-h-[100px] resize-y outline-none focus:border-primary font-zen text-sm"
            />
          </div>

          {/* Run Steps + Run Button */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold font-zen mb-2 sm:mb-3">Run Steps</h2>
            <div className="space-y-2 mb-4">
              {(["card", "code", "concept"] as const).map((step) => (
                <label key={step} className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={selectedSteps.includes(step)}
                    onChange={() => toggleStep(step)}
                    className="w-5 h-5 accent-primary"
                  />
                  <span className="font-zen text-sm">{stepLabels[step]}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleRun}
              disabled={uploadedFiles.length === 0}
              className={`group w-full py-3.5 sm:py-3 rounded-2xl font-zen font-semibold text-callout sm:text-title3 transition-all duration-150 ease-out flex items-center justify-center gap-2 ${
                uploadedFiles.length > 0
                  ? "text-primary-foreground bg-primary shadow-md hover:bg-primary-hover hover:shadow-lg active:scale-[0.99]"
                  : "text-muted-foreground bg-muted border border-border cursor-not-allowed"
              }`}
            >
              <span className={`text-xl transition-transform duration-200 ${uploadedFiles.length > 0 ? "group-hover:-translate-y-0.5 group-hover:rotate-12" : ""}`}>
                🚀
              </span>
              {uploadedFiles.length > 0 ? "Run MindCoder" : "Upload data to run"}
            </button>
          </div>
        </div>

        {/* Right: Configuration Panel — collapsible on mobile */}
        <div className="lg:w-80 flex flex-col gap-4 sm:gap-6">
          {/* Advanced Settings Toggle (mobile only) */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="lg:hidden flex items-center justify-between w-full bg-card rounded-2xl border border-border shadow-sm p-4 text-left"
          >
            <span className="font-zen font-semibold text-base text-foreground">⚙️ Advanced Settings</span>
            <svg
              className={`w-5 h-5 text-muted-foreground transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className={`flex flex-col gap-4 sm:gap-6 ${showAdvanced ? '' : 'hidden lg:flex'}`}>
            {/* Model Selection */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold font-zen mb-2 sm:mb-3">Model</h2>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full border border-input rounded-lg p-2.5 sm:p-2 outline-none focus:border-primary font-zen text-sm"
              >
                <option value="deepseek-chat">DeepSeek V3</option>
                <option value="deepseek-reasoner">DeepSeek R1</option>
                <option value="kimi-k2-0711-preview" disabled>Kimi K2 (unavailable)</option>
                <option value="gpt-5-2025-08-07" disabled>GPT-5 (unavailable)</option>
                <option value="claude-sonnet" disabled>Claude Sonnet (unavailable)</option>
              </select>
            </div>

            {/* Number of Codes */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold font-zen mb-2 sm:mb-3">Number of Codes</h2>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Min</label>
                  <input
                    type="number"
                    value={minCodes}
                    onChange={(e) => setMinCodes(Number(e.target.value))}
                    min={1}
                    className="w-full border border-input rounded-lg p-2.5 sm:p-2 outline-none focus:border-primary text-sm"
                  />
                </div>
                <span className="text-muted-foreground mt-4 text-lg">–</span>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Max</label>
                  <input
                    type="number"
                    value={maxCodes}
                    onChange={(e) => setMaxCodes(Number(e.target.value))}
                    min={1}
                    className="w-full border border-input rounded-lg p-2.5 sm:p-2 outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Coding Styles */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6 space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg font-semibold font-zen mb-1">Coding Styles</h2>
              <div>
                <label className="text-xs text-muted-foreground font-zen">Open Coding Style</label>
                <input
                  type="text"
                  value={clusteringStyle}
                  onChange={(e) => setClusteringStyle(e.target.value)}
                  placeholder="e.g., thematic, descriptive..."
                  className="w-full border border-input rounded-lg p-2.5 sm:p-2 outline-none focus:border-primary text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-zen">Sub-theme Style</label>
                <input
                  type="text"
                  value={codingStyle}
                  onChange={(e) => setCodingStyle(e.target.value)}
                  placeholder="e.g., axial coding..."
                  className="w-full border border-input rounded-lg p-2.5 sm:p-2 outline-none focus:border-primary text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-zen">Theme Style</label>
                <input
                  type="text"
                  value={conceptualizingStyle}
                  onChange={(e) => setConceptualizingStyle(e.target.value)}
                  placeholder="e.g., selective coding..."
                  className="w-full border border-input rounded-lg p-2.5 sm:p-2 outline-none focus:border-primary text-sm mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
