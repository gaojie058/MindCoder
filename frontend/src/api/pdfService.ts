/**
 * PDF Service — serializes store data and calls the Python ReportLab server.
 */
import useAppStore from "@/stores/useAppStore";
import useCardStore from "@/stores/useCardStore";
import useCodeStore from "@/stores/useCodeStore";
import useConceptStore from "@/stores/useConceptStore";
import useDisplayStore from "@/stores/useDisplayStore";
import useInfoStore from "@/stores/useInfoStore";
import useEditStore from "@/stores/useEditStore";
import useLLMHistoryStore from "@/stores/useLLMHistoryStore";

const PDF_SERVER = "http://localhost:8787";

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Build the JSON payload for the PDF server. */
export function buildPDFData(): Record<string, any> {
  const app = useAppStore.getState();
  const { model } = useInfoStore.getState();
  const { cardData, fileCardMap, whatLLMDid: cardWhat, rationale: cardRat, llmDescription: cardDesc } = useCardStore.getState();
  const { codeData, whatLLMDid: codeWhat, rationale: codeRat, llmDescription: codeDesc } = useCodeStore.getState();
  const { conceptData, whatLLMDid: conceptWhat, rationale: conceptRat, llmDescription: conceptDesc } = useConceptStore.getState();
  const { report } = useDisplayStore.getState() as any;
  const { llmHistory = [] } = useLLMHistoryStore.getState();
  const edit = useEditStore.getState() as any;

  // Config
  const config: Record<string, any> = { model };
  if (app.researchQuestion?.trim()) config.researchQuestion = app.researchQuestion.trim();
  if (app.numberOfTopicClusters?.length === 2) {
    config.openCodesRange = `${app.numberOfTopicClusters[0]}–${app.numberOfTopicClusters[1]} per file`;
  }
  if (app.uploadedFiles?.length) {
    config.files = app.uploadedFiles.map((f) => f.name.replace(/\.txt$/i, ""));
  }

  // Coverage
  const coverage = app.uploadedFiles?.map((f) => {
    const cov = app.fileCoverageData?.[f.name];
    return {
      name: f.name.replace(/\.txt$/i, ""),
      percentage: cov?.coveragePercentage ?? 0,
      totalWords: cov?.totalWords ?? 0,
      coveredWords: cov?.coveredWords ?? 0,
    };
  }) || [];

  // Findings
  let sections: any[] = [];
  if (report?.Sections?.length) sections = report.Sections;
  else if (report?.sections?.length) sections = report.sections;
  else if (report?.Report?.Sections?.length) sections = report.Report.Sections;

  const findings = sections.map((sec: any) => ({
    title: sec.Title || sec.title || "",
    content: sec.Content || sec.content || "",
    subsections: (sec.Subsections || []).map((sub: any) => ({
      title: sub.Title || sub.title || "",
      content: sub.Content || sub.content || "",
    })),
  }));

  const conclusion = report?.Conclusion || report?.conclusion || "";

  // Themes (for codebook)
  const themes = conceptData.map((concept: any) => {
    const codes = Object.values(concept.codes || {}).flat() as any[];
    return {
      name: concept.name,
      isAI: concept.isGPT !== false,
      definition: concept.definition || "",
      subthemes: codes.map((code: any) => {
        const cards = Object.values(code.data || {}).flat() as any[];
        return {
          name: code.name,
          isAI: code.isGPT !== false,
          definition: code.definition || "",
          openCodes: cards
            .filter((c: any) => c.active !== false)
            .map((card: any) => ({
              name: card.name,
              isAI: card.isGPT !== false,
              segmentCount: (card.topics || []).length,
              segments: (card.topics || []).map((t: any) => t.content || ""),
            })),
        };
      }),
    };
  });

  // Steps (for process page)
  const stepConfigs = [
    { label: "Step 1: Open Codes", data: cardData, isCard: true, desc: cardDesc, what: cardWhat, rat: cardRat, memoKey: "topicMemo", historyStep: "card" },
    { label: "Step 2: Sub-themes", data: codeData, isCard: false, desc: codeDesc, what: codeWhat, rat: codeRat, memoKey: "codeMemo", historyStep: "code" },
    { label: "Step 3: Themes", data: conceptData, isCard: false, desc: conceptDesc, what: conceptWhat, rat: conceptRat, memoKey: "conceptMemo", historyStep: "concept" },
  ];

  const steps = stepConfigs.map((s) => {
    const data = s.data || [];
    let ai = 0, human = 0;
    data.forEach((d: any) => { if (s.isCard ? d.isGPT : d.isGPT !== false) ai++; else human++; });

    const history = llmHistory
      .filter((e: any) => e.step === s.historyStep)
      .map((e: any) => ({ timestamp: fmtTime(e.timestamp), prompt: e.userPrompt || "" }));

    return {
      label: s.label,
      stats: { total: data.length, ai, human },
      aiAgent: {
        description: s.desc || "",
        whatDid: s.what || "",
        rationale: s.rat || "",
      },
      humanAnalysis: {
        promptHistory: history,
        memo: edit[s.memoKey] || "",
      },
    };
  });

  return { config, coverage, findings, conclusion, themes, steps };
}

/** Call the PDF server and return a Blob. */
export async function generatePDFFromServer(): Promise<Blob> {
  const data = buildPDFData();
  const response = await fetch(`${PDF_SERVER}/api/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!response.ok) {
    throw new Error(`PDF server error: ${response.status} ${response.statusText}`);
  }
  return response.blob();
}
