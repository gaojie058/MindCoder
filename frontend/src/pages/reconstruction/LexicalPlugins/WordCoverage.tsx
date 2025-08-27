import { useMemo, useState, useEffect } from "react";
import useAppStore from "@/stores/useAppStore";
import useEditorStore from "@/stores/useEditorStore";
import useCardStore from "@/stores/useCardStore";
import { manuallyTriggerCoverageCalculation } from "@/api/coverageCalculator";

export default function WordCoverage() {
  const { uploadedFiles, fileCoverageData, setFileCoverageData } =
    useAppStore();
  const { selectedFile } = useEditorStore();
  const { cardData, fileCardMap } = useCardStore();

  // Listen for coverage calculation completed events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e?.detail?.fileName === selectedFile) {
        console.log(
          `Coverage calculation completed for ${selectedFile}, updating display`
        );
        // Force re-render by updating a state
        setForceUpdate((prev) => !prev);
      }
    };

    const recalcHandler = (e: CustomEvent) => {
      if (e?.detail?.fileName === selectedFile) {
        console.log(
          `Coverage recalculated for ${selectedFile}, updating display`
        );
        setForceUpdate((prev) => !prev);
      }
    };

    window.addEventListener("coverageCalculated", handler as EventListener);
    window.addEventListener(
      "coverageRecalculated",
      recalcHandler as EventListener
    );

    return () => {
      window.removeEventListener(
        "coverageCalculated",
        handler as EventListener
      );
      window.removeEventListener(
        "coverageRecalculated",
        recalcHandler as EventListener
      );
    };
  }, [selectedFile]);

  const [forceUpdate, setForceUpdate] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleManualRecalculation = async () => {
    if (!selectedFile || isRecalculating) return;

    setIsRecalculating(true);

    try {
      // Find the file content
      const file = uploadedFiles.find((f) => f.name === selectedFile);
      if (!file) {
        console.error(`File ${selectedFile} not found in uploaded files`);
        return;
      }

      // Read file content
      const fileContent = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || "");
        reader.readAsText(file);
      });

      // Trigger manual recalculation
      manuallyTriggerCoverageCalculation(
        selectedFile,
        fileContent,
        cardData,
        fileCardMap,
        setFileCoverageData
      );
    } catch (error) {
      console.error("Error during manual coverage recalculation:", error);
    } finally {
      setIsRecalculating(false);
    }
  };

  const coverage = useMemo(() => {
    if (!selectedFile || !uploadedFiles.length) {
      return null;
    }

    // Get saved coverage data from store
    const savedCoverage = fileCoverageData[selectedFile];

    if (savedCoverage) {
      console.log(
        `Using saved coverage data for ${selectedFile}:`,
        savedCoverage
      );

      // Check if there's a coverage calculation error or 0 coverage
      if (
        savedCoverage.coveragePercentage === -1 ||
        savedCoverage.coveragePercentage === 0
      ) {
        return {
          totalWords: savedCoverage.totalWords,
          coveredWords: savedCoverage.coveredWords,
          coveragePercentage: savedCoverage.coveragePercentage,
          noCards: false,
          noMatches: false,
          error: true,
        };
      }

      return {
        totalWords: savedCoverage.totalWords,
        coveredWords: savedCoverage.coveredWords,
        coveragePercentage: savedCoverage.coveragePercentage,
        noCards: false,
        noMatches: false,
      };
    }

    // If no saved data, return null
    return null;
  }, [
    selectedFile,
    uploadedFiles,
    fileCoverageData,
    forceUpdate, // Force re-render when coverage is updated
  ]);

  if (!coverage) {
    return (
      <div className="bg-white rounded-lg px-3 py-2 shadow-sm border text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Loading coverage...</span>
          <button
            onClick={handleManualRecalculation}
            disabled={isRecalculating}
            className="ml-auto px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isRecalculating ? "Calculating..." : "Refresh"}
          </button>
        </div>
      </div>
    );
  }

  // If there's a coverage calculation error or 0 coverage, show error message
  if (
    coverage.error ||
    coverage.coveragePercentage === -1 ||
    coverage.coveragePercentage === 0
  ) {
    return (
      <div className="bg-white rounded-lg px-3 py-2 shadow-sm border text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Coverage:</span>
          <span className="text-red-500 font-semibold">Calculation Error</span>
          <span className="text-gray-500 text-xs">
            ({coverage.totalWords} words)
          </span>
          <button
            onClick={handleManualRecalculation}
            disabled={isRecalculating}
            className="ml-auto px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {isRecalculating ? "Recalculating..." : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  const getColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="bg-white rounded-lg px-3 py-2 shadow-sm border text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-600">Coverage:</span>
        <span
          className={`font-semibold ${getColor(coverage.coveragePercentage)}`}
        >
          {coverage.coveragePercentage}%
        </span>
        <span className="text-gray-500 text-xs">
          ({coverage.coveredWords}/{coverage.totalWords})
        </span>
        <button
          onClick={handleManualRecalculation}
          disabled={isRecalculating}
          className="ml-auto px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          title="Recalculate coverage"
        >
          {isRecalculating ? "..." : "↻"}
        </button>
      </div>
    </div>
  );
}
