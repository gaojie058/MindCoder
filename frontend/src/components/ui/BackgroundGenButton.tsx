import { useState, useCallback } from "react";
import axios from "axios";
import { packageData } from "@/api/packageData";
import { updateCodeStoreData } from "@/stores/useCodeStore";
import { updateConceptStoreData } from "@/stores/useConceptStore";
import { updateDisplayStoreData } from "@/stores/useDisplayStore";
import { API_URL } from "@/api/api";
import useInfoStore from "@/stores/useInfoStore";

type GenStage = "idle" | "code" | "concept" | "display" | "done" | "error";

const stageLabels: Record<GenStage, string> = {
  idle: "Generate All Steps",
  code: "Generating Sub-themes…",
  concept: "Generating Themes…",
  display: "Generating Summary…",
  done: "✓ Complete",
  error: "⚠ Error — Retry",
};

export default function BackgroundGenButton() {
  const [stage, setStage] = useState<GenStage>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const runRemaining = useCallback(async () => {
    if (stage !== "idle" && stage !== "done" && stage !== "error") return;

    const { selectedSteps } = useInfoStore.getState();
    setStage("code");
    setErrorMsg("");

    try {
      // Step 2: Sub-themes
      if (selectedSteps.includes("code")) {
        const res = await axios.post(API_URL, await packageData("code"));
        await updateCodeStoreData(res.data, true);
      }

      // Step 3: Themes
      setStage("concept");
      if (selectedSteps.includes("concept")) {
        const res = await axios.post(API_URL, await packageData("concept"));
        await updateConceptStoreData(res.data, true);
      }

      // Step 4: Summary + Graph
      setStage("display");
      if (selectedSteps.includes("display")) {
        const [reportRes, graphRes] = await Promise.all([
          axios.post(API_URL, await packageData("display", "report")),
          axios.post(API_URL, await packageData("display", "graph")),
        ]);
        await updateDisplayStoreData({ report: reportRes.data });
        await updateDisplayStoreData({ graph: graphRes.data });
      }

      setStage("done");
    } catch (err: any) {
      console.error("Background generation error:", err);
      setErrorMsg(err?.message || "Generation failed");
      setStage("error");
    }
  }, [stage]);

  const isRunning = stage === "code" || stage === "concept" || stage === "display";

  return (
    <button
      onClick={runRemaining}
      disabled={isRunning}
      title={errorMsg || undefined}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-zen font-semibold transition-all ${
        isRunning
          ? "bg-[#CB9180]/10 text-[#CB9180] cursor-wait"
          : stage === "done"
          ? "bg-green-50 text-green-600 hover:bg-green-100"
          : stage === "error"
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : "bg-[#CB9180] text-white hover:bg-[#AA7667] cursor-pointer"
      }`}
    >
      {isRunning && (
        <div className="w-3.5 h-3.5 border-2 border-[#CB9180]/30 border-t-[#CB9180] rounded-full animate-spin" />
      )}
      {stage === "done" && "✓ "}
      {stageLabels[stage]}
    </button>
  );
}
