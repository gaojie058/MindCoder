import { create } from 'zustand';

interface EditorState {
  [fileName: string]: string;
}

interface EditorStore {
  editorStates: EditorState;
  selectedFile: string;
  getEditorState: (fileName: string) => string;
  setEditorState: (fileName: string, state: string) => void;
  setSelectedFile: (file: string) => void;
  resetEditorState: (fileName?: string) => void;
}

const useEditorStore = create<EditorStore>((set, get) => ({
  editorStates: {},
  selectedFile: '',
  getEditorState: (fileName: string) => {
    return get().editorStates[fileName] || '';
  },
  setEditorState: (fileName: string, state: string) =>
    set((store) => ({
      editorStates: {
        ...store.editorStates,
        [fileName]: state
      }
    })),
  setSelectedFile: (file: string) => set({ selectedFile: file }),
  resetEditorState: (fileName?: string) => {
    if (fileName) {
      // Reset just the specified file
      set((store) => ({
        editorStates: {
          ...store.editorStates,
          [fileName]: ''
        }
      }));
    } else {
      // Reset all editor states
      set({ editorStates: {} });
    }
  },
}));

export default useEditorStore;
