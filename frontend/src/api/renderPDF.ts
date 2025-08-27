import html2canvas from "html2canvas"
import pdfMake from "pdfmake/build/pdfmake";
import { Content, TDocumentDefinitions, ContentSvg } from "pdfmake/interfaces"
import 'd3-transition'
import { graphviz } from "d3-graphviz"
import { concept } from "@/types/stores"
import { logoBase64 } from "./pdfutils"
import useDisplayStore from "@/stores/useDisplayStore"
import useAppStore from "@/stores/useAppStore"
import useCardStore from "@/stores/useCardStore"
import useCodeStore from "@/stores/useCodeStore"
import useConceptStore from "@/stores/useConceptStore"
import useLLMHistoryStore from "@/stores/useLLMHistoryStore"
import { calculateFileCoverageFromCardData } from "./coverageCalculator"

// https://github.com/bpampuch/pdfmake/issues/2654
(<any>pdfMake).fonts = {
  Roboto: {
    normal:
      "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf",
    bold: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf",
    italics:
      "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf",
    bolditalics:
      "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf",
  },
}

// Function to clean inline references in text content
function cleanContent(text: string): any[] {
  if (!text || typeof text !== 'string') return [{ text: '' }];

  // Regular expression to match [Text {Group X}] or [Text] patterns
  const regex = /\[(.*?)(?:\s*\{.*?\})?\]/g;

  // Create a result array for the formatted text parts
  const result: any[] = [];

  // Find all matches in the text
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      result.push({ text: text.substring(lastIndex, match.index) });
    }

    // Extract the actual text without brackets and group info
    const cleanedMatch = match[1].trim();

    // Add the matched text with bold formatting
    result.push({ text: cleanedMatch, bold: true });

    // Update lastIndex to end of this match
    lastIndex = regex.lastIndex;
  }

  // Add any remaining text after the last match
  if (lastIndex < text.length) {
    result.push({ text: text.substring(lastIndex) });
  }

  return result.length ? result : [{ text }];
}

// Function to clean title text
function cleanTitle(title: string): string {
  if (title === undefined || title === null || typeof title !== 'string') {
    return "MindCoder Trustworthy Codebook with a Transparent Trajectory";
  }

  const withoutBraces = title.replace(/\{[^}]*\}/g, '');
  const cleanedTitle = withoutBraces.replace(/\[|\]/g, '');
  return cleanedTitle.trim();
}

