import { create } from "zustand";
import { card, code, concept } from "@/types/stores";
import useCardStore from "./useCardStore";
import useCodeStore from "./useCodeStore";
import useConceptStore from "./useConceptStore";
import useAppStore from "./useAppStore";

export interface VersionSnapshot {
  id: string;
  label: string;
  timestamp: number;
  step: string; // which step triggered this version
  cardData: card[];
  codeData: code[];
  conceptData: concept[];
  lockedCardIds?: string[]; // preserved as array for serialization
  aiSummary?: string;       // what AI did in this version
  humanInstruction?: string; // user's custom instruction for this step
}

interface VersionStore {
  versions: VersionSnapshot[];
  activeVersionId: string | null;
  panelOpen: boolean;
  togglePanel: () => void;
  saveVersion: (step: string, label?: string) => void;
  restoreVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  renameVersion: (versionId: string, newLabel: string) => void;
  clearVersions: () => void;
}

const useVersionStore = create<VersionStore>((set, get) => ({
  versions: [],
  activeVersionId: null,
  panelOpen: false,

  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  saveVersion: (step: string, label?: string) => {
    const cardData = structuredClone(useCardStore.getState().cardData);
    const codeData = structuredClone(useCodeStore.getState().codeData);
    const conceptData = structuredClone(useConceptStore.getState().conceptData);

    const now = Date.now();
    const lockedCardIds = Array.from(useCardStore.getState().lockedCardIds);

    // Capture AI summary (llmDescription from card store) and human instruction
    const appState = useAppStore.getState() as any;
    const humanInstruction = step === "card" ? appState.clusteringStyle
      : step === "code" ? appState.codingStyle
      : step === "concept" ? appState.conceptualizingStyle
      : "";

    // AI summary from card store's llmDescription
    const aiSummary = step === "card" ? (useCardStore.getState() as any).llmDescription
      : step === "code" ? (useCodeStore.getState() as any).llmDescription
      : step === "concept" ? (useConceptStore.getState() as any).llmDescription
      : "";

    // Default label is timestamp
    const timeLabel = new Date(now).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const snapshot: VersionSnapshot = {
      id: `v-${now}`,
      label: label || timeLabel,
      timestamp: now,
      step,
      cardData,
      codeData,
      conceptData,
      lockedCardIds,
      aiSummary: aiSummary || undefined,
      humanInstruction: humanInstruction || undefined,
    };

    set((s) => ({
      versions: [...s.versions, snapshot],
      activeVersionId: snapshot.id,
    }));
  },

  restoreVersion: (versionId: string) => {
    const version = get().versions.find((v) => v.id === versionId);
    if (!version) return;

    // Restore all stores (including lockedCardIds)
    useCardStore.setState({
      cardData: structuredClone(version.cardData),
      lockedCardIds: new Set(version.lockedCardIds || []),
    });
    useCodeStore.getState().setCodeData(structuredClone(version.codeData));
    useConceptStore.getState().setConceptData(structuredClone(version.conceptData));

    set({ activeVersionId: versionId });
  },

  renameVersion: (versionId: string, newLabel: string) => {
    set((s) => ({
      versions: s.versions.map((v) =>
        v.id === versionId ? { ...v, label: newLabel.trim() || v.label } : v
      ),
    }));
  },

  deleteVersion: (versionId: string) => {
    set((s) => ({
      versions: s.versions.filter((v) => v.id !== versionId),
      activeVersionId: s.activeVersionId === versionId ? null : s.activeVersionId,
    }));
  },

  clearVersions: () => set({ versions: [], activeVersionId: null }),
}));

export default useVersionStore;
