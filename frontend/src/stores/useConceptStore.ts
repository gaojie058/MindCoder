import { nanoid } from 'nanoid';
import { concept, code, conceptStore } from '@/types/stores';
import useCodeStore from "./useCodeStore";
import { create } from 'zustand';
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

export const processJsonConcept = (
  jsonData: unknown,
  existingCodes: Record<string, code>,
): concept[] => {
  if (typeof jsonData === 'string') {
    console.warn('Received string data instead of JSON. Skipping processing.');
    return [];
  }

  if (typeof jsonData === 'object' && jsonData !== null && !Array.isArray(jsonData)) {
    const parsedJsonData = jsonData as Record<string, { name: string; definition: string; subthemes: Record<string, string> }>;

    const concepts: concept[] = Object.entries(parsedJsonData)
      .filter(([key]) => key !== 'metadata') // Filter out metadata entry
      .map(([conceptId, conceptContent], index) => {
        const codes: Record<string, code[]> = {};
        const conceptName = conceptContent.name || conceptId;
        const definition = conceptContent.definition;

        Object.entries(conceptContent.subthemes).forEach(([sectionKey, codeName]) => {
          const sectionIndex = sectionKey.replace('Sub-Theme', '').trim();
          const matchingCode = existingCodes[sectionIndex];

          if (matchingCode) {
            codes[sectionIndex] = [{ ...matchingCode }];
          } else {
            console.warn(`No matching code found for codeId: ${codeName} in section: ${sectionKey}`);
          }
        });

        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const newNanoid = nanoid();

        return {
          id: (index + 1).toString(),
          nanoid: newNanoid,
          name: conceptName,
          codes,
          color: randomColor,
          isGPT: true,
          definition: definition,
        };
      });

    return concepts;
  } else {
    throw new Error('Unexpected jsonData structure');
  }
};

const useConceptStore = create<conceptStore>((set, get) => ({
  conceptData: [],

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

  setConceptData: (newConcepts: concept[], regenerate: boolean = false) => {
    let updatedConcepts: concept[] = [];

    if (regenerate) {
      updatedConcepts = newConcepts.map((newConcept, index) => ({
        ...newConcept,
        id: (index + 1).toString(),
        nanoid: nanoid(),
        isGPT: true,
      }));
    } else {
      const currentConceptData = get().conceptData || [];

      // Find the maximum ID currently in use
      const maxId = Math.max(
        ...currentConceptData.map(c => parseInt(c.id, 10)),
        ...newConcepts.map(c => parseInt(c.id, 10))
      );

      // Create a map of existing concepts by nanoid for quick lookup
      const existingConceptsByNanoid = Array.isArray(currentConceptData)
        ? currentConceptData.reduce((acc, concept) => {
          if (concept.nanoid) {
            acc[concept.nanoid] = concept;
          }
          return acc;
        }, {} as Record<string, concept>)
        : {};

      updatedConcepts = [...currentConceptData];

      // Add new concepts
      newConcepts.forEach(newConcept => {
        if (!newConcept.nanoid || !existingConceptsByNanoid[newConcept.nanoid]) {
          // This is a new concept
          updatedConcepts.push({
            ...newConcept,
            nanoid: newConcept.nanoid || nanoid(),
            isGPT: newConcept.isGPT !== undefined ? newConcept.isGPT : false,
          });
        }
      });
    }

    set(() => {
      return { conceptData: updatedConcepts };
    });
  },

  deleteConcept: (conceptNanoid: string) => {
    const currentConcepts = get().conceptData;
    const updatedConcepts = currentConcepts.filter(concept => concept.nanoid !== conceptNanoid);

    // Ensure IDs remain sequential after deletion
    const reorderedConcepts = updatedConcepts.map((concept, index) => ({
      ...concept,
      id: (index + 1).toString()
    }));

    set(() => {
      return { conceptData: reorderedConcepts };
    });
  },

  updateConcept: (conceptNanoid: string, updatedFields: Partial<concept>) => {
    const currentConcepts = get().conceptData;
    const updatedConcepts = currentConcepts.map(concept => {
      if (concept.nanoid === conceptNanoid) {
        // Create a new object to ensure proper state update
        const updatedConcept = {
          ...concept,
          ...updatedFields,
          // If definition is being updated, ensure it's properly set
          definition: updatedFields.definition !== undefined
            ? updatedFields.definition
            : concept.definition
        };
        console.log('Updating concept:', conceptNanoid, 'New values:', updatedConcept);
        return updatedConcept;
      }
      return concept;
    });

    // Force a state update
    set(() => {
      const updatedData = { conceptData: updatedConcepts };
      return updatedData;
    });
  }
}));

export const updateConceptStoreData = async (jsonData: any, regenerate: boolean = false): Promise<void> => {
  try {
    console.log("Concept Data before processing:", jsonData);

    if (!jsonData.message) {
      throw new Error("jsonData does not contain the expected 'message' field");
    }

    // Extract LLM task information if available
    let llmTaskInfo = { whatLLMDid: '', rationale: '', llmDescription: '' };

    let parsedData: Record<string, { name: string; definition: string; codes: Record<string, string> }> & {
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
                llmDescription: llm_did_description.concept
              };
            } else {
              // Fallback to old format
              llmTaskInfo = {
                whatLLMDid: metadata['Example'] || metadata.example || '',
                rationale: metadata['Reflect'] || metadata.reflect || '',
                llmDescription: llm_did_description.concept
              };
            }
          }
        }
      } catch (error) {
        throw new Error("Failed to parse cleaned JSON message: " + error);
      }
    } else if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
      parsedData = jsonData as Record<string, { name: string; definition: string; codes: Record<string, string> }> & {
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
      throw new Error("Unexpected jsonData structure");
    }

    const codeData = useCodeStore.getState().codeData;
    const existingCodes = codeData.reduce((acc, code) => {
      acc[code.id] = code;
      return acc;
    }, {} as Record<string, code>);

    const processedData = processJsonConcept(parsedData, existingCodes);
    console.log('Data after processing:', processedData);

    useConceptStore.getState().setConceptData(processedData, regenerate);



    // Save LLM task information to store
    if (llmTaskInfo.whatLLMDid || llmTaskInfo.rationale || llmTaskInfo.llmDescription) {
      useConceptStore.getState().setWhatLLMDid(llmTaskInfo.whatLLMDid);
      useConceptStore.getState().setRationale(llmTaskInfo.rationale);
      useConceptStore.getState().setLlmDescription(llmTaskInfo.llmDescription);
    }

  } catch (error) {
    console.error('Error when updating concept store:', error);
  }
};

export default useConceptStore;
