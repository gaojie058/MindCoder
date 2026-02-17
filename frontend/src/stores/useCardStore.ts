import { create } from 'zustand';
import { card, datapoint } from "@/types";
import { nanoid } from "nanoid";
import { llm_did_description } from "@/api/prompt_template";


interface CardStore {
  cardData: card[];
  setCardData: (cardData: card[]) => void;
  updateDatapoint: (uuid: string, content: string) => void;
  deleteDatapoint: (uuid: string) => void;
  updateCardIsGPT: (uuid: string, isGPT: boolean) => void;
  updateCardName: (cardId: string, newName: string) => void;
  fileCardMap: Record<string, string[]>;
  getCardsForFile: (fileName: string) => card[];
  resetCardIds: () => void;
  // Locked cards — preserved during regeneration
  lockedCardIds: Set<string>;
  toggleCardLock: (cardId: string) => void;
  isCardLocked: (cardId: string) => boolean;
  // LLM task information
  whatLLMDid: string;
  setWhatLLMDid: (whatLLMDid: string) => void;
  rationale: string;
  setRationale: (rationale: string) => void;
  llmDescription: string;
  setLlmDescription: (llmDescription: string) => void;
}

const useCardStore = create<CardStore>((set, get) => ({
  cardData: [],
  fileCardMap: {},
  lockedCardIds: new Set<string>(),
  toggleCardLock: (cardId: string) => {
    set((state) => {
      const newSet = new Set(state.lockedCardIds);
      if (newSet.has(cardId)) newSet.delete(cardId);
      else newSet.add(cardId);
      return { lockedCardIds: newSet };
    });
  },
  isCardLocked: (cardId: string) => get().lockedCardIds.has(cardId),
  whatLLMDid: '',
  rationale: '',
  llmDescription: '',

  setCardData: (cardData: card[]) => set({ cardData }),

  setWhatLLMDid: (whatLLMDid: string) => {
    set({ whatLLMDid });
  },

  setRationale: (rationale: string) => {
    set({ rationale });
  },

  setLlmDescription: (llmDescription: string) => {
    set({ llmDescription });
  },

  getCardsForFile: (fileName: string) => {
    const state = get();
    const cardIds = state.fileCardMap[fileName] || [];
    return state.cardData.filter(card => cardIds.includes(card.id));
  },

  updateDatapoint: (uuid: string, content: string) => {
    set((state) => {
      const updatedCardData = state.cardData.map((card) => {
        const updatedCards = card.topics.map((dp) => {
          if (dp.uuid === uuid) {
            return { ...dp, content };
          }
          return dp;
        });
        const hasMatchingDatapoint = updatedCards.some((dp) => dp.uuid === uuid);

        if (hasMatchingDatapoint) {
          return { ...card, topics: updatedCards, isGPT: false };
        }

        return { ...card, topics: updatedCards };
      });

      return { cardData: updatedCardData };
    });
  },

  deleteDatapoint: (uuid: string) => {
    set((state) => {
      console.log(`Attempting to delete datapoint with uuid: ${uuid}`);

      // First, verify the uuid exists and find which card contains it
      let foundInCard = null;
      let foundTopic = null;

      state.cardData.forEach((card, cardIndex) => {
        if (card.topics) {
          card.topics.forEach((topic, topicIndex) => {
            if (topic.uuid === uuid) {
              foundInCard = cardIndex;
              foundTopic = topicIndex;
              console.log(`Found datapoint in card: ${card.id}, name: ${card.name}, at index: ${topicIndex}`);
            }
          });
        }
      });

      if (foundInCard === null || foundTopic === null) {
        console.error(`Could not find datapoint with uuid ${uuid} in any card`);
        return { cardData: state.cardData }; // Return unchanged state
      }

      // Now that we've verified the target, update only the specific card
      const updatedCardData = state.cardData.map((card, index) => {
        if (index === foundInCard) {
          // Filter out the specific topic by its index
          const updatedTopics = card.topics.filter((_, idx) => idx !== foundTopic);
          console.log(`Removed datapoint from card ${card.id}, remaining topics: ${updatedTopics.length}`);

          // Update isGPT flag but preserve the card
          return {
            ...card,
            topics: updatedTopics,
            isGPT: updatedTopics.length > 0 ? card.isGPT : false
          };
        }
        return card;
      });

      console.log(`Successfully removed datapoint ${uuid}`);
      return { cardData: updatedCardData };
    });
  },

  updateCardIsGPT: (uuid: string) => {
    set((state) => {
      const updatedCardData = state.cardData.map((card) => {
        const hasMatchingDatapoint = card.topics.some((dp) => dp.uuid === uuid);

        if (hasMatchingDatapoint) {
          return {
            ...card,
            isGPT: false,
          };
        }
        return card;
      });

      return { cardData: updatedCardData };
    });
  },

  updateCardName: (cardId: string, newName: string) => {
    set((state) => {
      const updatedCardData = state.cardData.map((card) => {
        if (card.id === cardId) {
          return { ...card, name: newName, isGPT: false };
        }
        return card;
      });
      return { cardData: updatedCardData };
    });
  },

  resetCardIds: () => {
    set((state) => {
      // Reset all card IDs sequentially starting from 1
      const updatedCards = state.cardData.map((card, index) => ({
        ...card,
        id: String(index + 1)
      }));

      // You need to also update fileCardMap with the new IDs
      const updatedFileCardMap: Record<string, string[]> = {};

      // For each file, update its card IDs
      Object.keys(state.fileCardMap).forEach(fileName => {
        // Find cards that belonged to this file
        const oldCardIds = state.fileCardMap[fileName];
        // Map old IDs to new IDs by finding their position in the updated array
        const newCardIds = oldCardIds.map(oldId => {
          const index = state.cardData.findIndex(c => c.id === oldId);
          return index !== -1 ? String(index + 1) : "";
        }).filter(id => id !== "");

        updatedFileCardMap[fileName] = newCardIds;
      });

      return {
        cardData: updatedCards,
        fileCardMap: updatedFileCardMap
      };
    });
  },
}));

