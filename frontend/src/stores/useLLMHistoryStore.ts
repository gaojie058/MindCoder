import { create } from 'zustand';
import { setWithExpiry, getWithExpiry } from './utils';
import { nanoid } from 'nanoid';

export interface LLMHistoryEntry {
  id: string;
  timestamp: number;
  step: string;
  userPrompt: string; 
  title: string;
}

interface LLMHistoryStore {
  llmHistory: LLMHistoryEntry[];
  showLLMHistoryModal: boolean;
  setShowLLMHistoryModal: (show: boolean) => void;
  addLLMHistoryEntry: (step: string, userPrompt: string, title?: string) => void;
  getLLMHistoryEntry: (id: string) => LLMHistoryEntry | undefined;
  clearLLMHistory: () => void;
  deleteLLMHistoryEntry: (id: string) => void;
  checkLLMHistoryExists: () => boolean;
}

const MAX_LLM_HISTORY_ENTRIES = 50;

const useLLMHistoryStore = create<LLMHistoryStore>((set, get) => ({
  llmHistory: (() => {
    try {
      const historyData = getWithExpiry('llmHistoryData') || [];
      return historyData;
    } catch (error) {
      console.warn('Failed to load LLM history from localStorage:', error);
      return [];
    }
  })(),

  showLLMHistoryModal: false,

  setShowLLMHistoryModal: (show) => {
    set({ showLLMHistoryModal: show });
  },

  addLLMHistoryEntry: (step: string, userPrompt: string, title = 'Untitled Prompt') => {
    set((state) => {
      if (!userPrompt || typeof userPrompt !== 'string') {
        console.error('Invalid user prompt provided to addLLMHistoryEntry');
        return state;
      }

      const entryId = nanoid();
      const newEntry: LLMHistoryEntry = {
        id: entryId,
        timestamp: Date.now(),
        step,
        userPrompt,
        title
      };

      // Keep only the most recent MAX_LLM_HISTORY_ENTRIES
      const history = state.llmHistory || [];
      const updatedHistory = [newEntry, ...history].slice(0, MAX_LLM_HISTORY_ENTRIES);

      // Save to localStorage
      try {
        setWithExpiry('llmHistoryData', updatedHistory, 24 * 60 * 60 * 1000); // 24 hours
      } catch (error) {
        console.warn('Failed to save LLM history to localStorage:', error);
      }

      return { llmHistory: updatedHistory };
    });
  },

  getLLMHistoryEntry: (id) => {
    const history = get().llmHistory;
    return history ? history.find(entry => entry.id === id) : undefined;
  },

  clearLLMHistory: () => {
    set(() => {
      try {
        localStorage.removeItem('llmHistoryData');
      } catch (error) {
        // Ignore errors when removing
      }
      return { llmHistory: [] };
    });
  },

  deleteLLMHistoryEntry: (id) => {
    set((state) => {
      const history = state.llmHistory || [];
      const updatedHistory = history.filter(entry => entry.id !== id);

      try {
        setWithExpiry('llmHistoryData', updatedHistory, 24 * 60 * 60 * 1000);
      } catch (error) {
        console.warn('Failed to save updated LLM history after deletion:', error);
      }

      return { llmHistory: updatedHistory };
    });
  },

  checkLLMHistoryExists: () => {
    const history = get().llmHistory;
    return history && history.length > 0;
  }
}));

export default useLLMHistoryStore;
