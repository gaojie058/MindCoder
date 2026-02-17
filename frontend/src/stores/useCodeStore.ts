import { nanoid } from 'nanoid';
import { code, codeStore, card } from '@/types/stores';
import { create } from 'zustand';
import useCardStore from './useCardStore';
import { llm_did_description } from "@/api/prompt_template";


const colors = [
  "#E3C8C0",
  "#FFE2D4",
  "#C9ECCF",
  "#C9ECE6",
  "#D5ECF9",
  "#DDDDF3",
  "#F9D5F8",
  "#F9D5D5",
];

export const processJsonCode = (
  jsonData: unknown,
  existingCards: Record<string, card>
): code[] => {
  if (typeof jsonData === 'string') {
    console.warn('Received string data instead of JSON. Skipping processing.');
    return [];
  }

  if (typeof jsonData === 'object' && jsonData !== null && !Array.isArray(jsonData)) {
    const parsedJsonData = jsonData as Record<string, { name: string; definition?: string; codes: Record<string, string[]> }>;


    const codes: code[] = Object.entries(parsedJsonData)
      .filter(([key]) => key !== 'metadata')
      .map(([codeKey, codeContent], index) => {
        const data: Record<string, card[]> = {};

        const codeName = codeContent.name || codeKey;
        const definition = codeContent.definition;

        Object.entries(codeContent.codes).forEach(([sectionKey, cardIds]) => {
          const sectionIndex = sectionKey.replace('Code', '').trim();
          const matchingCard = existingCards[sectionIndex];

          if (matchingCard) {
            data[sectionIndex] = [{ ...matchingCard }];
          } else {
            console.warn(`No matching card found for section index: ${sectionIndex} in section: ${sectionKey}`);
          }
        });

        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const newNanoid = nanoid();

        return {
          id: (index + 1).toString(),
          nanoid: newNanoid,
          name: codeName,
          definition,
          data,
          color: randomColor,
          isGPT: true,
        };
      });

    return codes;
  } else {
    throw new Error('Unexpected jsonData structure');
  }
};

const useCodeStore = create<codeStore>((set, get) => ({
  codeData: [],

  whatLLMDid: '',
  rationale: '',
  llmDescription: '',

  setWhatLLMDid: (whatLLMDid: string) => {
    set({ whatLLMDid });
  },

  setRationale: (rationale: string) => {
    set({ rationale });
  },

  setLlmDescription: (llmDescription: string) => {
    set({ llmDescription });
  },

  setCodeData: (newCodes: code[], regenerate?: boolean) => {
    let updatedCodes: code[] = [];

    if (regenerate === true) {
      updatedCodes = newCodes.map(newCode => ({
        ...newCode,
        nanoid: nanoid(),
        isGPT: true,
      }));
    } else {
      const currentCodeData = get().codeData || [];
      const existingCodes = Array.isArray(currentCodeData)
        ? currentCodeData.reduce((acc, code) => {
          acc[code.id] = code;
          return acc;
        }, {} as Record<string, code>)
        : {} as Record<string, code>;

      updatedCodes = newCodes.map((newCode) => {
        const existingCode = existingCodes[newCode.id];

        if (!existingCode) {
          return {
            ...newCode,
            nanoid: newCode.nanoid || nanoid(),
            isGPT: newCode.isGPT ?? false,
          };
        }

        return {
          ...existingCode,
          ...newCode,
          nanoid: existingCode.nanoid || nanoid(),
          isGPT: newCode.isGPT ?? existingCode.isGPT ?? false,
        };
      });
    }

    // Update store
    set(() => {
      return { codeData: updatedCodes };
    });
  },
}));

export const updateCodeStoreData = async (jsonData: any, regenerate: boolean = false): Promise<void> => {
  try {
    console.log("Code Data before processing:", jsonData);

    if (!jsonData.message) {
      throw new Error("jsonData does not contain the expected 'message' field");
    }

    // Extract LLM task information if available
    let llmTaskInfo = { whatLLMDid: '', rationale: '', llmDescription: '' };

    let parsedData: Record<string, { name: string; definition?: string; clusters: Record<string, string[]> }> & {
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

    if (jsonData.message && typeof jsonData.message === 'string') {
      let cleanedMessage = jsonData.message;
      cleanedMessage = cleanedMessage.replace(/```json/g, '').replace(/```/g, '');

      // Additional JSON cleaning
      cleanedMessage = cleanedMessage.trim();

      // Remove any text before the first { or [
      const firstJsonChar = Math.min(
        cleanedMessage.indexOf('{') !== -1 ? cleanedMessage.indexOf('{') : Infinity,
        cleanedMessage.indexOf('[') !== -1 ? cleanedMessage.indexOf('[') : Infinity
      );
      if (firstJsonChar !== Infinity && firstJsonChar > 0) {
        cleanedMessage = cleanedMessage.substring(firstJsonChar);
      }

      // Remove any text after the last } or ]
      const lastJsonChar = Math.max(cleanedMessage.lastIndexOf('}'), cleanedMessage.lastIndexOf(']'));
      if (lastJsonChar !== -1 && lastJsonChar < cleanedMessage.length - 1) {
        cleanedMessage = cleanedMessage.substring(0, lastJsonChar + 1);
      }

      console.log("Cleaned JSON message:", cleanedMessage);
      try {
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
                llmDescription: llm_did_description.code
              };
            } else {
              // Fallback to old format
              llmTaskInfo = {
                whatLLMDid: metadata['Example'] || metadata.example || '',
                rationale: metadata['Reflect'] || metadata.reflect || '',
                llmDescription: llm_did_description.code
              };
            }
          }
        }
      } catch (error) {
        throw new Error("Failed to parse cleaned JSON message: " + error);
      }
    } else if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
      parsedData = jsonData as Record<string, { name: string; definition?: string; clusters: Record<string, string[]> }> & {
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
          'What llm did'?: string;
          whatLLMDid?: string;
          Rationale?: string;
          rationale?: string;
        }
      };
    } else {
      throw new Error("Unexpected jsonData structure");
    }

    const cardData = useCardStore.getState().cardData;
    const existingCards = cardData.reduce((acc, card) => {
      acc[card.id] = card;
      return acc;
    }, {} as Record<string, card>);

    const processedData = processJsonCode(parsedData, existingCards);
    console.log('Data after processing:', processedData);

    useCodeStore.getState().setCodeData(processedData, regenerate);



    // Save LLM task information to store
    if (llmTaskInfo.whatLLMDid || llmTaskInfo.rationale || llmTaskInfo.llmDescription) {
      useCodeStore.getState().setWhatLLMDid(llmTaskInfo.whatLLMDid);
      useCodeStore.getState().setRationale(llmTaskInfo.rationale);
      useCodeStore.getState().setLlmDescription(llmTaskInfo.llmDescription);
    }

  } catch (error) {
    console.error('Error when updating code store:', error);
  }
};

export default useCodeStore;