export const processJsonData = (jsonData: unknown): card[] => {
  if (typeof jsonData === "string") {
    console.warn("Received string data instead of JSON. Skipping processing.");
    return [];
  }

  if (
    typeof jsonData === "object" &&
    jsonData !== null &&
    !Array.isArray(jsonData)
  ) {
    const parsedJsonData = jsonData as Record<string, { name: string; chunks: string[] }>;

    const cards: card[] = Object.entries(parsedJsonData)
      .filter(([key]) => key !== 'metadata') // Filter out metadata entry
      .map(([, { name, chunks }]) => {
        const datapoints: datapoint[] = chunks.map((content) => {
          const match = content.match(/^\[([^\]]+)\]/);
          const id = match ? match[1] : nanoid();

          return {
            id: id,
            content: content.replace(/^\[[^\]]+\]\s*/, ''),
            uuid: nanoid(),
          };
        });

        return {
          id: "", 
          topics: datapoints,
          active: true,
          isGPT: true,
          name: name,
        };
      });

    return cards;
  } else {
    throw new Error("Unexpected jsonData structure");
  }
};


export const updateStoreData = async (jsonData: unknown, fileName?: string, shouldResetAllIds = false): Promise<void> => {
  try {
    console.log("Card Data before processing:", jsonData);
    console.log("Card Data type:", typeof jsonData);
    if (jsonData && typeof jsonData === 'object') {
      console.log("Card Data keys:", Object.keys(jsonData));
    }

    // Extract LLM task information if available
    let llmTaskInfo = { whatLLMDid: '', rationale: '', llmDescription: '' };

    let parsedData: Record<string, { name: string; chunks: string[] }> & {
      metadata?: {
        what_llm_did?: {
          main_actions?: string;
          examples?: string;
        };
        self_reflection?: {
          confident_results?: string;
          uncertain_results?: string;
          recommended_review?: string;
        };
        // Legacy format support
        Example?: string;
        example?: string;
        Reflect?: string;
        reflect?: string;
      }
    };

    if (jsonData && typeof jsonData === 'object' && 'message' in jsonData && typeof (jsonData as { message: string }).message === 'string') {
      let cleanedMessage = (jsonData as { message: string }).message;

      // Remove Markdown code block markers
      cleanedMessage = cleanedMessage.replace(/```json/g, '').replace(/```/g, '');

      // Find the first occurrence of a JSON object (starts with {)
      const jsonStartIndex = cleanedMessage.indexOf('{');
      if (jsonStartIndex !== -1) {
        cleanedMessage = cleanedMessage.substring(jsonStartIndex);
      }

      // Find the last occurrence of a closing brace to get the complete JSON
      const jsonEndIndex = cleanedMessage.lastIndexOf('}');
      if (jsonEndIndex !== -1) {
        cleanedMessage = cleanedMessage.substring(0, jsonEndIndex + 1);
      }

      // Clean control characters and extra whitespace
      cleanedMessage = cleanedMessage.trim();

      console.log("Cleaned JSON message:", cleanedMessage);

      // Validate that we have a JSON object
      if (!cleanedMessage.trim().startsWith('{') || !cleanedMessage.trim().endsWith('}')) {
        console.error("Invalid JSON structure. Expected object format.");
        console.error("Original message:", (jsonData as { message: string }).message);
        console.error("Cleaned message:", cleanedMessage);
        throw new Error("Invalid JSON structure. Expected object format.");
      }

      try {
        // Parse the cleaned JSON data
        parsedData = JSON.parse(cleanedMessage);

        // Extract LLM task information from parsed data if available
        if (parsedData && typeof parsedData === 'object' && 'metadata' in parsedData) {
          const metadata = parsedData.metadata;
          if (metadata && typeof metadata === 'object') {
            // Handle new structured metadata format
            if (metadata.what_llm_did && metadata.self_reflection) {
              const whatLLMDidSection = metadata.what_llm_did;
              const selfReflectionSection = metadata.self_reflection;

              llmTaskInfo = {
                whatLLMDid: (whatLLMDidSection.main_actions || '') +
                  (whatLLMDidSection.examples ? '\n\nExample: ' + whatLLMDidSection.examples : ''),
                rationale:
                  (selfReflectionSection.confident_results ? 'Most confident: ' + selfReflectionSection.confident_results + '\n\n' : '') +
                  (selfReflectionSection.uncertain_results ? 'Less confident: ' + selfReflectionSection.uncertain_results + '\n\n' : '') +
                  (selfReflectionSection.recommended_review ? 'Focus on human review: ' + selfReflectionSection.recommended_review : ''),
                llmDescription: llm_did_description.card
              };
            } else {
              // Fallback to old format
              llmTaskInfo = {
                whatLLMDid: metadata['Example'] || metadata.example || '',
                rationale: metadata['Reflect'] || metadata.reflect || '',
                llmDescription: llm_did_description.card
              };
            }
          }
        }
      } catch (error) {
        console.error("JSON parsing error. Original message:", (jsonData as { message: string }).message);
        console.error("Cleaned message:", cleanedMessage);

        // Try alternative cleaning approach - look for JSON pattern
        const jsonMatch = (jsonData as { message: string }).message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const alternativeCleaned = jsonMatch[0];
            console.log("Trying alternative JSON extraction:", alternativeCleaned);
            parsedData = JSON.parse(alternativeCleaned);
          } catch (altError) {
            console.error("Alternative JSON parsing also failed:", altError);

            // Try one more approach - find the largest JSON object
            const allJsonMatches = (jsonData as { message: string }).message.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
            if (allJsonMatches && allJsonMatches.length > 0) {
              // Find the largest match (most complete JSON)
              const largestMatch = allJsonMatches.reduce((largest, current) =>
                current.length > largest.length ? current : largest
              );

              try {
                console.log("Trying largest JSON match:", largestMatch);
                parsedData = JSON.parse(largestMatch);
              } catch (finalError) {
                console.error("All JSON parsing attempts failed");
                throw new Error("Failed to parse JSON message after all attempts: " + error);
              }
            } else {
              throw new Error("Failed to parse JSON message after multiple attempts: " + error);
            }
          }
        } else {
          throw new Error("Failed to parse cleaned JSON message: " + error);
        }
      }
    } else if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
      // Check if jsonData itself is the parsed data
      if (jsonData && typeof jsonData === 'object' && Object.keys(jsonData).length > 0) {
        // Validate that it has the expected structure
        const firstKey = Object.keys(jsonData)[0];
        const firstValue = (jsonData as Record<string, unknown>)[firstKey];
        if (firstValue && typeof firstValue === 'object' && 'name' in firstValue && 'chunks' in firstValue) {
          parsedData = jsonData as Record<string, { name: string; chunks: string[] }> & {
            metadata?: {
              what_llm_did?: {
                main_actions?: string;
                examples?: string;
              };
              self_reflection?: {
                confident_results?: string;
                uncertain_results?: string;
                recommended_review?: string;
              };
              Example?: string;
              example?: string;
              Reflect?: string;
              reflect?: string;
            }
          };
        } else {
          throw new Error("Unexpected jsonData structure: missing expected 'name' and 'chunks' properties");
        }
      } else {
        throw new Error("Unexpected jsonData structure: empty or invalid object");
      }
    } else {
      throw new Error("Unexpected jsonData structure: expected object with message property or direct object");
    }

    // Process the parsed data to create card objects
    const processedCards = processJsonData(parsedData);

    // Get current store state
    const currentState = useCardStore.getState();
    const currentCardData = currentState.cardData || [];
    const currentFileCardMap = currentState.fileCardMap || {};

    // For full regeneration, preserve user-edited cards
    if (!fileName) {
      console.log("Full regeneration - preserving user-edited and locked cards");

      const { lockedCardIds } = useCardStore.getState();
      const userEdited = currentCardData.filter(c => c.isGPT === false || lockedCardIds.has(c.id));
      const newAICards = processedCards.map(card => ({
        ...card,
        isGPT: true,
      }));

      // Merge: user-edited/locked first, then new AI-generated, re-index IDs
      const preMerge = [...userEdited, ...newAICards];
      const mergedCards = preMerge.map((card, index) => ({
        ...card,
        id: String(index + 1),
      }));

      // Update locked IDs to match new sequential IDs
      const newLockedIds = new Set<string>();
      preMerge.forEach((card, index) => {
        if (lockedCardIds.has(card.id)) {
          newLockedIds.add(String(index + 1));
        }
      });

      useCardStore.setState({
        cardData: mergedCards,
        fileCardMap: {},
        lockedCardIds: newLockedIds,
      });

      return;
    }

    // For per-file update
    console.log(`Updating cards for file: ${fileName}`);
    console.log("Current fileCardMap:", currentFileCardMap);
    console.log("Processed cards count:", processedCards.length);

    // Copy current file-card mapping
    const updatedFileCardMap = { ...currentFileCardMap };

    // Get existing card IDs for this file
    const existingCardIds = updatedFileCardMap[fileName] || [];
    console.log(`Existing card IDs for file "${fileName}":`, existingCardIds);

    // Separate locked cards for this file (they should be preserved)
    const { lockedCardIds: lockedIds } = useCardStore.getState();
    const lockedCardsForFile = currentCardData.filter(
      card => existingCardIds.includes(card.id) && lockedIds.has(card.id)
    );

    // Remove existing cards for this file (except locked ones)
    const otherCards = currentCardData.filter(
      card => !existingCardIds.includes(card.id) || lockedIds.has(card.id)
    );

    // Assign temporary unique IDs to new cards (prefixed to avoid collision with existing IDs)
    const newCards = processedCards.map((card, index) => ({
      ...card,
      id: `__new_${index}`,
      isGPT: true,
    }));

    if (shouldResetAllIds) {
      // Combine: locked cards for this file FIRST, then new AI cards, then other cards
      // This ensures locked cards get the lowest IDs and file mapping is correct
      const combinedCards = [...lockedCardsForFile, ...newCards, ...otherCards.filter(
        c => !lockedCardsForFile.some(lc => lc.id === c.id)
      )];

      // Reset all IDs sequentially
      const resetCards = combinedCards.map((card, index) => ({
        ...card,
        id: String(index + 1)
      }));

      // Build file mapping using position in combinedCards
      const resetFileCardMap: Record<string, string[]> = {};

      // For the current file: locked cards + new cards (they're at the start)
      const currentFileIds: string[] = [];
      for (let i = 0; i < lockedCardsForFile.length + newCards.length; i++) {
        currentFileIds.push(String(i + 1));
      }
      resetFileCardMap[fileName] = currentFileIds;

      // For other files, map their old IDs to new positions
      Object.keys(updatedFileCardMap).forEach(file => {
        if (file === fileName) return;
        const oldIds = updatedFileCardMap[file];
        const newIds = oldIds.map(oldId => {
          const index = combinedCards.findIndex(c => c.id === oldId);
          return index !== -1 ? String(index + 1) : "";
        }).filter(id => id !== "");
        resetFileCardMap[file] = newIds;
      });

      // Update locked card IDs to match new sequential IDs
      const newLockedIds = new Set<string>();
      combinedCards.forEach((card, index) => {
        if (lockedIds.has(card.id)) {
          newLockedIds.add(String(index + 1));
        }
      });

      // Update the store with reset IDs
      useCardStore.setState({
        cardData: resetCards,
        fileCardMap: resetFileCardMap,
        lockedCardIds: newLockedIds,
      });
    } else {
      // Non-reset path: assign proper contiguous IDs
      let nextId = 1;
      if (otherCards.length > 0) {
        const maxId = Math.max(...otherCards.map(card => parseInt(card.id, 10) || 0));
        nextId = maxId + 1;
      }

      // Re-assign real IDs to new cards
      const finalNewCards = newCards.map((card, index) => ({
        ...card,
        id: String(nextId + index)
      }));

      // Update file mapping
      updatedFileCardMap[fileName] = [
        ...lockedCardsForFile.map(card => card.id),
        ...finalNewCards.map(card => card.id),
      ];
      // Just combine cards without resetting IDs
      const combinedCards = [...otherCards, ...finalNewCards];

      // Update the store
      useCardStore.setState({
        cardData: combinedCards,
        fileCardMap: updatedFileCardMap
      });
    }

    console.log("Card store update complete. Total cards:", useCardStore.getState().cardData.length);
    console.log("Updated fileCardMap:", useCardStore.getState().fileCardMap);
    if (fileName) {
      console.log(`Cards for file "${fileName}":`, useCardStore.getState().getCardsForFile(fileName).map(c => ({ id: c.id, name: c.name })));
    }

    // Save LLM task information to store
    if (llmTaskInfo.whatLLMDid || llmTaskInfo.rationale || llmTaskInfo.llmDescription) {
      // Dynamic description with actual code count
      const totalCodes = useCardStore.getState().cardData.filter(c => c.active).length;
      const dynamicDesc = `Generated ${totalCodes} codes on uploaded text.`;
      useCardStore.getState().setWhatLLMDid(llmTaskInfo.whatLLMDid);
      useCardStore.getState().setRationale(llmTaskInfo.rationale);
      useCardStore.getState().setLlmDescription(dynamicDesc);
    }


  } catch (error) {
    console.error('Error updating card store:', error);
  }
};

export default useCardStore;