import useAppStore from "@/stores/useAppStore";
import useCardStore from "@/stores/useCardStore";

// Function to normalize text (remove all non-alphanumeric characters and convert to lowercase)
function normalizeText(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

// Function to count words using consistent logic with getWordPositions
export function countWords(text: string): number {
  if (!text || typeof text !== "string") return 0;

  const regex = /\b\w+\b/g;
  let count = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    count++;
  }

  return count;
}

// Helper function to get word positions in text
function getWordPositions(text: string): Array<{ word: string; start: number; end: number }> {
  if (!text || typeof text !== "string") return [];

  const words: Array<{ word: string; start: number; end: number }> = [];
  const regex = /\b\w+\b/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    words.push({
      word: match[0].toLowerCase(),
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return words;
}


// Coverage calculation result interface
export interface CoverageResult {
  totalWords: number;
  coveredWords: number;
  coveragePercentage: number;
  noCards?: boolean;
  noMatches?: boolean;
  error?: boolean;
}

// Card data type
interface CardData {
  id: string;
  topics?: Array<{ content: string }>;
  active?: boolean;
}

// Function to calculate coverage for a file using card data
export function calculateFileCoverageFromCardData(
  fileContent: string,
  fileName: string,
  cardData: CardData[],
  fileCardMap: Record<string, string[]>
): CoverageResult {
  // Count total words in the original file content
  const totalWords = countWords(fileContent);

  // Get cards for this file
  const fileCardIds = fileCardMap[fileName] || [];
  const fileCards = cardData.filter((card) => fileCardIds.includes(card.id));

  if (fileCards.length === 0) {
    return {
      totalWords,
      coveredWords: 0,
      coveragePercentage: 0,
      noCards: true,
    };
  }

  // Collect all datapoints from cards
  const allDatapoints: string[] = [];
  fileCards.forEach((card) => {
    if (card.topics && card.topics.length > 0) {
      card.topics.forEach((topic) => {
        if (topic.content && topic.content.trim()) {
          allDatapoints.push(topic.content.trim());
        }
      });
    }
  });

  console.log(`File ${fileName} datapoints:`, {
    fileCardsCount: fileCards.length,
    totalDatapoints: allDatapoints.length,
    totalWords,
    sampleDatapoints: allDatapoints
      .slice(0, 3)
      .map((dp) => dp.substring(0, 50) + "..."),
    originalFileContentLength: fileContent.length,
    originalFileContentSample: fileContent.substring(0, 100) + "...",
  });

  if (allDatapoints.length === 0) {
    return {
      totalWords,
      coveredWords: 0,
      coveragePercentage: 0,
      noMatches: true,
    };
  }

  // Get word positions in the original file content
  const wordPositions = getWordPositions(fileContent);

  // Track which words are covered by creating a set of covered word indices
  const coveredWordIndices = new Set<number>();
  let matchedDatapoints = 0;
  let totalDatapointsProcessed = 0;

  allDatapoints.forEach((datapoint, index) => {
    if (datapoint && datapoint.trim()) {
      totalDatapointsProcessed++;

      // Skip empty datapoints
      if (!datapoint.trim()) return;

      // Find all occurrences of this datapoint in the file content
      let searchIndex = 0;
      let foundMatches = 0;

      while (searchIndex < fileContent.length) {
        const foundIndex = fileContent.toLowerCase().indexOf(
          datapoint.toLowerCase(),
          searchIndex
        );
        if (foundIndex === -1) break;

        foundMatches++;

        // Mark all words that fall within this match as covered
        wordPositions.forEach((wordPos, wordIndex) => {
          if (wordPos.start >= foundIndex && wordPos.end <= foundIndex + datapoint.length) {
            coveredWordIndices.add(wordIndex);
          }
        });

        searchIndex = foundIndex + 1; // Continue searching for overlapping matches
      }

      if (foundMatches > 0) {
        matchedDatapoints++;
        if (index < 5) {
          // Log first 5 matches for debugging
          console.log(`Datapoint ${index + 1} matched ${foundMatches} times:`, {
            content: datapoint.substring(0, 100) + (datapoint.length > 100 ? "..." : ""),
            foundMatches,
          });
        }
      } else if (index < 5) {
        // Log first 5 non-matches for debugging
        console.log(`Datapoint ${index + 1} NO MATCH:`, {
          content: datapoint.substring(0, 100) + (datapoint.length > 100 ? "..." : ""),
        });
      }
    }
  });

  console.log(`File ${fileName} matching summary:`, {
    totalDatapoints: allDatapoints.length,
    totalDatapointsProcessed,
    matchedDatapoints,
    coveredWordIndicesCount: coveredWordIndices.size,
  });

  const coveredWords = coveredWordIndices.size;

  const coveragePercentage =
    totalWords > 0 ? Math.round((coveredWords / totalWords) * 100) : 0;

  console.log(`Coverage calculation details for ${fileName}:`, {
    totalWords,
    coveredWords,
    coveragePercentage,
    coveredWordIndices: Array.from(coveredWordIndices),
    wordPositionsCount: wordPositions.length,
  });

  return {
    totalWords,
    coveredWords,
    coveragePercentage,
    noCards: false,
    noMatches: false,
  };
}

// Function to calculate and save coverage for a specific file
export function calculateAndSaveFileCoverage(
  fileName: string,
  fileContent: string,
  cardData: CardData[],
  fileCardMap: Record<string, string[]>,
  setFileCoverageData: (fileName: string, coverageData: { totalWords: number; coveredWords: number; coveragePercentage: number }) => void
) {
  console.log(
    `Calculating coverage for ${fileName} immediately after datapoints returned`
  );

  // Get cards specifically for this file
  const fileCardIds = fileCardMap[fileName] || [];
  const fileCards = cardData.filter((card) => fileCardIds.includes(card.id));

  console.log(
    `File ${fileName} has ${fileCardIds.length} card IDs: [${fileCardIds.join(
      ", "
    )}]`
  );
  console.log(`Found ${fileCards.length} cards for file ${fileName}`);

  if (fileCards.length === 0) {
    console.error(`No cards found for file ${fileName}`);
    setFileCoverageData(fileName, {
      totalWords: 0,
      coveredWords: 0,
      coveragePercentage: -1, // Use -1 to indicate error
    });
    return;
  }

  const coverage = calculateFileCoverageFromCardData(
    fileContent,
    fileName,
    cardData,
    fileCardMap
  );

  // Check if coverage calculation seems wrong (0 coverage with cards present)
  if (coverage.coveredWords === 0 && fileCards.length > 0) {
    console.error(
      `Coverage calculation error for ${fileName}: 0 coverage despite having ${fileCards.length} cards`
    );
    console.log(
      "File cards:",
      fileCards.map((c) => ({
        id: c.id,
        name: c.name,
        topicCount: c.topics?.length || 0,
      }))
    );

    // Set error indicator
    setFileCoverageData(fileName, {
      totalWords: coverage.totalWords,
      coveredWords: 0,
      coveragePercentage: -1, // Use -1 to indicate error
    });

    // Dispatch error event
    window.dispatchEvent(
      new CustomEvent("coverageCalculated", {
        detail: { fileName, coverage: { ...coverage, error: true } },
      })
    );
    return;
  }

  // Save coverage data to store immediately
  setFileCoverageData(fileName, {
    totalWords: coverage.totalWords,
    coveredWords: coverage.coveredWords,
    coveragePercentage: coverage.coveragePercentage,
  });

  console.log(`Coverage saved for ${fileName}:`, coverage);
}

// Manual trigger function to recalculate coverage
export function manuallyTriggerCoverageCalculation(
  fileName: string,
  fileContent: string,
  cardData: CardData[],
  fileCardMap: Record<string, string[]>,
  setFileCoverageData: (fileName: string, coverageData: { totalWords: number; coveredWords: number; coveragePercentage: number }) => void
) {
  console.log(`Manually triggering coverage calculation for ${fileName}`);

  // Calculate directly without clearing first (avoids UI flash)
  calculateAndSaveFileCoverage(fileName, fileContent, cardData, fileCardMap, setFileCoverageData);

  // Dispatch event to notify UI components
  window.dispatchEvent(
    new CustomEvent("coverageRecalculated", {
      detail: { fileName }
    })
  );
}

// Global console function for manual coverage recalculation
// Usage: window.recalculateCoverage('filename.txt')
if (typeof window !== 'undefined') {
  (window as any).recalculateCoverage = (fileName: string) => {
    console.log(`Console command: Recalculating coverage for ${fileName}`);

    const { uploadedFiles, setFileCoverageData } = useAppStore.getState();
    const { cardData, fileCardMap } = useCardStore.getState();

    // Find the file
    const file = uploadedFiles.find(f => f.name === fileName);
    if (!file) {
      console.error(`File ${fileName} not found in uploaded files`);
      console.log('Available files:', uploadedFiles.map(f => f.name));
      return;
    }

    // Read file content and trigger recalculation
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target?.result as string || "";
      manuallyTriggerCoverageCalculation(
        fileName,
        fileContent,
        cardData,
        fileCardMap,
        setFileCoverageData
      );
    };
    reader.readAsText(file);
  };

  // Helper function to list available files
  (window as any).listCoverageFiles = () => {
    const { useAppStore } = require('@/stores/useAppStore');
    const { uploadedFiles } = useAppStore.getState();
    console.log('Available files for coverage calculation:', uploadedFiles.map(f => f.name));
  };

  console.log('Coverage console commands available:');
  console.log('- window.recalculateCoverage("filename.txt") - Recalculate coverage for a specific file');
  console.log('- window.listCoverageFiles() - List all available files');
}
