import { create } from "zustand";
import axios from "axios";
import { packageData } from "@/api/packageData";
import { updateCodeStoreData } from "@/stores/useCodeStore";
import { updateConceptStoreData } from "@/stores/useConceptStore";
import { updateDisplayStoreData } from "@/stores/useDisplayStore";
import { API_URL } from "@/api/api";
import useInfoStore from "@/stores/useInfoStore";

export type GenStage = "idle" | "code" | "concept" | "display" | "done" | "error";

export const stageLabels: Record<GenStage, string> = {
  idle: "Generate All Steps",
  code: "Generating Sub-themes…",
  concept: "Generating Themes…",
  display: "Generating Summary…",
  done: "✓ Complete",
  error: "⚠ Error — Retry",
};

interface GenerationStore {
  stage: GenStage;
  errorMsg: string;
  runRemaining: () => Promise<void>;
}

const useGenerationStore = create<GenerationStore>((set, get) => ({
  stage: "idle",
  errorMsg: "",

  runRemaining: async () => {
    const { stage } = get();
    if (stage !== "idle" && stage !== "done" && stage !== "error") return;

    const { selectedSteps } = useInfoStore.getState();
    set({ stage: "code", errorMsg: "" });

    try {
      // Step 2: Sub-themes
      if (selectedSteps.includes("code")) {
        const res = await axios.post(API_URL, await packageData("code"));
        await updateCodeStoreData(res.data, true);
      }

      // Step 3: Themes
      set({ stage: "concept" });
      if (selectedSteps.includes("concept")) {
        const res = await axios.post(API_URL, await packageData("concept"));
        await updateConceptStoreData(res.data, true);
      }

      // Step 4: Summary + Graph
      set({ stage: "display" });
      if (selectedSteps.includes("display")) {
        const [reportRes, graphRes] = await Promise.all([
          axios.post(API_URL, await packageData("display", "report")),
          axios.post(API_URL, await packageData("display", "graph")),
        ]);
        await updateDisplayStoreData({ report: reportRes.data });
        await updateDisplayStoreData({ graph: graphRes.data });
      }

      set({ stage: "done" });
    } catch (err: any) {
      console.error("Background generation error:", err);
      set({ stage: "error", errorMsg: err?.message || "Generation failed" });
    }
  },
}));

export default useGenerationStore;
