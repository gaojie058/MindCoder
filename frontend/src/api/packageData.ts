import { getPromptTemplate } from './prompt_template';
import useAppStore from "@/stores/useAppStore";
import useCardStore from "@/stores/useCardStore";
import useCodeStore from "@/stores/useCodeStore";
import useConceptStore from "@/stores/useConceptStore";
import useInfoStore from "@/stores/useInfoStore";

import { card, concept } from "@/types/stores";

export function buildBaseTemplateProps() {
  const { researchQuestion } = useAppStore.getState();

  return {
    researchQuestion,
    generatedTime: new Date().toISOString()
  };
}

export async function packageData(
  storeType: string,
  taskType: string = "",
  inputTexts: string[] = [],
  specificFile?: File
): Promise<FormData> {
  const { uploadedFiles } = useAppStore.getState();
  // Get the style values from the store but don't include them in base props yet
  const { numberOfTopicClusters, clusteringStyle, codingStyle, conceptualizingStyle } = useAppStore.getState();

  let fewShotData = '';
  const baseProps = buildBaseTemplateProps();
  const templateProps: Record<string, any> = {
    ...baseProps,
    currentStep: storeType
  };

  switch (storeType) {
    case "card": {
      // Add clustering style and numberOfTopicClusters only for the card phase
      templateProps.clusteringStyle = clusteringStyle;

      // Convert numberOfTopicClusters to appropriate format
      let parsedClusters = numberOfTopicClusters;
      if (typeof numberOfTopicClusters === 'string') {
        try {
          parsedClusters = JSON.parse(numberOfTopicClusters);
        } catch (e) {
          console.error('Error parsing numberOfTopicClusters:', e);
        }
      }

      templateProps.numberOfTopicClusters = parsedClusters;

      if (specificFile) {
        templateProps.hasRawFiles = true;
        templateProps.currentFileName = specificFile.name;
      } else if (uploadedFiles && uploadedFiles.length > 0) {
        templateProps.hasRawFiles = true;
      } else {
        templateProps.uploadedFiles = "No files uploaded.";
      }

      // Include locked/user-edited cards as context for regeneration
      const { cardData: allCards, lockedCardIds } = useCardStore.getState();
      const preservedCards = allCards.filter(c => c.isGPT === false || lockedCardIds.has(c.id));
      if (preservedCards.length > 0) {
        templateProps.preservedCodes = JSON.stringify(preservedCards.map(c => ({
          name: c.name,
          chunks: c.topics.map(t => t.content),
        })), null, 2);
      } else {
        templateProps.preservedCodes = "None";
      }

      console.log("Processing data for storeType 'card':", {
        templateProps,
        hasFiles: uploadedFiles && uploadedFiles.length > 0,
        specificFile: specificFile?.name,
        preservedCards: preservedCards.length,
      });

      fewShotData = await loadFewShotExample('card.txt');

      break;
    }

    case "code": {
      // Add coding style only for the code phase
      templateProps.codingStyle = codingStyle;

      const cardData = useCardStore.getState().cardData;
      const activeCards = cardData.filter((card: card) => card.active);

      const transformedActiveCards = {};

      activeCards.forEach((cluster, index) => {
        const clusterKey = `Code ${index + 1}`;
        transformedActiveCards[clusterKey] = {
          name: cluster.name || "placeholder",
          chunks: cluster.topics.map(topic => topic.content)
        };
      });


      templateProps.codeFiles = transformedActiveCards;

      console.log("Uploading active card data for storeType 'code':", {
        templateProps,
      });

      fewShotData = await loadFewShotExample('coding.txt');

      break;
    }

    case "concept": {
      // Add conceptualizing style only for the concept phase
      templateProps.conceptualizingStyle = conceptualizingStyle;

      const codeStore = useCodeStore.getState().codeData;

      const transformedCodeStore = {};

      codeStore.forEach(entry => {
        const subThemeKey = `Sub-Theme ${entry.id}`;
        transformedCodeStore[subThemeKey] = {
          name: entry.name,
          codes: {}
        };

        const data = entry.data;

        Object.entries(data).forEach(([codeId, codes]) => {
          codes.forEach(code => {
            const codeKey = `Sub-Theme ${codeId}`;
            transformedCodeStore[subThemeKey].codes[codeKey] = {
              name: code.name || "placeholder",
              chunks: code.topics.map(topic => topic.content)
            };
          });
        });
      });


      templateProps.researchQuestion = baseProps.researchQuestion;
      templateProps.conceptData = transformedCodeStore;

      console.log("Uploading code data for storeType 'concept':", {
        templateProps,
      });

      fewShotData = await loadFewShotExample('concept.txt');

      break;
    }

    case "display": {
      if (taskType === "report" || taskType === "graph") {
        fewShotData = await loadFewShotExample(`${taskType}.txt`);
        const conceptData = filterConceptData();

        const formattedConceptData = {};

        conceptData.forEach((concept, conceptIndex) => {
          const conceptKey = `Theme ${conceptIndex + 1}`;
          formattedConceptData[conceptKey] = {
            name: concept.name,
            definition: concept.definition,
            codes: {}
          };

          for (const [codeId, codeList] of Object.entries(concept.codes)) {
            codeList.forEach((code) => {
              const codeKey = `Sub-Theme ${codeId}`;
              formattedConceptData[conceptKey].codes[codeKey] = {
                name: code.name,
                clusters: {}
              };

              for (const [clusterId, clusters] of Object.entries(code.data)) {
                clusters.forEach((cluster) => {
                  const clusterKey = `Open Code ${clusterId}`;
                  const chunks = cluster.topics.map(topic => topic.content);

                  formattedConceptData[conceptKey].codes[codeKey].clusters[clusterKey] = {
                    name: cluster.name,
                    chunks: chunks
                  };
                });
              }
            });
          }
        });

        // const conceptDataForPrompt = formattedConceptData.map(({ ...rest }) => rest);

        templateProps.codebook = formattedConceptData;
        // templateProps.researchQuestions = baseProps.researchQuestion;

        console.log("Uploading all data for taskType 'display':", { templateProps });
      }
      break;
    }
    // case "none":
    //   break;

    default:
      throw new Error(`Unsupported storeType: ${storeType}`);
  }

  // Create FormData and add files (if any)
  const formData = formulatePrompt(storeType, templateProps, taskType, fewShotData, inputTexts);

  // If it's card type and has raw files, add files to FormData
  if (storeType === "card" && templateProps.hasRawFiles) {
    if (specificFile) {
      // Add only the specific file
      formData.append('files', specificFile);
      formData.append('fileName', specificFile.name);
    } else {
      if (uploadedFiles && uploadedFiles.length > 0) {
        uploadedFiles.forEach((file, index) => {
          formData.append('files', file);
          formData.append(`fileName${index}`, file.name);
        });
      }
    }
  }

  return formData;
}

