import { create } from "zustand";
import axios from "axios";
import { packageData } from "@/api/packageData";
import { updateStoreData } from "@/stores/useCardStore";
import { updateCodeStoreData } from "@/stores/useCodeStore";
import { updateConceptStoreData } from "@/stores/useConceptStore";
import useDisplayStore, { updateDisplayStoreData } from "@/stores/useDisplayStore";
import { API_URL, fetchStream } from "@/api/api";
import useInfoStore from "@/stores/useInfoStore";
import useAppStore from "@/stores/useAppStore";
import useCardStore from "@/stores/useCardStore";
import useVersionStore from "@/stores/useVersionStore";

export type GenStage = "idle" | "card" | "code" | "concept" | "display" | "done" | "error";

export const stageLabels: Record<GenStage, string> = {
  idle: "Generate Sub-themes & Themes",
  card: "Generating Open Codes…",
  code: "Generating Sub-themes…",
  concept: "Generating Themes…",
  display: "Generating Summary…",
  done: "✓ Complete",
  error: "⚠ Error — Retry",
};

interface GenerationStore {
  // Background "Generate All Steps" state
  bgStage: GenStage;
  bgRunning: boolean;
  bgError: string;
  runRemaining: () => Promise<void>;
  runAllSelected: () => Promise<void>;

  // Regenerate (single step / subsequent) state
  regenStage: GenStage;
  regenRunning: boolean;
  regenError: string;
  regenerateStep: (stepName: string) => Promise<void>;
  regenerateSubsequent: (stepName: string) => Promise<void>;

  // Combined check
  isRunning: boolean;
}

async function executeStepAndSave(step: string, taskType?: string) {
  await executeStep(step, taskType);
  // Auto-save version after each successful generation
  useVersionStore.getState().saveVersion(step);
}

/**
 * Helper: send formData via streaming SSE and return { message: fullText }.
 * Falls back to regular axios POST if streaming fails with a network error.
 */
async function postWithStream(formData: FormData): Promise<{ message: string }> {
  try {
    const text = await fetchStream(formData);
    return { message: text };
  } catch (err: any) {
    console.warn("Streaming failed, falling back to non-stream:", err?.message);
    const response = await axios.post(API_URL, formData);
    return response.data;
  }
}

async function executeStep(step: string, taskType?: string) {
  if (step === "card") {
    const { uploadedFiles } = useAppStore.getState();
    if (uploadedFiles && uploadedFiles.length > 0) {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const formData = await packageData("card", undefined, [], file);
        const data = await postWithStream(formData);
        await updateStoreData(data, file.name, i === 0);
      }
    } else {
      const data = await postWithStream(await packageData("card"));
      await updateStoreData(data, undefined, true);
    }
  } else if (step === "code") {
    const data = await postWithStream(await packageData("code"));
    await updateCodeStoreData(data, true);
  } else if (step === "concept") {
    const data = await postWithStream(await packageData("concept"));
    await updateConceptStoreData(data, true);
  } else if (step === "display") {
    const data = await postWithStream(await packageData("display", "report"));
    await updateDisplayStoreData({ report: data });
  }
}

const useGenerationStore = create<GenerationStore>((set, get) => ({
  bgStage: "idle",
  bgRunning: false,
  bgError: "",

  regenStage: "idle",
  regenRunning: false,
  regenError: "",

  get isRunning() { return get().bgRunning || get().regenRunning; },

  runRemaining: async () => {
    if (get().bgRunning || get().regenRunning) return;

    const { selectedSteps } = useInfoStore.getState();
    set({ bgStage: "code", bgError: "", bgRunning: true });

    try {
      if (selectedSteps.includes("code")) {
        set({ bgStage: "code" });
        await executeStepAndSave("code");
      }
      if (selectedSteps.includes("concept")) {
        set({ bgStage: "concept" });
        await executeStepAndSave("concept");
      }
      // display (report) generation skipped — user can generate via Export to PDF
      set({ bgStage: "done", bgRunning: false });
    } catch (err: any) {
      console.error("Background generation error:", err);
      set({ bgStage: "error", bgError: err?.message || "Generation failed", bgRunning: false });
    }
  },

  runAllSelected: async () => {
    if (get().bgRunning || get().regenRunning) return;

    const { selectedSteps } = useInfoStore.getState();
    const allSteps: string[] = ["card", "code", "concept"];
    const stepsToRun = allSteps.filter((s) => selectedSteps.includes(s));

    if (stepsToRun.length === 0) return;

    set({ bgStage: stepsToRun[0] as GenStage, bgError: "", bgRunning: true });

    try {
      for (const step of stepsToRun) {
        set({ bgStage: step as GenStage });
        if (step === "card") {
          useCardStore.getState().setCardData([]);
          useCardStore.setState({ fileCardMap: {} });
        }
        await executeStepAndSave(step);
      }
      set({ bgStage: "done", bgRunning: false });
    } catch (err: any) {
      console.error("Run all selected error:", err);
      set({ bgStage: "error", bgError: err?.message || "Generation failed", bgRunning: false });
    }
  },

  regenerateStep: async (stepName: string) => {
    if (get().bgRunning || get().regenRunning) return;

    set({ regenStage: stepName as GenStage, regenError: "", regenRunning: true });

    try {
      if (stepName === "card") {
        // Clear card data before regeneration so new results replace old
        useCardStore.getState().setCardData([]);
        useCardStore.setState({ fileCardMap: {} });
      }
      if (stepName === "display") {
        useDisplayStore.getState().set({
          renderedGraphSvg: null, viewState: {}, activeGraphType: "mindmap",
        });
      }
      await executeStepAndSave(stepName);
      if (stepName === "display") {
        window.dispatchEvent(new CustomEvent("graph-regenerated"));
      }
      set({ regenStage: "done", regenRunning: false });
    } catch (err: any) {
      console.error("Regenerate step error:", err);
      set({ regenStage: "error", regenError: err?.message || "Regeneration failed", regenRunning: false });
    }
  },

  regenerateSubsequent: async (stepName: string) => {
    if (get().bgRunning || get().regenRunning) return;

    set({ regenStage: stepName as GenStage, regenError: "", regenRunning: true });

    try {
      const steps = ["card", "code", "concept", "display"];
      const startIdx = steps.indexOf(stepName);
      if (startIdx === -1) throw new Error("Unknown step: " + stepName);

      for (let i = startIdx; i < steps.length; i++) {
        set({ regenStage: steps[i] as GenStage });
        if (steps[i] === "display") {
          useDisplayStore.getState().set({
            renderedGraphSvg: null, viewState: {}, activeGraphType: "mindmap",
          });
        }
        await executeStepAndSave(steps[i]);
      }
      window.dispatchEvent(new CustomEvent("graph-regenerated"));
      set({ regenStage: "done", regenRunning: false });
    } catch (err: any) {
      console.error("Regenerate subsequent error:", err);
      set({ regenStage: "error", regenError: err?.message || "Regeneration failed", regenRunning: false });
    }
  },
}));

export default useGenerationStore;
