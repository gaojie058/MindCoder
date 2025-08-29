import { create } from 'zustand';

interface MemoStore {
  // Memo fields for each step
  topicMemo: string;
  setTopicMemo: (memo: string) => void;
  codeMemo: string;
  setCodeMemo: (memo: string) => void;
  conceptMemo: string;
  setConceptMemo: (memo: string) => void;

  // Prompt to LLM fields for each step
  topicPrompt: string;
  setTopicPrompt: (prompt: string) => void;
  codePrompt: string;
  setCodePrompt: (prompt: string) => void;
  conceptPrompt: string;
  setConceptPrompt: (prompt: string) => void;

  // Utility functions
  clearAllMemos: () => void;
  clearAllPrompts: () => void;
  clearAll: () => void;
}

const useEditStore = create<MemoStore>((set) => ({
  // Memo fields
  topicMemo: '',
  setTopicMemo: (memo) => set({ topicMemo: memo }),
  codeMemo: '',
  setCodeMemo: (memo) => set({ codeMemo: memo }),
  conceptMemo: '',
  setConceptMemo: (memo) => set({ conceptMemo: memo }),

  // Prompt fields
  topicPrompt: '',
  setTopicPrompt: (prompt) => set({ topicPrompt: prompt }),
  codePrompt: '',
  setCodePrompt: (prompt) => set({ codePrompt: prompt }),
  conceptPrompt: '',
  setConceptPrompt: (prompt) => set({ conceptPrompt: prompt }),

  // Utility functions
  clearAllMemos: () => set({ topicMemo: '', codeMemo: '', conceptMemo: '' }),
  clearAllPrompts: () => set({ topicPrompt: '', codePrompt: '', conceptPrompt: '' }),
  clearAll: () => set({
    topicMemo: '', codeMemo: '', conceptMemo: '',
    topicPrompt: '', codePrompt: '', conceptPrompt: ''
  }),
}));

export default useEditStore;