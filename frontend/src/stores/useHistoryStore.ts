import { create } from 'zustand';
import { setWithExpiry, getWithExpiry } from './utils';
import { nanoid } from 'nanoid';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  pdfData: string; // Base64 encoded PDF data
  title: string;   // Optional title for the PDF
}

interface HistoryStore {
  history: HistoryEntry[];
  showHistoryModal: boolean;
  setShowHistoryModal: (show: boolean) => void;
  addHistoryEntry: (pdfData: string, title?: string) => void;
  getHistoryEntry: (id: string) => HistoryEntry | undefined;
  clearHistory: () => void;
  checkHistoryExists: () => boolean;
  deleteHistoryEntry: (id: string) => void;
}

const MAX_HISTORY_ENTRIES = 10;

// Helper function to safely save to localStorage
const safelySetWithExpiry = (key: string, value: any, expiryMs?: number) => {
  try {
    setWithExpiry(key, value, expiryMs);
    return true;
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
    return false;
  }
};

// Helper function to save individual PDF entries to separate keys
const savePDFToStorage = (entry: HistoryEntry) => {
  try {
    // Save the PDF data separately with its own key
    setWithExpiry(`pdf_${entry.id}`, entry.pdfData);
    return true;
  } catch (error) {
    console.warn(`Failed to save PDF ${entry.id} to localStorage:`, error);
    return false;
  }
};

// Helper function to load a PDF from storage
const loadPDFFromStorage = (id: string): string | null => {
  try {
    return getWithExpiry(`pdf_${id}`);
  } catch (error) {
    console.warn(`Failed to load PDF ${id} from localStorage:`, error);
    return null;
  }
};

const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: (() => {
    try {
      // Load history metadata (without PDF data)
      const historyData = getWithExpiry('historyData') || [];

      // Return history with empty PDF data fields
      return historyData.map((entry: HistoryEntry) => ({
        ...entry,
        pdfData: '' // Don't load the actual PDF data yet
      }));
    } catch (error) {
      console.warn('Failed to load history from localStorage:', error);
      return [];
    }
  })(),

  showHistoryModal: false,

  setShowHistoryModal: (show) => {
    set({ showHistoryModal: show });
  },

  addHistoryEntry: (pdfData, title = 'Untitled PDF') => {
    set((state) => {
      if (!pdfData || typeof pdfData !== 'string') {
        console.error('Invalid PDF data provided to addHistoryEntry');
        return state;
      }

      // Clean the PDF data to ensure proper formatting
      let cleanPdfData = pdfData;
      if (pdfData.startsWith('data:application/pdf;base64,data:application/pdf;base64,')) {
        cleanPdfData = pdfData.replace('data:application/pdf;base64,', '');
      }

      const entryId = nanoid();
      const newEntry: HistoryEntry = {
        id: entryId,
        timestamp: Date.now(),
        pdfData: cleanPdfData,
        title
      };

      // First save the PDF data to its own storage key
      const pdfSaved = savePDFToStorage(newEntry);
      if (!pdfSaved) {
        // If we couldn't save the PDF, still add entry but without PDF data
        // newEntry.pdfData = '';
        console.warn('PDF data was too large to save in localStorage');
      }

      // Create the history metadata entry (without actual PDF data)
      const metadataEntry = {
        ...newEntry,
        pdfData: '' // Don't store PDF data in the main history array
      };

      // Keep only the most recent MAX_HISTORY_ENTRIES
      const updatedHistory = [metadataEntry, ...state.history].slice(0, MAX_HISTORY_ENTRIES);

      // Save the updated history metadata
      safelySetWithExpiry('historyData', updatedHistory, 24 * 60 * 60 * 1000);

      return {
        history: pdfSaved
          ? [newEntry, ...state.history].slice(0, MAX_HISTORY_ENTRIES) // Include PDF data in state
          : [metadataEntry, ...state.history].slice(0, MAX_HISTORY_ENTRIES) // Without PDF data
      };
    });
  },

  getHistoryEntry: (id) => {
    const entry = get().history.find(entry => entry.id === id);

    // If we have the entry but not the PDF data, try to load it
    if (entry && !entry.pdfData) {
      const pdfData = loadPDFFromStorage(id);
      if (pdfData) {
        // Return a new object with the loaded PDF data
        return {
          ...entry,
          pdfData
        };
      }
    }

    return entry;
  },

  clearHistory: () => {
    set((state) => {
      // Remove all PDF data entries
      state.history.forEach(entry => {
        try {
          localStorage.removeItem(`pdf_${entry.id}`);
        } catch (error) {
          // Ignore errors when removing
        }
      });

      // Remove the main history entry
      localStorage.removeItem('historyData');

      return { history: [] };
    });
  },

  deleteHistoryEntry: (id) => {
    set((state) => {
      // First try to remove the PDF data for this entry
      try {
        localStorage.removeItem(`pdf_${id}`);
      } catch (error) {
        // Ignore errors when removing
      }

      // Filter out the deleted entry
      const updatedHistory = state.history.filter(entry => entry.id !== id);

      // Save the updated history metadata
      try {
        // Save metadata only (without PDF data)
        const metadataHistory = updatedHistory.map(entry => ({
          ...entry,
          pdfData: '' // Don't include PDF data when saving metadata
        }));

        safelySetWithExpiry('historyData', metadataHistory, 24 * 60 * 60 * 1000);
      } catch (error) {
        console.warn('Failed to save updated history after deletion:', error);
      }

      return { history: updatedHistory };
    });
  },

  checkHistoryExists: () => {
    return get().history.length > 0;
  }
}));

export default useHistoryStore;