function formulatePrompt(
  storeType: string,
  templateProps: Record<string, any>,
  taskType: string,
  fewShotData: string,
  inputTexts: string[],
): FormData {
  const formData = new FormData();

  console.log("Template props before getPromptTemplate:", JSON.stringify(templateProps, null, 2));

  let promptContent = getPromptTemplate(storeType, templateProps, taskType);

  if (fewShotData && fewShotData.trim()) {
    promptContent += `\n\nFew-shot example:\n${fewShotData}`;
  }

  promptContent = promptContent.replace(/\$\{researchQuestions\}/g, templateProps.researchQuestion || '');

  if (storeType === 'card' && templateProps.numberOfTopicClusters) {
    let clusterRangeText = '15-20';
    if (Array.isArray(templateProps.numberOfTopicClusters)) {
      const [min, max] = templateProps.numberOfTopicClusters;
      clusterRangeText = `${min}-${max}`;
    }
    promptContent = promptContent.replace(/\$\{numberOfTopicClusters\}/g, clusterRangeText);
  }

  if (storeType === 'card') {
    promptContent = promptContent.replace(/\$\{clusteringStyle\}/g, templateProps.clusteringStyle || '');
  }

  if (storeType === 'code') {
    promptContent = promptContent.replace(/\$\{codingStyle\}/g, templateProps.codingStyle || '');
  }

  if (storeType === 'concept') {
    promptContent = promptContent.replace(/\$\{conceptualizingStyle\}/g, templateProps.conceptualizingStyle || '');
  }

  console.log("Final prompt content after our manual replacements:", promptContent);

  const message = {
    role: "user",
    content: promptContent
  };

  formData.append('message', JSON.stringify(message));

  inputTexts.forEach((text, index) => {
    formData.append(`inputText${index}`, text);
  });

  formData.append('templateProps', JSON.stringify(templateProps));

  // Include model selection
  const { model } = useInfoStore.getState();
  formData.append('model', model);

  console.log("FormData message:", JSON.stringify(message));

  return formData;
}

function filterConceptData() {
  const conceptStore = useConceptStore.getState().conceptData;
  return conceptStore.map((conceptItem: concept) => ({
    name: conceptItem.name,
    definition: conceptItem.definition,
    codes: conceptItem.codes,
  }));
}

async function loadFewShotExample(filename: string): Promise<string> {
  try {
    const response = await fetch(`/few_shot_data/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error loading few-shot example from ${filename}:`, error);
    throw new Error('Failed to load few-shot example');
  }
}