// Function to format timestamp for PDF
function formatTimestampForPDF(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Function to generate Open Codes process content (Human Interpretation and LLM Mechanism)
function generateOpenCodesProcessContent(): Content[] {
  const result: Content[] = [];

  // Get data from stores
  const { whatLLMDid: cardWhatLLMDid, rationale: cardRationale, llmDescription: cardLlmDescription } = useCardStore.getState();
  const { researchQuestion, numberOfTopicClusters, clusteringStyle, topicMemo } = useAppStore.getState();

  // Check if there's any open codes process content
  const hasTopicProcessContent = (cardWhatLLMDid && typeof cardWhatLLMDid === 'string' && cardWhatLLMDid.trim()) ||
    (cardRationale && typeof cardRationale === 'string' && cardRationale.trim()) ||
    (cardLlmDescription && typeof cardLlmDescription === 'string' && cardLlmDescription.trim()) ||
    (researchQuestion && typeof researchQuestion === 'string' && researchQuestion.trim()) ||
    (numberOfTopicClusters && numberOfTopicClusters.length > 0) ||
    (clusteringStyle && typeof clusteringStyle === 'string' && clusteringStyle.trim()) ||
    (topicMemo && typeof topicMemo === 'string' && topicMemo.trim());

  if (hasTopicProcessContent) {
    result.push({
      text: "Open Codes",
      fontSize: 16,
      bold: true,
      marginBottom: 5,
      marginTop: 15,
      headlineLevel: 2,
      tocItem: true,
      id: 'openCodesProcessSection',
      tocStyle: 'tocLevel2'
    });

    // MindCoder Mechanical Task subsection
    if ((cardWhatLLMDid && typeof cardWhatLLMDid === 'string' && cardWhatLLMDid.trim()) ||
      (cardRationale && typeof cardRationale === 'string' && cardRationale.trim()) ||
      (cardLlmDescription && typeof cardLlmDescription === 'string' && cardLlmDescription.trim())) {

      const mechanicalTaskContent = [];

      mechanicalTaskContent.push({
        text: "MindCoder Mechanical Task",
        fontSize: 12,
        bold: false,
        marginTop: 5,
        marginBottom: 5,
        headlineLevel: 3,
        tocItem: false,
        id: 'topicMechanicalTask',
        tocStyle: 'tocLevel3',
        tocMargin: [10, 0, 0, 0]
      });

      if (cardLlmDescription && typeof cardLlmDescription === 'string' && cardLlmDescription.trim()) {
        mechanicalTaskContent.push({
          text: cleanContent(cardLlmDescription),
          fontSize: 9,
          marginBottom: 8,
          marginLeft: 5
        });
      }

      if (cardWhatLLMDid && typeof cardWhatLLMDid === 'string' && cardWhatLLMDid.trim()) {
        mechanicalTaskContent.push(
          {
            text: "What LLM Did",
            fontSize: 11,
            bold: true,
            marginTop: 8,
            marginBottom: 3,
            headlineLevel: 4,
            id: 'cardWhatLLMDidParam'
          },
          {
            text: cleanContent(cardWhatLLMDid),
            fontSize: 9,
            marginBottom: 8,
            marginLeft: 5
          }
        );
      }

      if (cardRationale && typeof cardRationale === 'string' && cardRationale.trim()) {
        mechanicalTaskContent.push(
          {
            text: "LLM Self Criticize",
            fontSize: 11,
            bold: true,
            marginTop: 8,
            marginBottom: 3,
            headlineLevel: 4,
            id: 'cardRationaleParam'
          },
          {
            text: cleanContent(cardRationale),
            fontSize: 9,
            marginBottom: 8,
            marginLeft: 5
          }
        );
      }

      // Add the MindCoder Mechanical Task section with background
      result.push({
        table: {
          widths: ['*'],
          body: [
            [{
              stack: mechanicalTaskContent,
              fillColor: '#FFF3EE',
              margin: [10, 10, 10, 10]
            }]
          ]
        },
        layout: 'noBorders',
        marginTop: 12
      });
    }

    // Open Codes Human Interpretation subsection with background
    const humanInterpretationContent = [];

    humanInterpretationContent.push({
      text: "Human Interpretation",
      fontSize: 12,
      bold: false,
      marginTop: 5,
      marginBottom: 5,
      headlineLevel: 3,
      tocItem: false,
      id: 'topicHumanInterpretation',
      tocStyle: 'tocLevel3',
      tocMargin: [10, 0, 0, 0]
    });

    // Add human interpretation guidance for Open Codes
    humanInterpretationContent.push(
      {
        text: "In this stage, the LLM offers an exploratory coding draft, while you should bring critical interpretation, contextual knowledge, and methodological rigor. Your revisions, notes, and reflections ensure that the analysis stays trustworthy and grounded in both the data and the research aims. Specifically, this involves:",
        fontSize: 9,
        marginBottom: 5,
        marginLeft: 5
      },
      {
        ol: [
          {
            text: [
              { text: "Familiarize Yourself with the Data", bold: true },
              {
                text: [
                  "\n• Read and re-read both the original data chunks and the LLM-generated codes.",
                  "\n• Pay attention to recurring concepts, surprising details, or emotionally charged expressions.",
                  "\n• Jot down early impressions, insights, or questions directly in your memos. These notes help capture your evolving interpretation of the data."
                ],
                fontSize: 8
              }
            ],
            fontSize: 9,
            marginBottom: 3
          },
          {
            text: [
              { text: "Review and Adjust Initial Codes", bold: true },
              {
                text: [
                  "\n• Compare the LLM's suggested codes with your own understanding of the data.",
                  "\n• If a code feels too broad, vague, or misleading, revise its name or definition to better capture the nuance.",
                  "\n• You can also merge or split codes by re-assigning clusters, or use the system to regenerate codes with a different style prompt (e.g., more theory-driven or more descriptive).",
                  "\n• For each adjustment, record a short memo explaining your reasoning (e.g., \"Code X was too generic; renamed to highlight participants' focus on emotional impact\"). These memos will later be included in the final report for transparency."
                ],
                fontSize: 8
              }
            ],
            fontSize: 9,
            marginBottom: 3
          },
          {
            text: [
              { text: "Focus on Your Research Questions", bold: true },
              {
                text: [
                  "\n• Remember that coding is not just about labeling text—it is about systematically reducing the data in ways that remain meaningful for your specific research questions.",
                  "\n• As you refine the LLM's output, ensure that the codes are relevant, interpretable, and sufficiently detailed to serve as a foundation for later theme development."
                ],
                fontSize: 8
              }
            ],
            fontSize: 9,
            marginBottom: 5
          }
        ],
        marginLeft: 5,
        marginBottom: 8
      }
    );

    // Open Codes Research Question
    if (researchQuestion && typeof researchQuestion === 'string' && researchQuestion.trim()) {
      humanInterpretationContent.push(
        {
          text: "Research Question",
          fontSize: 11,
          bold: true,
          marginTop: 8,
          marginBottom: 3,
          headlineLevel: 4,
          id: 'researchQuestionParam'
        },
        {
          text: cleanContent(researchQuestion),
          fontSize: 9,
          marginBottom: 8,
          marginLeft: 5
        }
      );
    }

    // Open Codes Range
    if (numberOfTopicClusters && numberOfTopicClusters.length > 0) {
      const [min, max] = numberOfTopicClusters;
      humanInterpretationContent.push(
        {
          text: "Number of Open Codes",
          fontSize: 11,
          bold: true,
          marginTop: 8,
          marginBottom: 3,
          headlineLevel: 4,
          id: 'topicClustersParam'
        },
        {
          text: `Range: ${min} - ${max} open codes per file`,
          fontSize: 9,
          marginBottom: 8,
          marginLeft: 5
        }
      );
    }

    // Open Codes Style
    humanInterpretationContent.push(
      {
        text: "Prompt to LLM",
        fontSize: 11,
        bold: true,
        marginTop: 8,
        marginBottom: 3,
        headlineLevel: 4,
        id: 'clusteringStyleParam'
      }
    );

    // Add prompt history for card step
    const { llmHistory = [] } = useLLMHistoryStore.getState();
    const cardHistory = llmHistory.filter(entry => entry.step === "card");
    if (cardHistory.length > 0) {
      cardHistory.forEach((entry) => {
        humanInterpretationContent.push(
          {
            text: formatTimestampForPDF(entry.timestamp),
            fontSize: 8,
            bold: true,
            marginLeft: 5,
            marginBottom: 2
          },
          {
            text: cleanContent(entry.userPrompt || ""),
            fontSize: 8,
            marginLeft: 5,
            marginBottom: 4
          }
        );
      });
    } else {
      humanInterpretationContent.push({
        text: "No customized prompt yet",
        fontSize: 8,
        marginLeft: 5,
        marginBottom: 4
      });
    }

    // Open Codes Memo
    humanInterpretationContent.push(
      {
        text: "User Memo",
        fontSize: 11,
        bold: true,
        marginTop: 8,
        marginBottom: 3,
        headlineLevel: 4,
        id: 'topicMemoParam'
      },
      {
        text: cleanContent(topicMemo && typeof topicMemo === 'string' && topicMemo.trim() ? topicMemo : "No memo added yet"),
        fontSize: 9,
        marginBottom: 5,
        marginLeft: 5
      }
    );

    // Add the Human Interpretation section with background
    result.push({
      table: {
        widths: ['*'],
        body: [
          [{
            stack: humanInterpretationContent,
            fillColor: '#E3F2FD',
            margin: [10, 10, 10, 10]
          }]
        ]
      },
      layout: 'noBorders',
      marginTop: 12
    });

    // Add Open Codes names
    const { cardData } = useCardStore.getState();
    if (cardData && cardData.length > 0) {
      result.push({
        text: "",
        marginTop: 15
      });

      cardData.forEach((card, index) => {
        result.push({
          text: card.name,
          fontSize: 10,
          marginBottom: 2,
          marginLeft: 10
        });
      });
    }
  }

  return result;
}

// Function to generate Sub-themes process content (Human Interpretation and LLM Mechanism)
function generateSubThemesProcessContent(): Content[] {
  const result: Content[] = [];

  // Get data from stores
  const { whatLLMDid: codeWhatLLMDid, rationale: codeRationale, llmDescription: codeLlmDescription } = useCodeStore.getState();
  const { codingStyle, codeMemo } = useAppStore.getState();

  // Always show Sub-themes section
  result.push({
    text: "Sub-themes",
    fontSize: 16,
    bold: true,
    marginBottom: 5,
    marginTop: 15,
    headlineLevel: 2,
    tocItem: true,
    id: 'subThemesProcessSection',
    tocStyle: 'tocLevel2'
  });

  // Check if there's any code labeling process content
    (codeRationale && typeof codeRationale === 'string' && codeRationale.trim()) ||
    (codeLlmDescription && typeof codeLlmDescription === 'string' && codeLlmDescription.trim()) ||
    (codingStyle && typeof codingStyle === 'string' && codingStyle.trim()) ||
    (codeMemo && typeof codeMemo === 'string' && codeMemo.trim());

  // MindCoder Mechanical Task subsection
  if ((codeWhatLLMDid && typeof codeWhatLLMDid === 'string' && codeWhatLLMDid.trim()) ||
    (codeRationale && typeof codeRationale === 'string' && codeRationale.trim()) ||
    (codeLlmDescription && typeof codeLlmDescription === 'string' && codeLlmDescription.trim())) {

    const mechanicalTaskContent = [];

    mechanicalTaskContent.push({
      text: "MindCoder Mechanical Task",
      fontSize: 12,
      bold: false,
      marginTop: 5,
      marginBottom: 5,
      headlineLevel: 3,
      tocItem: false,
      id: 'codeMechanicalTask',
      tocStyle: 'tocLevel3',
      tocMargin: [10, 0, 0, 0]
    });

    if (codeLlmDescription && typeof codeLlmDescription === 'string' && codeLlmDescription.trim()) {
      mechanicalTaskContent.push({
        text: cleanContent(codeLlmDescription),
        fontSize: 9,
        marginBottom: 8,
        marginLeft: 5
      });
    }

    if (codeWhatLLMDid && typeof codeWhatLLMDid === 'string' && codeWhatLLMDid.trim()) {
      mechanicalTaskContent.push(
        {
          text: "What LLM Did",
          fontSize: 11,
          bold: true,
          marginTop: 8,
          marginBottom: 3,
          headlineLevel: 4,
          id: 'codeWhatLLMDidParam'
        },
        {
          text: cleanContent(codeWhatLLMDid),
          fontSize: 9,
          marginBottom: 8,
          marginLeft: 5
        }
      );
    }

    if (codeRationale && typeof codeRationale === 'string' && codeRationale.trim()) {
      mechanicalTaskContent.push(
        {
          text: "LLM Self Criticize",
          fontSize: 11,
          bold: true,
          marginTop: 8,
          marginBottom: 3,
          headlineLevel: 4,
          id: 'codeRationaleParam'
        },
        {
          text: cleanContent(codeRationale),
          fontSize: 9,
          marginBottom: 8,
          marginLeft: 5
        }
      );
    }

    // Add the MindCoder Mechanical Task section with background
    result.push({
      table: {
        widths: ['*'],
        body: [
          [{
            stack: mechanicalTaskContent,
            fillColor: '#FFF3EE',
            margin: [10, 10, 10, 10]
          }]
        ]
      },
      layout: 'noBorders',
      marginTop: 12
    });
  }

  // Sub-themes Human Interpretation subsection with background
  const subThemesHumanInterpretationContent = [];

  subThemesHumanInterpretationContent.push({
    text: "Human Interpretation",
    fontSize: 12,
    bold: false,
    marginTop: 5,
    marginBottom: 5,
    headlineLevel: 3,
    tocItem: false,
    id: 'codeHumanInterpretation',
    tocStyle: 'tocLevel3',
    tocMargin: [10, 0, 0, 0]
  });

  // Add human interpretation guidance for Sub-themes
  subThemesHumanInterpretationContent.push(
    {
      text: "In this stage, the LLM provides an initial map of sub-themes, while you should bring judgment, contextual understanding, and methodological rigor to confirm, adjust, or expand the map. Your engagement ensures that the sub-themes stay trustworthy, relevant, and analytically useful. Specifically, this involves:",
      fontSize: 9,
      marginBottom: 5,
      marginLeft: 5
    },
    {
      ol: [
        {
          text: [
            { text: "Examine and Connect Codes", bold: true },
            {
              text: [
                "\n• Review each sub-theme and the codes grouped within it.",
                "\n• Ask: Do these codes really belong together? Do they reflect a coherent pattern that is significant to my research question?",
                "\n• Merge, split, or reassign codes if the grouping feels forced, too broad, or too fragmented."
              ],
              fontSize: 8
            }
          ],
          fontSize: 9,
          marginBottom: 3
        },
        {
          text: [
            { text: "Refine Sub-Theme Boundaries", bold: true },
            {
              text: [
                "\n• Consider whether a sub-theme is internally consistent and externally distinct from others.",
                "\n• Some codes may naturally overlap across more than one sub-theme; document these overlaps rather than forcing a single fit.",
                "\n• If certain codes do not align with any sub-theme, temporarily place them in a miscellaneous category for further review later."
              ],
              fontSize: 8
            }
          ],
          fontSize: 9,
          marginBottom: 3
        },
        {
          text: [
            { text: "Iterative Adjustment with the System", bold: true },
            {
              text: [
                "\n• Use the system's functionality to regenerate sub-themes by adjusting prompts (e.g., ask for more theory-driven groupings or more descriptive groupings).",
                "\n• Edit sub-theme names and definitions directly when the LLM's wording does not align with your interpretation.",
                "\n• For each revision, write a memo explaining your reasoning (e.g., \"Codes merged under Sub-theme A because they all describe the emotional dimension of feedback\"). These memos ensure transparency and will be reflected in the final report."
              ],
              fontSize: 8
            }
          ],
          fontSize: 9,
          marginBottom: 3
        },
        {
          text: [
            { text: "Maintain Research Question Focus", bold: true },
            {
              text: [
                "\n• Ensure that each sub-theme not only describes patterns in the data but also connects back to your guiding research question(s).",
                "\n• At this stage, themes may still be descriptive rather than fully interpretive, but they should already highlight meaningful trends that prepare for the next stage of defining and naming themes."
              ],
              fontSize: 8
            }
          ],
          fontSize: 9,
          marginBottom: 5
        }
      ],
      marginLeft: 5,
      marginBottom: 8
    }
  );

  // Coding Style
  subThemesHumanInterpretationContent.push(
    {
      text: "Prompt to LLM",
      fontSize: 11,
      bold: true,
      marginTop: 8,
      marginBottom: 3,
      headlineLevel: 4,
      id: 'codingStyleParam'
    }
  );

  // Add prompt history for code step
  const { llmHistory = [] } = useLLMHistoryStore.getState();
  const codeHistory = llmHistory.filter(entry => entry.step === "code");
  if (codeHistory.length > 0) {
    codeHistory.forEach((entry) => {
      subThemesHumanInterpretationContent.push(
        {
          text: formatTimestampForPDF(entry.timestamp),
          fontSize: 8,
          bold: true,
          marginLeft: 5,
          marginBottom: 2
        },
        {
          text: cleanContent(entry.userPrompt || ""),
          fontSize: 8,
          marginLeft: 5,
          marginBottom: 4
        }
      );
    });
  } else {
    subThemesHumanInterpretationContent.push({
      text: "No customized prompt yet",
      fontSize: 8,
      marginLeft: 5,
      marginBottom: 4
    });
  }

  // Sub-themes Memo
  subThemesHumanInterpretationContent.push(
    {
      text: "User Memo",
      fontSize: 11,
      bold: true,
      marginTop: 8,
      marginBottom: 3,
      headlineLevel: 4,
      id: 'codeMemoParam'
    },
    {
      text: cleanContent(codeMemo && typeof codeMemo === 'string' && codeMemo.trim() ? codeMemo : "No memo added yet"),
      fontSize: 9,
      marginBottom: 5,
      marginLeft: 5
    }
  );

  // Add the Human Interpretation section with background
  result.push({
    table: {
      widths: ['*'],
      body: [
        [{
          stack: subThemesHumanInterpretationContent,
          fillColor: '#E3F2FD',
          margin: [10, 10, 10, 10]
        }]
      ]
    },
    layout: 'noBorders',
    marginTop: 5
  });

  // Add Sub-themes names with contained codes
  const { codeData } = useCodeStore.getState();
  if (codeData && codeData.length > 0) {
    result.push({
      text: "",
      marginTop: 15
    });

    codeData.forEach((code, index) => {
      result.push({
        text: code.name,
        fontSize: 10,
        bold: true,
        marginBottom: 3,
        marginLeft: 10
      });

      // Add contained codes (cards) under this sub-theme
      for (const dataKey in code.data) {
        const cards = code.data[dataKey];
        cards.forEach((card) => {
          if (card.active !== false) {
            result.push({
              text: card.name,
              fontSize: 9,
              marginBottom: 1,
              marginLeft: 20
            });
          }
        });
      }
    });
  }

  return result;
}

// Function to generate Themes process content (Human Interpretation and LLM Mechanism)
function generateThemesProcessContent(): Content[] {
  const result: Content[] = [];

  // Get data from stores
  const { whatLLMDid: conceptWhatLLMDid, rationale: conceptRationale, llmDescription: conceptLlmDescription } = useConceptStore.getState();
  const { conceptualizingStyle, conceptMemo } = useAppStore.getState();

  // Always show Themes section
  result.push({
    text: "Themes",
    fontSize: 16,
    bold: true,
    marginBottom: 5,
    marginTop: 25,
    headlineLevel: 2,
    tocItem: true,
    id: 'themesProcessSection',
    tocStyle: 'tocLevel2'
  });

  // Check if there's any conceptualizing process content
  const hasConceptProcessContent = (conceptWhatLLMDid && typeof conceptWhatLLMDid === 'string' && conceptWhatLLMDid.trim()) ||
    (conceptRationale && typeof conceptRationale === 'string' && conceptRationale.trim()) ||
    (conceptLlmDescription && typeof conceptLlmDescription === 'string' && conceptLlmDescription.trim()) ||
    (conceptualizingStyle && typeof conceptualizingStyle === 'string' && conceptualizingStyle.trim()) ||
    (conceptMemo && typeof conceptMemo === 'string' && conceptMemo.trim());

  // Themes MindCoder Mechanical Task subsection
  if ((conceptWhatLLMDid && typeof conceptWhatLLMDid === 'string' && conceptWhatLLMDid.trim()) ||
    (conceptRationale && typeof conceptRationale === 'string' && conceptRationale.trim()) ||
    (conceptLlmDescription && typeof conceptLlmDescription === 'string' && conceptLlmDescription.trim())) {

    const mechanicalTaskContent = [];

    mechanicalTaskContent.push({
      text: "MindCoder Mechanical Task",
      fontSize: 12,
      bold: false,
      marginTop: 5,
      marginBottom: 5,
      headlineLevel: 3,
      tocItem: false,
      id: 'conceptMechanicalTask',
      tocStyle: 'tocLevel3',
      tocMargin: [10, 0, 0, 0]
    });

    if (conceptLlmDescription && typeof conceptLlmDescription === 'string' && conceptLlmDescription.trim()) {
      mechanicalTaskContent.push({
        text: cleanContent(conceptLlmDescription),
        fontSize: 9,
        marginBottom: 8,
        marginLeft: 5
      });
    }

    if (conceptWhatLLMDid && typeof conceptWhatLLMDid === 'string' && conceptWhatLLMDid.trim()) {
      mechanicalTaskContent.push(
        {
          text: "What LLM Did",
          fontSize: 11,
          bold: true,
          marginTop: 8,
          marginBottom: 3,
          headlineLevel: 4,
          id: 'conceptWhatLLMDidParam'
        },
        {
          text: cleanContent(conceptWhatLLMDid),
          fontSize: 9,
          marginBottom: 8,
          marginLeft: 5
        }
      );
    }

    if (conceptRationale && typeof conceptRationale === 'string' && conceptRationale.trim()) {
      mechanicalTaskContent.push(
        {
          text: "LLM Self Criticize",
          fontSize: 11,
          bold: true,
          marginTop: 8,
          marginBottom: 3,
          headlineLevel: 4,
          id: 'conceptRationaleParam'
        },
        {
          text: cleanContent(conceptRationale),
          fontSize: 9,
          marginBottom: 8,
          marginLeft: 5
        }
      );
    }

    // Add the MindCoder Mechanical Task section with background
    result.push({
      table: {
        widths: ['*'],
        body: [
          [{
            stack: mechanicalTaskContent,
            fillColor: '#FFF3EE',
            margin: [10, 10, 10, 10]
          }]
        ]
      },
      layout: 'noBorders',
      marginTop: 12
    });
  }

  // Themes Human Interpretation subsection with background
  const themesHumanInterpretationContent = [];

  themesHumanInterpretationContent.push({
    text: "Human Interpretation",
    fontSize: 12,
    bold: false,
    marginTop: 5,
    marginBottom: 5,
    headlineLevel: 3,
    tocItem: false,
    id: 'conceptHumanInterpretation',
    tocStyle: 'tocLevel3',
    tocMargin: [10, 0, 0, 0]
  });

  // Add human interpretation guidance for Themes
  themesHumanInterpretationContent.push(
    {
      text: "This stage transforms the analysis from a preliminary structure into a coherent thematic framework. The LLM offers a draft map of themes, and you should provide the critical review, interpretive judgment, and theoretical alignment necessary to produce a trustworthy and meaningful set of final themes. Specifically, this involves:",
      fontSize: 9,
      marginBottom: 5,
      marginLeft: 5
    },
    {
      ol: [
        {
          text: [
            { text: "Review Each Theme Against the Data", bold: true },
            {
              text: [
                "\n• Carefully read through the original chunks, codes, and sub-themes grouped under each theme.",
                "\n• Ask: Does the data really support this theme? Do the included elements fit together coherently?",
                "\n• Eliminate weak themes with insufficient supporting data, merge overlapping ones, and identify potential sub-themes where finer distinctions are meaningful."
              ],
              fontSize: 8
            }
          ],
          fontSize: 9,
          marginBottom: 3
        },
        {
          text: [
            { text: "Refine Theme Boundaries and Relationships", bold: true },
            {
              text: [
                "\n• Ensure that each theme is internally coherent and externally distinct from others.",
                "\n• Consider whether some themes work better as sub-themes nested within a broader one.",
                "\n• Reflect on how themes relate to each other across the entire dataset: Are they complementary, contrasting, or hierarchical?"
              ],
              fontSize: 8
            }
          ],
          fontSize: 9,
          marginBottom: 3
        },
        {
          text: [
            { text: "Define and Name Themes Clearly", bold: true },
            {
              text: [
                "\n• Assign concise, descriptive names (4–8 words) that capture the essence of each theme.",
                "\n• Write a short definition for each, making explicit what the theme includes and excludes.",
                "\n• If necessary, regenerate theme suggestions in the system using a different style prompt (e.g., more interpretive, more descriptive)."
              ],
              fontSize: 8
            }
          ],
          fontSize: 9,
          marginBottom: 3
        },
        {
          text: [
            { text: "Document Human Interpretation with Memos", bold: true },
            {
              text: [
                "\n• Record your reasoning for any modifications, merges, splits, or renaming of themes (e.g., \"Merged Theme A and Theme B into 'Use of Feedback' because both addressed how students engaged with feedback practices\").",
                "\n• These memos provide transparency and will appear in the final report, ensuring that the analytical decisions are traceable."
              ],
              fontSize: 8
            }
          ],
          fontSize: 9,
          marginBottom: 3
        },
        {
          text: [
            { text: "Check Alignment with Research Questions", bold: true },
            {
              text: [
                "\n• Finally, ensure that the refined themes not only make sense internally but also contribute to answering your research questions.",
                "\n• Consider prevalence (how often a theme occurs) and significance (why it matters), and reflect on whether the final themes capture the key stories in the data."
              ],
              fontSize: 8
            }
          ],
          fontSize: 9,
          marginBottom: 5
        }
      ],
      marginLeft: 5,
      marginBottom: 8
    }
  );

  // Themes Style
  themesHumanInterpretationContent.push(
    {
      text: "Prompt to LLM",
      fontSize: 11,
      bold: true,
      marginTop: 8,
      marginBottom: 3,
      headlineLevel: 4,
      id: 'conceptualizingStyleParam'
    }
  );

  // Add prompt history for concept step
  const { llmHistory = [] } = useLLMHistoryStore.getState();
  const conceptHistory = llmHistory.filter(entry => entry.step === "concept");
  if (conceptHistory.length > 0) {
    conceptHistory.forEach((entry) => {
      themesHumanInterpretationContent.push(
        {
          text: formatTimestampForPDF(entry.timestamp),
          fontSize: 8,
          bold: true,
          marginLeft: 5,
          marginBottom: 2
        },
        {
          text: cleanContent(entry.userPrompt || ""),
          fontSize: 8,
          marginLeft: 5,
          marginBottom: 4
        }
      );
    });
  } else {
    themesHumanInterpretationContent.push({
      text: "No customized prompt yet",
      fontSize: 8,
      marginLeft: 5,
      marginBottom: 4
    });
  }

  // Themes Memo
  themesHumanInterpretationContent.push(
    {
      text: "User Memo",
      fontSize: 11,
      bold: true,
      marginTop: 8,
      marginBottom: 3,
      headlineLevel: 4,
      id: 'conceptMemoParam'
    },
    {
      text: cleanContent(conceptMemo && typeof conceptMemo === 'string' && conceptMemo.trim() ? conceptMemo : "No memo added yet"),
      fontSize: 9,
      marginBottom: 5,
      marginLeft: 5
    }
  );

  // Add the Human Interpretation section with background
  result.push({
    table: {
      widths: ['*'],
      body: [
        [{
          stack: themesHumanInterpretationContent,
          fillColor: '#E3F2FD',
          margin: [10, 10, 10, 10]
        }]
      ]
    },
    layout: 'noBorders',
    marginTop: 10
  });

  // Add Themes names with sub-themes and cards
  const { conceptData } = useConceptStore.getState();
  if (conceptData && conceptData.length > 0) {
    result.push({
      text: "",
      marginTop: 15
    });

    conceptData.forEach((concept, index) => {
      result.push({
        text: concept.name,
        fontSize: 10,
        bold: true,
        marginBottom: 3,
        marginLeft: 10
      });

      // Add sub-themes under this theme
      for (const codeKey in concept.codes) {
        const codes = concept.codes[codeKey];
        codes.forEach((code) => {
          result.push({
            text: code.name,
            fontSize: 9,
            bold: true,
            marginBottom: 2,
            marginLeft: 20
          });

          // Add cards under this sub-theme
          for (const dataKey in code.data) {
            const cards = code.data[dataKey];
            cards.forEach((card) => {
              if (card.active !== false) {
                result.push({
                  text: card.name,
                  fontSize: 8,
                  marginBottom: 1,
                  marginLeft: 30
                });
              }
            });
          }
        });
      }
    });
  }

  return result;
}

// Function to generate Open Codes section content (for Primary Codebook - data only)
function generateOpenCodesContent(): Content[] {
  const result: Content[] = [];

  // Get data from stores
  const { cardData } = useCardStore.getState();

  // Check if there's any open codes data content
  const hasTopicDataContent = (cardData && cardData.length > 0);

  if (hasTopicDataContent) {
    // Cards Data subsection - Removed duplicate content since themes already contain all cards
    // The cards are now only displayed in the Themes section to avoid duplication
  }

  return result;
}

// Function to generate Sub-themes section content (for Primary Codebook - data only)
function generateSubThemesContent(): Content[] {
  const result: Content[] = [];

  // Get data from stores
  const { codeData } = useCodeStore.getState();

  // Check if there's any code labeling data content
  const hasCodeDataContent = (codeData && codeData.length > 0);

  if (hasCodeDataContent) {
    // Codes Data subsection - Removed duplicate content since themes already contain all sub-themes
    // Sub-themes are now only displayed in the Themes section to avoid duplication
  }

  return result;
}

// Function to generate Themes section content (for Primary Codebook - data only)
function generateThemesContent(): Content[] {
  const result: Content[] = [];

  // Get data from stores
  const { conceptData } = useConceptStore.getState();

  // Check if there's any conceptualizing data content
  const hasConceptDataContent = (conceptData && conceptData.length > 0);

  if (hasConceptDataContent) {
    // Themes Data subsection
    if (conceptData && conceptData.length > 0) {
      // Track processed cards to avoid duplicates
      const processedCards = new Set<string>();

      conceptData.forEach((concept, index) => {
        result.push(
          {
            text: cleanTitle(concept.name),
            fontSize: 11,
            bold: true,
            marginTop: 8,
            marginBottom: 3,
            headlineLevel: 4,
            tocItem: true,
            id: `themes_concept_${concept.nanoid || concept.id}`,
            tocStyle: 'tocLevel3',
            tocMargin: [10, 0, 0, 0]
          }
        );

        if (concept.definition) {
          result.push({
            text: cleanContent(concept.definition),
            fontSize: 9,
            italics: true,
            marginBottom: 5,
            marginLeft: 5
          });
        }

        // Add codes under this concept
        for (const codeKey in concept.codes) {
          const codes = concept.codes[codeKey];
          codes.forEach((code) => {
            result.push(
              {
                text: cleanTitle(code.name),
                fontSize: 10,
                bold: true,
                marginTop: 5,
                marginBottom: 3,
                marginLeft: 10,
                headlineLevel: 5,
                tocItem: true,
                id: `themes_code_${code.nanoid || code.id}`,
                tocStyle: 'tocLevel4',
                tocMargin: [20, 0, 0, 0]
              }
            );

            if (code.definition) {
              result.push({
                text: cleanContent(code.definition),
                fontSize: 8,
                italics: true,
                marginBottom: 3,
                marginLeft: 15
              });
            }

            // Add cards under this code
            for (const dataKey in code.data) {
              const clusters = code.data[dataKey];
              clusters.forEach((cluster) => {
                if (cluster.active !== false) {
                  const cardId = `themes_card_${cluster.id}`;

                  // Only add card if it hasn't been processed yet
                  if (!processedCards.has(cardId)) {
                    processedCards.add(cardId);

                    result.push(
                      {
                        text: cleanTitle(cluster.name),
                        fontSize: 9,
                        bold: true,
                        marginTop: 3,
                        marginBottom: 2,
                        marginLeft: 15,
                        headlineLevel: 6,
                        tocItem: true,
                        id: cardId,
                        tocStyle: 'tocLevel5',
                        tocMargin: [40, 0, 0, 0]
                      }
                    );

                    if (cluster.topics && cluster.topics.length > 0) {
                      const topicItems = cluster.topics.map(topic => ({
                        text: topic.content,
                        fontSize: 7,
                        marginBottom: 1
                      }));
                      result.push({
                        ul: topicItems,
                        marginLeft: 25
                      });
                    }
                  }
                }
              });
            }
          });
        }
      });
    }
  }

  return result;
}


// Card data type for PDF calculation
interface CardDataForPDF {
  id: string;
  topics?: Array<{ content: string }>;
  active?: boolean;
}

// Function to calculate coverage for a file using the unified algorithm
function calculateFileCoverage(
  file: File,
  cardData: CardDataForPDF[]
): Promise<{ totalWords: number; coveredWords: number; coveragePercentage: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = (event.target?.result as string) || "";

      // Use the unified coverage calculation algorithm
      const coverage = calculateFileCoverageFromCardData(fileContent, file.name, cardData);

      resolve({
        totalWords: coverage.totalWords,
        coveredWords: coverage.coveredWords,
        coveragePercentage: coverage.coveragePercentage
      });
    };
    reader.readAsText(file);
  });
}

