import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { packageData } from "@/api/packageData";
import useAppStore from "@/stores/useAppStore";
import { updateStoreData } from "@/stores/useCardStore";
import { updateCodeStoreData } from "@/stores/useCodeStore";
import useConceptStore, { updateConceptStoreData } from "@/stores/useConceptStore";
import useDisplayStore, { updateDisplayStoreData } from "@/stores/useDisplayStore";
import renderPDF from "./renderPDF";
import { API_URL } from "./api";
import { create } from "zustand";
import useHistoryStore from "@/stores/useHistoryStore";
import useVersionStore from "@/stores/useVersionStore";
import { getWithExpiry, setWithExpiry } from "@/stores/utils";
import useCardStore from "@/stores/useCardStore";
import useEditorStore from "@/stores/useEditorStore";
import useInfoStore from "@/stores/useInfoStore";
import { manuallyTriggerCoverageCalculation } from "./coverageCalculator";

interface GenerateState {
  hasFullGenerated: boolean;
  setHasFullGenerated: (value: boolean) => void;
  processedFiles: string[];
  addProcessedFile: (fileName: string) => void;
}

export const useGenerateStore = create<GenerateState>((set, get) => ({
  // Initialize with saved value from localStorage, or false if not found
  hasFullGenerated: getWithExpiry('hasFullGenerated') === 'true' || false,

  setHasFullGenerated: (value) => {
    // Save to localStorage when the state changes
    setWithExpiry('hasFullGenerated', value.toString());
    set({ hasFullGenerated: value });
  },

  processedFiles: [],

  addProcessedFile: (fileName) => {
    const updatedFiles = [...get().processedFiles, fileName];
    // Do not save to localStorage - keep as ephemeral state
    set({ processedFiles: updatedFiles });
  },
}));

