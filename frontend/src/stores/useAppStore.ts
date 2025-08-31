import { create } from 'zustand';
import { setWithExpiry, getWithExpiry } from './utils';

interface AppStore {
  researchQuestion: string;
  setResearchQuestion: (question: string) => void;
  storeType: string;
  setStoreType: (type: string) => void;
  resetStore: () => void;
  clearAllData: () => void;
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  numberOfTopicClusters: number[];
  setNumberOfTopicClusters: (clusters: number[] | number) => void;
  saveChangesToStore: () => void;
  codingButtonStatus: boolean;
  setCodingButtonStatus: (status: boolean) => void;
  saveUploadedFilesInfo: () => void;
  getUploadedFilesInfo: () => { name: string; size: number; type: string; lastModified: number }[];

  clusteringStyle: string;
  setClusteringStyle: (style: string) => void;
  codingStyle: string;
  setCodingStyle: (style: string) => void;
  conceptualizingStyle: string;
  setConceptualizingStyle: (style: string) => void;

  // Coverage data storage
  fileCoverageData: Record<string, { totalWords: number; coveredWords: number; coveragePercentage: number }>;
  setFileCoverageData: (fileName: string, coverageData: { totalWords: number; coveredWords: number; coveragePercentage: number }) => void;
  getFileCoverageData: () => Record<string, { totalWords: number; coveredWords: number; coveragePercentage: number }>;
}

const useAppStore = create<AppStore>((set, get) => ({
  researchQuestion: getWithExpiry('researchQuestion') || '',
  setResearchQuestion: (question) => {
    setWithExpiry('researchQuestion', question);
    set({ researchQuestion: question });
    get().saveChangesToStore();
  },
  storeType: getWithExpiry('storeType') || 'card',
  setStoreType: (type) => {
    setWithExpiry('storeType', type);
    set({ storeType: type });
  },
  numberOfTopicClusters: (() => {
    const stored = getWithExpiry('numberOfTopicClusters');
    if (Array.isArray(stored)) {
      return stored;
    } else if (typeof stored === 'string') {
      try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [5, 10];
      } catch {
        return [5, 10];
      }
    }
    return [5, 10];
  })(),
  setNumberOfTopicClusters: (clusters) => {
    if (Array.isArray(clusters)) {
      setWithExpiry('numberOfTopicClusters', JSON.stringify(clusters));
      set({ numberOfTopicClusters: clusters });
    } else if (clusters === 0) {
      localStorage.removeItem('numberOfTopicClusters');
      set({ numberOfTopicClusters: [5, 10] });
    } else {
      setWithExpiry('numberOfTopicClusters', clusters.toString());
      set({ numberOfTopicClusters: [clusters, clusters] });
    }
    get().saveChangesToStore();
  },
  clusteringStyle: getWithExpiry('clusteringStyle') || '',
  setClusteringStyle: (style) => {
    setWithExpiry('clusteringStyle', style);
    set({ clusteringStyle: style });
    get().saveChangesToStore();
  },
  codingStyle: getWithExpiry('codingStyle') || '',
  setCodingStyle: (style) => {
    setWithExpiry('codingStyle', style);
    set({ codingStyle: style });
    get().saveChangesToStore();
  },
  conceptualizingStyle: getWithExpiry('conceptualizingStyle') || '',
  setConceptualizingStyle: (style) => {
    setWithExpiry('conceptualizingStyle', style);
    set({ conceptualizingStyle: style });
    get().saveChangesToStore();
  },

  fileCoverageData: (() => {
    const stored = getWithExpiry('fileCoverageData');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  })(),
  setFileCoverageData: (fileName, coverageData) => {
    const currentData = get().fileCoverageData;
    const updatedData = { ...currentData, [fileName]: coverageData };
    setWithExpiry('fileCoverageData', JSON.stringify(updatedData));
    set({ fileCoverageData: updatedData });
  },
  getFileCoverageData: () => {
    return get().fileCoverageData;
  },
  codingButtonStatus: getWithExpiry('codingButtonStatus') === 'true' || false,
  setCodingButtonStatus: (status) => {
    setWithExpiry('codingButtonStatus', status.toString());
    set({ codingButtonStatus: status });
  },
  resetStore: () => {
    const uploadedFilesInfo = getWithExpiry('uploadedFilesInfo');
    const currentUploadedFiles = get().uploadedFiles;

    // Clear all localStorage except uploaded files info
    const keysToPreserve = ['uploadedFilesInfo'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToPreserve.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Restore uploaded files info if it existed
    if (uploadedFilesInfo) {
      setWithExpiry('uploadedFilesInfo', uploadedFilesInfo);
    }

    set({
      researchQuestion: '',
      storeType: 'card',
      uploadedFiles: currentUploadedFiles,
      numberOfTopicClusters: [5, 10],
      clusteringStyle: '',
      codingStyle: '',
      conceptualizingStyle: '',
      fileCoverageData: {},
      codingButtonStatus: false,
    });

    // Force save the default values to localStorage
    setWithExpiry('numberOfTopicClusters', JSON.stringify([5, 10]));
  },
  clearAllData: () => {
    // Clear everything including uploaded files
    localStorage.clear();
    set({
      researchQuestion: '',
      storeType: 'card',
      uploadedFiles: [], // Clear uploaded files
      numberOfTopicClusters: [5, 10],
      clusteringStyle: '',
      codingStyle: '',
      conceptualizingStyle: '',
      fileCoverageData: {},
      codingButtonStatus: false,
    });
  },
  uploadedFiles: [],
  setUploadedFiles: (files) => {
    set({ uploadedFiles: files });
    get().saveUploadedFilesInfo();
  },
  saveUploadedFilesInfo: () => {
    const { uploadedFiles } = get();
    const filesInfo = uploadedFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    }));

    setWithExpiry('uploadedFilesInfo', JSON.stringify(filesInfo));
  },
  getUploadedFilesInfo: () => {
    const filesInfoStr = getWithExpiry('uploadedFilesInfo');
    if (filesInfoStr) {
      try {
        return JSON.parse(filesInfoStr);
      } catch (e) {
        console.error('Error parsing uploaded files info:', e);
        return [];
      }
    }
    return [];
  },
  saveChangesToStore: () => {
    const {
      researchQuestion,
      numberOfTopicClusters,
      clusteringStyle,
      codingStyle,
      conceptualizingStyle,
      codingButtonStatus
    } = get();

    setWithExpiry('researchQuestion', researchQuestion);
    setWithExpiry('numberOfTopicClusters', JSON.stringify(numberOfTopicClusters));
    setWithExpiry('clusteringStyle', clusteringStyle);
    setWithExpiry('codingStyle', codingStyle);
    setWithExpiry('conceptualizingStyle', conceptualizingStyle);
    setWithExpiry('codingButtonStatus', codingButtonStatus.toString());
  },
}));

export default useAppStore;