// Function to generate Document Coverage section content
async function generateDocumentCoverageContent(): Promise<Content[]> {
  const result: Content[] = [];

  // Get data from stores
  const { fileCoverageData, uploadedFiles, setFileCoverageData } = useAppStore.getState();
  const { cardData } = useCardStore.getState();

  console.log('PDF Coverage Calculation - Store data:', {
    uploadedFileNames: uploadedFiles.map(f => f.name),
    cardDataLength: cardData.length,
    allCardIds: cardData.map(c => c.id),
  });

  // Use existing coverage data from store, only calculate if missing
  const coveragePromises = uploadedFiles.map(async (file) => {
    const existingCoverage = fileCoverageData[file.name];

    if (existingCoverage) {
      console.log(`Using existing coverage data for ${file.name}:`, existingCoverage);
      return { fileName: file.name, coverage: existingCoverage };
    }

    // Only calculate if no existing data
    try {
      console.log(`No existing coverage data for ${file.name}, calculating...`);
      const coverage = await calculateFileCoverage(file, cardData);
      setFileCoverageData(file.name, coverage);
      return { fileName: file.name, coverage };
    } catch (error) {
      console.error(`Error calculating coverage for ${file.name}:`, error);
      return { fileName: file.name, coverage: null };
    }
  });

  // Get updated coverage data from store
  const updatedFileCoverageData = useAppStore.getState().fileCoverageData;

  // Create coverage list for all files
  const coverageItems: any[] = [];

  uploadedFiles.forEach((file) => {
    const coverage = updatedFileCoverageData[file.name];
    // Remove .txt postfix from file name for display
    const displayName = file.name.replace(/\.txt$/i, '');

    console.log(`PDF Coverage for ${file.name}:`, coverage);

    if (coverage) {
      // Check if there's a calculation error
      if (coverage.coveragePercentage === -1) {
        coverageItems.push({
          text: [
            { text: displayName, bold: true },
            { text: " - Coverage calculation error", fontSize: 9, italics: true, color: '#dc2626' }
          ],
          fontSize: 10
        });
      } else {
        coverageItems.push({
          text: [
            { text: displayName, bold: true },
            { text: ` - ${coverage.coveragePercentage}% coverage (${coverage.coveredWords}/${coverage.totalWords} words)`, fontSize: 9 }
          ],
          fontSize: 10
        });
      }
    } else {
      // If no coverage data available, show file name with no coverage
      console.log(`No coverage data found for ${file.name} in PDF generation`);
      coverageItems.push({
        text: [
          { text: displayName, bold: true },
          { text: " - No coverage data available", fontSize: 9, italics: true }
        ],
        fontSize: 10
      });
    }
  });

  if (coverageItems.length > 0) {
    coverageItems.forEach(item => {
      result.push(item);
    });
  }

  return result;
}



