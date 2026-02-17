import { create } from "zustand";
import { card, code, concept } from "@/types/stores";
import useCardStore from "./useCardStore";
import useCodeStore from "./useCodeStore";
import useConceptStore from "./useConceptStore";

export interface VersionSnapshot {
  id: string;
  label: string;
  timestamp: number;
  step: string; // which step triggered this version
  cardData: card[];
  codeData: code[];
  conceptData: concept[];
}

interface VersionStore {
  versions: VersionSnapshot[];
  activeVersionId: string | null;
  panelOpen: boolean;
  togglePanel: () => void;
  saveVersion: (step: string, label?: string) => void;
  restoreVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
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
    const versionNum = get().versions.length + 1;

    const snapshot: VersionSnapshot = {
      id: `v-${now}`,
      label: label || `Version ${versionNum}`,
      timestamp: now,
      step,
      cardData,
      codeData,
      conceptData,
    };

    set((s) => ({
      versions: [...s.versions, snapshot],
      activeVersionId: snapshot.id,
    }));
  },

  restoreVersion: (versionId: string) => {
    const version = get().versions.find((v) => v.id === versionId);
    if (!version) return;

    // Restore all stores
    useCardStore.setState({ cardData: structuredClone(version.cardData) });
    useCodeStore.getState().setCodeData(structuredClone(version.codeData));
    useConceptStore.getState().setConceptData(structuredClone(version.conceptData));

    set({ activeVersionId: versionId });
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