export const useGenerate = () => {
  const navigate = useNavigate();
  const { project, step } = useParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("Initializing...");


  // const [pdfData, setPdfData] = useState<string | null>(null);
  const { hasFullGenerated, setHasFullGenerated, addProcessedFile } = useGenerateStore();
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleGenerate = async (targetStep?: string) => {
    if (!project || !step) {
      throw new Error("Project and step must be defined");
    }
    setLoading(true);

    try {
      if (!targetStep) {
        // Full generation case - respect selected steps
        const { selectedSteps } = useInfoStore.getState();
        console.log("Starting generation with selected steps:", selectedSteps);

        // Clear the card data BEFORE regeneration
        useCardStore.getState().setCardData([]);
        useCardStore.setState({ fileCardMap: {} });

        useDisplayStore.getState().set({
          renderedGraphSvg: null,
          viewState: {},
          activeGraphType: "mindmap"
        });

        if (selectedSteps.includes("card")) {
          await executeGenerationStep("card");
        }
        if (selectedSteps.includes("code")) {
          await executeGenerationStep("code");
        }
        if (selectedSteps.includes("concept")) {
          await executeGenerationStep("concept");
        }
        if (selectedSteps.includes("display")) {
          await Promise.all([
            executeGenerationStep("display", "report"),
            executeGenerationStep("display", "graph")
          ]);
        }
        setHasFullGenerated(true);
        return;
      }

      if (targetStep === "card") {
        // Don't clear data before regeneration — keep old codes visible
        // Data will be replaced when new results arrive via updateStoreData
        await executeGenerationStep("card");
      } else if (targetStep === "display") {
        // Reset display store before regenerating display items
        useDisplayStore.getState().set({
          renderedGraphSvg: null,
          viewState: {},
          activeGraphType: "mindmap"
        });

        await Promise.all([
          executeGenerationStep("display", "report"),
          executeGenerationStep("display", "graph")
        ]);
      } else {
        await executeGenerationStep(targetStep);
      }
    } finally {
      setLoading(false);
    }
  };

  const executeGenerationStep = async (storeType: string, taskType?: string) => {
    const stepProgressMap: Record<string, string> = {
      card: "Open Coding",
      code: "Developing Sub-themes",
      concept: "Developing Themes",
      display: taskType === "report" ? "Generating Summary" : "Generating Summary & Mapping",
    };
    setProgress(stepProgressMap[storeType] || "Processing...");

    if (storeType === 'card') {
      // Get uploaded files from the store
      const { uploadedFiles } = useAppStore.getState();

      // Process each file separately
      if (uploadedFiles && uploadedFiles.length > 0) {
        // Update progress to show which file is being processed
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          setProgress(`Processing File ${i + 1}/${uploadedFiles.length}`);

          // Create package data for this specific file
          const formData = await packageData(storeType, undefined, [], file);


          // Send request for this file
          const response = await axios.post(
            API_URL,
            formData
          );

          // For the first file, reset IDs. For subsequent files, don't reset to maintain sequential IDs
          const shouldResetIds = i === 0;

          console.log(`Processing file ${i + 1}/${uploadedFiles.length}: ${file.name}, shouldResetIds: ${shouldResetIds}`);

          // Update store with the response, passing the filename and reset flag
          await updateStoreData(response.data, file.name, shouldResetIds);

          // Mark this file as processed
          addProcessedFile(file.name);
        }

        // After all files are processed, trigger coverage recalculation for all files
        await triggerCoverageRecalculationForAllFiles();
      } else {
        // No files case - still need to make a request
        const response = await axios.post(
          API_URL,
          await packageData(storeType)
        );

        // Always reset IDs for full regeneration with no files
        await updateStoreData(response.data, undefined, true);
      }
    } else {
      // For other store types, proceed as before
      const response = await axios.post(
        API_URL,
        await packageData(storeType, taskType)
      );

      switch (storeType) {
        case 'code':
          await updateCodeStoreData(response.data, true);
          break;
        case 'concept':
          await updateConceptStoreData(response.data, true);
          break;
        case 'display':
          if (taskType === 'report') {
            await updateDisplayStoreData({ report: response.data });
          } else if (taskType === 'graph') {
            await updateDisplayStoreData({ graph: response.data });
          }
          break;
      }
    }

    if (storeType === 'display' && taskType === 'graph') {
      window.dispatchEvent(new CustomEvent('graph-regenerated'));
    }

    // Auto-save version after each successful generation step
    useVersionStore.getState().saveVersion(storeType);
  };

  // Add this new function to trigger coverage recalculation for all files
  const triggerCoverageRecalculationForAllFiles = async () => {
    const { uploadedFiles, setFileCoverageData } = useAppStore.getState();
    const { cardData, fileCardMap } = useCardStore.getState();

    console.log('Triggering coverage recalculation for all files after card regeneration');

    // Process each file
    for (const file of uploadedFiles) {
      try {
        // Read file content
        const fileContent = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || "");
          reader.readAsText(file);
        });

        // Trigger coverage calculation
        manuallyTriggerCoverageCalculation(
          file.name,
          fileContent,
          cardData,
          fileCardMap,
          setFileCoverageData
        );

        console.log(`Coverage recalculation triggered for ${file.name}`);
      } catch (error) {
        console.error(`Error triggering coverage recalculation for ${file.name}:`, error);
      }
    }
  };

  const generatePDF = async (activeGraphType = "mindmap") => {
    try {
      setPdfLoading(true);
      const { report } = useDisplayStore.getState();

      if (!report) {
        throw new Error("Report data is not available");
      }

      useDisplayStore.getState().set({ activeGraphType });

      // Use frontend pdfmake
      const conceptData = useConceptStore.getState().conceptData;
      await renderPDF(report, conceptData);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setPdfLoading(false);
    }
  };

  // Add new function to regenerate all subsequent steps
  const handleRegenerateSubsequent = async (currentStep: string) => {
    if (!project || !step) {
      throw new Error("Project and step must be defined");
    }
    setLoading(true);

    try {
      // Determine which steps to regenerate based on current step
      switch (currentStep) {
        case "card":
          await executeGenerationStep("code");
          await executeGenerationStep("concept");
          await Promise.all([
            executeGenerationStep("display", "report"),
            executeGenerationStep("display", "graph")
          ]);
          break;
        case "code":
          await executeGenerationStep("concept");
          await Promise.all([
            executeGenerationStep("display", "report"),
            executeGenerationStep("display", "graph")
          ]);
          break;
        case "concept":
          await Promise.all([
            executeGenerationStep("display", "report"),
            executeGenerationStep("display", "graph")
          ]);
          break;
        case "display":
          // No subsequent steps to regenerate
          break;
        default:
          console.error("Unknown step type:", currentStep);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    handleGenerate,
    handleRegenerateSubsequent,
    loading,
    progress,
    step,
    hasFullGenerated,
    handleGeneratePDF: async (activeGraphType = "mindmap") => {
      try {
        await generatePDF(activeGraphType);

        if (!hasFullGenerated) {
          setHasFullGenerated(true);
        }

        return true;
      } catch (error) {
        console.error("Error in generatePDF wrapper:", error);
        return false;
      }
    },
    generatePDF,
    pdfLoading
  };
};