export default async function renderPDF(report: any, concept: concept[]) {
  const svgsData: ContentSvg[] = [];

  // Get the rendered graph SVG and active graph type from the store
  const { renderedGraphSvg, activeGraphType, graphs, graph } = useDisplayStore.getState();

  // Use renderedGraphType if available, otherwise fall back to activeGraphType
  const graphTypeForPDF = activeGraphType || "mindmap";

  console.log(`PDF: Using ${graphTypeForPDF} visualization`);

  const pdfGraphWidth = 700;
  const pdfGraphHeight = 600;
  const minSvgDimension = 300;
  const scaleFactor = 2.0;

  // Check if we have a rendered SVG for the active graph type
  if (renderedGraphSvg && graphTypeForPDF !== "mindmap") {
    console.log("Using pre-rendered SVG for PDF from:", graphTypeForPDF);

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(renderedGraphSvg, "image/svg+xml");
    const svgElement = svgDoc.documentElement;

    const originalWidth = svgElement.getAttribute("width");
    const originalHeight = svgElement.getAttribute("height");

    // Parse dimensions
    let widthValue = originalWidth ? parseFloat(originalWidth) : 0;
    let heightValue = originalHeight ? parseFloat(originalHeight) : 0;

    if ((!widthValue || !heightValue) && svgElement.getAttribute("viewBox")) {
      const viewBoxValues = svgElement.getAttribute("viewBox")!.split(' ').map(parseFloat);
      if (viewBoxValues.length >= 4) {
        widthValue = viewBoxValues[2];
        heightValue = viewBoxValues[3];
      }
    }

    console.log(`Setting fixed dimensions for ${graphTypeForPDF} in PDF: ${pdfGraphWidth}x${pdfGraphHeight}`);
    widthValue = pdfGraphWidth;
    heightValue = pdfGraphHeight;

    // Make all elements visible in the PDF
    svgElement.querySelectorAll(".node").forEach((node) => {
      (node as HTMLElement).style.display = "block";
      (node as HTMLElement).style.opacity = "1";
    });

    svgElement.querySelectorAll(".edge").forEach((edge) => {
      (edge as HTMLElement).style.display = "block";
      (edge as HTMLElement).style.opacity = "1";
      const path = edge.querySelector("path");
      if (path) {
        path.setAttribute("stroke-width", "1");
        path.setAttribute("opacity", "1");
      }
    });

    svgElement.setAttribute("width", widthValue.toString());
    svgElement.setAttribute("height", heightValue.toString());
    svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svgElement.setAttribute("style", "max-width: 100%; height: auto;");

    const updatedSvgString = new XMLSerializer().serializeToString(svgElement);

    svgsData.push({
      svg: updatedSvgString,
      width: widthValue,
      height: heightValue,
      alignment: "center",
      fit: [pdfGraphWidth, pdfGraphHeight]
    });

    console.log(`Added ${graphTypeForPDF} graph to PDF with dimensions ${widthValue}x${heightValue}`);
  }
  else if ((graphTypeForPDF === "mindmap" || !renderedGraphSvg) && graph && graph.dot) {
    try {
      console.log("Generating fresh mindmap visualization for PDF");

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.visibility = 'hidden';
      tempContainer.style.width = `${pdfGraphWidth}px`;
      tempContainer.style.height = `${pdfGraphHeight}px`;
      document.body.appendChild(tempContainer);

      await new Promise<void>((resolve, reject) => {
        try {
          graphviz(tempContainer)
            .width(pdfGraphWidth)
            .height(pdfGraphHeight)
            .fit(true)
            .scale(0.98)
            .engine('dot')
            .renderDot(graph.dot)
            .on("end", () => {
              const svgElement = tempContainer.querySelector("svg");
              if (svgElement) {
                // Make sure SVG has appropriate attributes
                svgElement.setAttribute("width", `${pdfGraphWidth}`);
                svgElement.setAttribute("height", `${pdfGraphHeight}`);
                svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
                svgElement.setAttribute("style", "max-width: 100%; height: auto;");

                const originalViewBox = svgElement.getAttribute("viewBox");
                if (originalViewBox) {
                  const [x, y, w, h] = originalViewBox.split(" ").map(Number);
                  const padding = Math.max(w, h) * 0.05;
                  svgElement.setAttribute(
                    "viewBox",
                    `${x - padding} ${y - padding} ${w + padding * 2} ${h + padding * 2}`
                  );
                }

                // Make all nodes visible for the PDF
                svgElement.querySelectorAll(".node").forEach((node) => {
                  (node as HTMLElement).style.display = "block";
                  (node as HTMLElement).style.opacity = "1";
                });

                // Make all edges visible for the PDF
                svgElement.querySelectorAll(".edge").forEach((edge) => {
                  (edge as HTMLElement).style.display = "block";
                  (edge as HTMLElement).style.opacity = "1";
                  const path = edge.querySelector("path");
                  if (path) {
                    path.setAttribute("stroke-width", "1");
                    path.setAttribute("opacity", "1");
                  }
                });

                const svgString = new XMLSerializer().serializeToString(svgElement);

                // Add the SVG to the PDF content with specific fit parameters for mindmap
                svgsData.push({
                  svg: svgString,
                  width: pdfGraphWidth,
                  height: pdfGraphHeight,
                  alignment: "center",
                  fit: [pdfGraphWidth, pdfGraphHeight]
                });

                console.log(`Generated mindmap for PDF with dimensions ${pdfGraphWidth}x${pdfGraphHeight}`);
              }
              document.body.removeChild(tempContainer);
              resolve();
            });
        } catch (err) {
          console.error("Error generating mindmap SVG:", err);
          document.body.removeChild(tempContainer);
          reject(err);
        }
      });
    } catch (error) {
      console.error("Failed to create mindmap SVG:", error);
    }
  } else if (graphTypeForPDF && graphs && graphs[graphTypeForPDF]) {
    try {
      // console.log(`Generating ${graphTypeForPDF} visualization for PDF from DOT data`);

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.visibility = 'hidden';
      tempContainer.style.width = `${pdfGraphWidth}px`;
      tempContainer.style.height = `${pdfGraphHeight}px`;
      document.body.appendChild(tempContainer);

      await new Promise<void>((resolve, reject) => {
        try {
          graphviz(tempContainer)
            .width(pdfGraphWidth)
            .height(pdfGraphWidth)
            .fit(true)
            .scale(0.98)
            .engine('dot')
            .renderDot(graphs[graphTypeForPDF]!)
            .on("end", () => {
              const svgElement = tempContainer.querySelector("svg");
              if (svgElement) {
                svgElement.setAttribute("width", `${pdfGraphWidth}`);
                svgElement.setAttribute("height", `${pdfGraphHeight}`);
                svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
                svgElement.setAttribute("style", "max-width: 100%; height: auto;");

                svgElement.querySelectorAll(".node").forEach((node) => {
                  (node as HTMLElement).style.display = "block";
                  (node as HTMLElement).style.opacity = "1";
                });

                svgElement.querySelectorAll(".edge").forEach((edge) => {
                  (edge as HTMLElement).style.display = "block";
                  (edge as HTMLElement).style.opacity = "1";
                  const path = edge.querySelector("path");
                  if (path) {
                    path.setAttribute("stroke-width", "1");
                    path.setAttribute("opacity", "1");
                  }
                });

                const svgString = new XMLSerializer().serializeToString(svgElement);

                svgsData.push({
                  svg: svgString,
                  width: pdfGraphWidth,
                  height: pdfGraphHeight,
                  alignment: "center",
                  fit: [pdfGraphWidth, pdfGraphHeight]
                });

                // console.log(`Generated ${graphTypeForPDF} for PDF with dimensions ${pdfGraphWidth}x${pdfGraphHeight}`);
              }
              document.body.removeChild(tempContainer);
              resolve();
            });
        } catch (err) {
          console.error(`Error generating ${graphTypeForPDF} SVG:`, err);
          document.body.removeChild(tempContainer);
          reject(err);
        }
      });
    } catch (error) {
      console.error(`Failed to create ${graphTypeForPDF} SVG:`, error);
    }
  } else {
    console.error(`No graph data found for ${graphTypeForPDF} visualization`);
  }

  let reportTitle = "MindCoder Trustworthy Codebook with a Transparent Trajectory";
  let reportSections = [];

  if (report) {
    if (report.Title) {
      reportTitle = report.Title;
    } else if (report.title) {
      reportTitle = report.title;
    } else if (report.Report && report.Report.Title) {
      reportTitle = report.Report.Title;
    }

    if (report.Sections && report.Sections.length > 0) {
      reportSections = report.Sections;
    } else if (report.sections && report.sections.length > 0) {
      reportSections = report.sections;
    } else if (report.Report && report.Report.Sections && report.Report.Sections.length > 0) {
      reportSections = report.Report.Sections;
    }
  }

  const reportContent: Content[] = [];

  reportSections.forEach((section: any, index: number) => {
    const sectionTitle = section.Title || section.title || `Section ${index + 1}`;
    const sectionContent = section.Content || section.content;

    reportContent.push(
      { text: cleanTitle(sectionTitle), fontSize: 10, bold: true, marginTop: 10, marginBottom: 5, headlineLevel: 2 },
      { text: cleanContent(typeof sectionContent === 'string' ? sectionContent : ''), fontSize: 8, marginBottom: 10 }
    );

    const subsections = section.Subsections;
    if (subsections && subsections.length > 0) {
      subsections.forEach((subsection: any, subIndex: number) => {
        const subsectionTitle = subsection.Title || subsection.title || `Subsection ${subIndex + 1}`;
        const subsectionContent = subsection.Content || subsection.content;

        reportContent.push(
          { text: cleanTitle(subsectionTitle), fontSize: 9, bold: true, marginTop: 5, marginBottom: 3, marginLeft: 10, headlineLevel: 3 },
          { text: cleanContent(typeof subsectionContent === 'string' ? subsectionContent : ''), fontSize: 8, marginBottom: 8, marginLeft: 10 }
        );
      });
    }
  });
  // if (reportSections.length > 0) {

  // } else {
  //   reportContent.push({ text: "No content available", fontSize: 8, marginBottom: 10 });
  // }

  if (report.Conclusion || report.conclusion) {
    const conclusion = report.Conclusion || report.conclusion;
    if (typeof conclusion === 'string') {
      reportContent.push(
        { text: "Conclusion", fontSize: 10, bold: true, marginTop: 10, marginBottom: 5, headlineLevel: 2 },
        { text: cleanContent(conclusion), fontSize: 8, marginBottom: 10 }
      );
    }
  }

  const docDefinition = {
    pageSize: 'LETTER',
    pageOrientation: 'portrait',
    compress: true,
    pdfVersion: '1.7',

    styles: {
      tocTitle: {
        fontSize: 12,
        bold: true,
        margin: [0, 20, 0, 10]
      },
      tocText: {
        fontSize: 12
      },
      tocNumber: {
        fontSize: 9,
        italics: true
      },
      tocLevel1: {
        fontSize: 12,
        bold: true,
        margin: [0, 10, 0, 5],
        color: '#1976d2'
      },
      tocLevel2: {
        fontSize: 10,
        margin: [15, 5, 0, 3],
        italics: false
      },
      tocLevel3: {
        fontSize: 8,
        margin: [30, 3, 0, 3],
        color: '#000000'
      },
      tocLevel4: {
        fontSize: 8,
        margin: [80, 2, 0, 2],
        color: '#666666'
      },
      tocLevel5: {
        fontSize: 8,
        margin: [100, 2, 0, 2],
        color: '#666666'
      },
      tocLevel6: {
        fontSize: 8,
        margin: [120, 2, 0, 2],
        color: '#666666'
      },
      humanInterpretationSection: {
        fillColor: '#E3F2FD',
        margin: [10, 10, 10, 10]
      }
    },

    outline: [
      { title: cleanTitle(reportTitle), ref: 'reportTitle', open: true },
      { title: 'Key Finding Summary', ref: 'reportSection', open: true },
      { title: 'Theme Map', ref: 'visualizationSection', open: true },
      {
        title: 'Codebook Development Process',
        ref: 'codebookDevelopmentProcessSection',
        open: true,
        items: [
          {
            title: 'Open Codes',
            ref: 'openCodesProcessSection',
            items: [
              { title: 'Human Interpretation', ref: 'topicHumanInterpretation' },
              { title: 'MindCoder Mechanical Task', ref: 'topicMechanicalTask' }
            ]
          },
          {
            title: 'Sub-themes',
            ref: 'subThemesProcessSection',
            items: [
              { title: 'Human Interpretation', ref: 'codeHumanInterpretation' },
              { title: 'MindCoder Mechanical Task', ref: 'codeMechanicalTask' }
            ]
          },
          {
            title: 'Themes',
            ref: 'themesProcessSection',
            items: [
              { title: 'Human Interpretation', ref: 'conceptHumanInterpretation' },
              { title: 'MindCoder Mechanical Task', ref: 'conceptMechanicalTask' }
            ]
          }
        ]
      },
      {
        title: 'Primary Codebook',
        ref: 'primaryCodebookSection',
        open: true
      }
    ],

    viewerPreferences: {
      displayDocTitle: true,
      noPrintScaling: true,
      viewArea: 'CropBox',
      viewClip: 'CropBox',
      pageMode: 'UseOutlines',
    },

    content: [
      { image: logoBase64, width: 100, alignment: "center" },
      {
        text: formatDate(new Date()),
        fontSize: 8,
        color: "#707070",
        alignment: "center",
        margin: [0, 10, 0, 10],
      },
      {
        text: cleanTitle(reportTitle),
        fontSize: 12,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 10],
        headlineLevel: 1,
        id: 'reportTitle'
      },

      // Disclaimer
      {
        table: {
          widths: ['*'],
          body: [
            [{
              stack: [
                {
                  text: "Disclaimer",
                  fontSize: 14,
                  bold: true,
                  marginTop: 5,
                  marginBottom: 5,
                  color: '#6B7280'
                },
                {
                  text: "Portions of this report were generated with GPT-5. The initial codes and groupings were produced by the LLM, the source data were verified by MindCoder against the originals, and the report author conducted the primary review and interpretation. LLM-generated analyses should be treated as reference points only, not definitive findings, and readers are encouraged to apply their own independent judgment when using this report.",
                  fontSize: 10,
                  marginBottom: 5,
                  color: '#6B7280',
                  alignment: 'justify'
                }
              ],
              fillColor: '#F3F4F6',
              margin: [10, 10, 10, 10]
            }]
          ]
        },
        layout: 'noBorders',
        marginTop: 15,
        marginBottom: 20
      },

      // Add Table of Contents
      {
        toc: {
          title: {
            text: 'Table of Contents',
            style: 'tocTitle'
          },
          textStyle: 'tocText',
          numberStyle: 'tocNumber',
          textMargin: [0, 0, 0, 0],
          levels: [
            { textStyle: 'tocLevel1', textMargin: [0, 0, 0, 0] },
            { textStyle: 'tocLevel2', textMargin: [15, 0, 0, 0] },
            { textStyle: 'tocLevel3', textMargin: [40, 0, 0, 0] },
            { textStyle: 'tocLevel4', textMargin: [120, 0, 0, 0] },
            { textStyle: 'tocLevel5', textMargin: [160, 0, 0, 0] },
            { textStyle: 'tocLevel6', textMargin: [200, 0, 0, 0] }
          ]
        }
      },

      {
        text: "Key Finding Summary",
        fontSize: 20,
        bold: true,
        marginBottom: 10,
        marginTop: 20,
        headlineLevel: 1,
        tocItem: true,
        id: 'reportSection'
      },
      ...reportContent,
      {
        text: "Theme Map",
        fontSize: 20,
        bold: true,
        marginBottom: 10,
        marginTop: 20,
        headlineLevel: 1,
        tocItem: true,
        id: 'visualizationSection',
        pageBreak: 'before'
      },
      ...svgsData.map(svg => ({
        ...svg,
        marginBottom: 20,
        marginTop: 10
      })),
      // Codebook Development Process section
      {
        text: "Codebook Development Process",
        fontSize: 20,
        bold: true,
        marginBottom: 10,
        marginTop: 15,
        headlineLevel: 1,
        tocItem: true,
        id: 'codebookDevelopmentProcessSection',
        pageBreak: 'before'
      },
      // Open Codes process section
      ...generateOpenCodesProcessContent(),
      // Sub-themes process section
      ...generateSubThemesProcessContent(),
      // Themes process section
      ...generateThemesProcessContent(),
      // Primary Codebook section
      {
        text: "Primary Codebook",
        fontSize: 20,
        bold: true,
        marginBottom: 10,
        marginTop: 15,
        headlineLevel: 1,
        tocItem: true,
        id: 'primaryCodebookSection',
        pageBreak: 'before'
      },
      // Primary Codebook description
      {
        text: "This primary codebook is provided as a reference to support your downstream tasks, such as group discussions, the development of higher-level theories, and formal report writing.",
        fontSize: 11,
        marginBottom: 15,
        italics: true,
        color: '#6B7280',
        alignment: 'justify'
      },
      // Document Coverage Information
      ...(await generateDocumentCoverageContent()),
      // Themes section
      ...generateThemesContent(),
    ],
  } as TDocumentDefinitions;

  return docDefinition;
}

function formatDate(date: Date) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]

  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()

  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? "PM" : "AM"

  hours = hours % 12
  hours = hours ? hours : 12

  const minutesStr = minutes < 10 ? "0" + minutes : minutes

  return `${day} ${month} ${year}, ${hours}:${minutesStr}${ampm}`
}
