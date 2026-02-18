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
import useEditStore from "@/stores/useEditStore"

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

// Brand colors
const BRAND = {
  primary: '#CB9180',       // warm terracotta
  primaryDark: '#AA7667',   // darker terracotta
  primaryLight: '#E8CFC8',  // light terracotta
  primaryBg: '#FFFBF9',     // warm white
  primaryBg2: '#FFF5F0',    // warm cream
  aiPurple: '#7C5CCC',      // AI purple (matches web badge)
  aiLavender: '#E8D5F5',    // AI lavender bg
  humanBlue: '#2563EB',     // human blue
  humanBlueBg: '#EFF6FF',   // human blue bg
  aiBg: '#FDF6F3',          // AI section bg (warm peach)
  textDark: '#1F2937',      // near-black
  textMed: '#4B5563',       // medium gray
  textLight: '#6B7280',     // light gray
  border: '#E5D5CF',        // warm border
  borderLight: '#F0E6E0',   // lighter warm border
  accent: '#DC8B78',        // accent (step numbers)
};

// Function to create AI badge
function createAIBadge(): any {
  return {
    text: ' AI ',
    color: BRAND.aiPurple,
    bold: true,
    fontSize: 8,
    background: BRAND.aiLavender,
  };
}

// Function to create Human badge
function createHumanBadge(): any {
  return {
    text: ' Human ',
    color: BRAND.humanBlue,
    bold: true,
    fontSize: 8,
    background: BRAND.humanBlueBg,
  };
}

// Function to create User badge
function createUserBadge(): any {
  return {
    text: ' Human ',
    color: BRAND.humanBlue,
    bold: true,
    fontSize: 8,
    background: BRAND.humanBlueBg,
  };
}

// Function to create horizontal rule separator
function createHorizontalRule(): any {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0, y1: 0, x2: 515, y2: 0,
        lineWidth: 1,
        lineColor: BRAND.border
      }
    ],
    margin: [0, 6, 0, 6]
  };
}

// Function to clean inline references in text content
// Sanitize Unicode chars that Roboto can't render in pdfmake
function sanitizeText(str: string): string {
  return str
    .replace(/[\u2018\u2019\u201A\uFFFD]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D\u201E]/g, '"')            // smart double quotes
    .replace(/[\u2013\u2014]/g, '-')                   // en/em dash
    .replace(/\u2026/g, '...')                         // ellipsis
    .replace(/\u00A0/g, ' ')                           // non-breaking space
    .replace(/[\u2022\u2023\u25E6\u2043]/g, '-')      // bullet variants
    .replace(/[\u2003\u2002\u2009]/g, ' ')             // em/en/thin space
    .replace(/[\u00AB\u00BB]/g, '"')                   // guillemets
    .replace(/[\u2039\u203A]/g, "'")                   // single guillemets
    .replace(/\u00B7/g, '-')                           // middle dot
    .replace(/[\u2192\u2794\u279C\u27A1]/g, '->')      // arrows
    // Remove any remaining chars outside Basic Latin + Latin-1 Supplement that Roboto may not have
    .replace(/[^\x00-\xFF]/g, (ch) => {
      // Keep common Latin Extended chars that Roboto supports, strip the rest
      const code = ch.charCodeAt(0);
      if (code >= 0x100 && code <= 0x24F) return ch; // Latin Extended-A/B
      return '';
    });
}

function cleanContent(text: string): any[] {
  if (!text || typeof text !== 'string') return [{ text: '' }];

  text = sanitizeText(text);

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

  const sanitized = sanitizeText(title);
  const withoutBraces = sanitized.replace(/\{[^}]*\}/g, '');
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

// Function to calculate statistics for a step
function calculateStepStatistics(data: any[], isCard: boolean = false): { total: number, aiGenerated: number, userEdited: number } {
  if (!data || !Array.isArray(data)) {
    return { total: 0, aiGenerated: 0, userEdited: 0 };
  }

  const total = data.length;
  let aiGenerated = 0;
  let userEdited = 0;

  data.forEach(item => {
    if (isCard) {
      // For cards, check if it's GPT-generated
      if (item.isGPT) {
        aiGenerated++;
      } else {
        userEdited++;
      }
    } else {
      // For codes/concepts, check if it has been user-modified
      if (item.isGPT !== false) {
        aiGenerated++;
      } else {
        userEdited++;
      }
    }
  });

  return { total, aiGenerated, userEdited };
}

// Function to generate Analysis Configuration section
function generateAnalysisConfigurationContent(): Content[] {
  const result: Content[] = [];
  
  // Get data from stores
  const { researchQuestion, numberOfTopicClusters, clusteringStyle, codingStyle, conceptualizingStyle, uploadedFiles } = useAppStore.getState();

  result.push({
    text: "Analysis Configuration",
    fontSize: 16,
    bold: true,
    color: BRAND.primaryDark,
    marginBottom: 8,
    marginTop: 18,
    headlineLevel: 1,
    tocItem: true,
    id: 'analysisConfigurationSection'
  });

  result.push(createHorizontalRule());

  // Configuration table
  const configData = [
    // Header row
    [
      { text: 'Configuration Parameter', style: 'tableHeader', fillColor: BRAND.primaryBg2, bold: true, color: BRAND.primaryDark },
      { text: 'Setting', style: 'tableHeader', fillColor: BRAND.primaryBg2, bold: true, color: BRAND.primaryDark }
    ]
  ];

  // Research Question
  if (researchQuestion && typeof researchQuestion === 'string' && researchQuestion.trim()) {
    configData.push([
      { text: 'Research Question', fontSize: 10, bold: true },
      { text: researchQuestion.trim(), fontSize: 10 }
    ]);
  }

  // Number of Open Codes Range
  if (numberOfTopicClusters && numberOfTopicClusters.length === 2) {
    const [min, max] = numberOfTopicClusters;
    configData.push([
      { text: 'Open Codes Range', fontSize: 10, bold: true },
      { text: `${min} - ${max} codes per file`, fontSize: 10 }
    ]);
  }

  // Clustering Style
  if (clusteringStyle && typeof clusteringStyle === 'string' && clusteringStyle.trim()) {
    configData.push([
      { text: 'Clustering Style', fontSize: 10, bold: true },
      { text: clusteringStyle.trim(), fontSize: 10 }
    ]);
  }

  // Coding Style
  if (codingStyle && typeof codingStyle === 'string' && codingStyle.trim()) {
    configData.push([
      { text: 'Coding Style', fontSize: 10, bold: true },
      { text: codingStyle.trim(), fontSize: 10 }
    ]);
  }

  // Conceptualizing Style
  if (conceptualizingStyle && typeof conceptualizingStyle === 'string' && conceptualizingStyle.trim()) {
    configData.push([
      { text: 'Conceptualizing Style', fontSize: 10, bold: true },
      { text: conceptualizingStyle.trim(), fontSize: 10 }
    ]);
  }

  // Uploaded Files
  if (uploadedFiles && uploadedFiles.length > 0) {
    const fileNames = uploadedFiles.map(file => file.name.replace(/\.txt$/i, '')).join(', ');
    configData.push([
      { text: 'Uploaded Files', fontSize: 10, bold: true },
      { text: fileNames, fontSize: 10 }
    ]);
  }

  if (configData.length > 1) {
    result.push({
      table: {
        widths: ['25%', '75%'],
        body: configData
      },
      layout: {
        hLineWidth: function (i: number, node: any) {
          return i === 0 || i === node.table.body.length ? 1 : 0.5;
        },
        vLineWidth: function (i: number, node: any) {
          return 0;
        },
        hLineColor: function (i: number, node: any) {
          return BRAND.borderLight;
        },
        paddingLeft: function (i: number, node: any) { return 8; },
        paddingRight: function (i: number, node: any) { return 8; },
        paddingTop: function (i: number, node: any) { return 6; },
        paddingBottom: function (i: number, node: any) { return 6; }
      },
      marginBottom: 12
    });
  }

  result.push(createHorizontalRule());

  return result;
}

// Function to generate Open Codes process content (Step 1)
function generateOpenCodesProcessContent(): Content[] {
  const result: Content[] = [];

  // Get data from stores
  const { cardData } = useCardStore.getState();
  const { whatLLMDid: cardWhatLLMDid, rationale: cardRationale, llmDescription: cardLlmDescription } = useCardStore.getState();
  const { researchQuestion, numberOfTopicClusters } = useAppStore.getState();
  const { topicMemo } = useEditStore.getState();

  // Calculate statistics
  const stats = calculateStepStatistics(cardData || [], true);

  result.push({
    text: [
      { text: "Step 1: ", fontSize: 11, bold: true, color: BRAND.accent },
      { text: "Open Codes", fontSize: 11, bold: true }
    ],
    marginBottom: 6,
    marginTop: 8,
    headlineLevel: 2,
    tocItem: true,
    id: 'openCodesProcessSection',
    tocStyle: 'tocLevel2'
  });

  // Step summary box
  result.push({
    table: {
      widths: ['*'],
      body: [
        [{
          stack: [
            {
              text: "Step Summary",
              fontSize: 11,
              bold: true,
              marginBottom: 5,
              color: BRAND.textDark
            },
            {
              text: `Total Open Codes: ${stats.total} | AI-Generated: ${stats.aiGenerated} | User-Edited: ${stats.userEdited}`,
              fontSize: 10,
              marginBottom: 5
            },
            {
              text: "LLM generates initial open codes from raw data segments, while human researcher reviews, refines, and validates the coding scheme.",
              fontSize: 10,
              italics: true
            }
          ],
          fillColor: BRAND.primaryBg,
          margin: [10, 10, 10, 10]
        }]
      ]
    },
    layout: 'noBorders',
    marginBottom: 8
  });

  // AI Mechanical Task section
  if ((cardWhatLLMDid && typeof cardWhatLLMDid === 'string' && cardWhatLLMDid.trim()) ||
      (cardRationale && typeof cardRationale === 'string' && cardRationale.trim()) ||
      (cardLlmDescription && typeof cardLlmDescription === 'string' && cardLlmDescription.trim())) {

    const mechanicalTaskContent = [];

    mechanicalTaskContent.push({
      text: [
        createAIBadge(),
        { text: " MindCoder Mechanical Task", fontSize: 11, bold: true, marginLeft: 5 }
      ],
      marginTop: 5,
      marginBottom: 6,
      headlineLevel: 3,
      tocItem: false,
      id: 'topicMechanicalTask',
      tocStyle: 'tocLevel3',
      tocMargin: [10, 0, 0, 0]
    });

    if (cardLlmDescription && typeof cardLlmDescription === 'string' && cardLlmDescription.trim()) {
      mechanicalTaskContent.push({
        text: cleanContent(cardLlmDescription),
        fontSize: 10,
        marginBottom: 6,
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
          marginBottom: 5,
          headlineLevel: 4,
          id: 'cardWhatLLMDidParam'
        },
        {
          text: cleanContent(cardWhatLLMDid),
          fontSize: 10,
          marginBottom: 6,
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
          marginBottom: 5,
          headlineLevel: 4,
          id: 'cardRationaleParam'
        },
        {
          text: cleanContent(cardRationale),
          fontSize: 10,
          marginBottom: 6,
          marginLeft: 5
        }
      );
    }

    result.push({
      table: {
        widths: ['*'],
        body: [
          [{
            stack: mechanicalTaskContent,
            fillColor: BRAND.aiBg,
            margin: [10, 10, 10, 10]
          }]
        ]
      },
      layout: 'noBorders',
      marginTop: 8,
      marginBottom: 8
    });
  }

  // Human Interpretation section
  const humanInterpretationContent = [];

  humanInterpretationContent.push({
    text: [
      createHumanBadge(),
      { text: " Human Interpretation", fontSize: 11, bold: true, marginLeft: 5 }
    ],
    marginTop: 5,
    marginBottom: 6,
    headlineLevel: 3,
    tocItem: false,
    id: 'topicHumanInterpretation',
    tocStyle: 'tocLevel3',
    tocMargin: [10, 0, 0, 0]
  });

  // Human interpretation guidance
  humanInterpretationContent.push(
    {
      text: "In this stage, the LLM offers an exploratory coding draft, while you should bring critical interpretation, contextual knowledge, and methodological rigor. Your revisions, notes, and reflections ensure that the analysis stays trustworthy and grounded in both the data and the research aims.",
      fontSize: 10,
      marginBottom: 6,
      marginLeft: 5,
      alignment: 'justify'
    }
  );

  // Research Question
  if (researchQuestion && typeof researchQuestion === 'string' && researchQuestion.trim()) {
    humanInterpretationContent.push(
      {
        text: "Research Question",
        fontSize: 11,
        bold: true,
        marginTop: 8,
        marginBottom: 5,
        headlineLevel: 4,
        id: 'researchQuestionParam'
      },
      {
        text: cleanContent(researchQuestion),
        fontSize: 10,
        marginBottom: 6,
        marginLeft: 5
      }
    );
  }

  // Number of Open Codes Range
  if (numberOfTopicClusters && numberOfTopicClusters.length > 0) {
    const [min, max] = numberOfTopicClusters;
    humanInterpretationContent.push(
      {
        text: "Number of Open Codes",
        fontSize: 11,
        bold: true,
        marginTop: 8,
        marginBottom: 5,
        headlineLevel: 4,
        id: 'topicClustersParam'
      },
      {
        text: `Range: ${min} - ${max} open codes per file`,
        fontSize: 10,
        marginBottom: 6,
        marginLeft: 5
      }
    );
  }

  // Prompt to LLM
  humanInterpretationContent.push(
    {
      text: "Prompt to LLM",
      fontSize: 11,
      bold: true,
      marginTop: 8,
      marginBottom: 5,
      headlineLevel: 4,
      id: 'clusteringStyleParam'
    }
  );

  const { llmHistory = [] } = useLLMHistoryStore.getState();
  const cardHistory = llmHistory.filter(entry => entry.step === "card");
  if (cardHistory.length > 0) {
    cardHistory.forEach((entry) => {
      humanInterpretationContent.push(
        {
          text: formatTimestampForPDF(entry.timestamp),
          fontSize: 9,
          bold: true,
          marginLeft: 5,
          marginBottom: 3
        },
        {
          text: cleanContent(entry.userPrompt || ""),
          fontSize: 9,
          marginLeft: 5,
          marginBottom: 8
        }
      );
    });
  } else {
    humanInterpretationContent.push({
      text: "No customized prompt yet",
      fontSize: 9,
      marginLeft: 5,
      marginBottom: 8
    });
  }

  // User Memo
  humanInterpretationContent.push(
    {
      text: "User Memo",
      fontSize: 11,
      bold: true,
      marginTop: 8,
      marginBottom: 5,
      headlineLevel: 4,
      id: 'topicMemoParam'
    },
    {
      text: cleanContent(topicMemo && typeof topicMemo === 'string' && topicMemo.trim() ? topicMemo : "No memo added yet"),
      fontSize: 10,
      marginBottom: 6,
      marginLeft: 5
    }
  );

  result.push({
    table: {
      widths: ['*'],
      body: [
        [{
          stack: humanInterpretationContent,
          fillColor: BRAND.humanBlueBg,
          margin: [10, 10, 10, 10]
        }]
      ]
    },
    layout: 'noBorders',
    marginTop: 5,
    marginBottom: 12
  });

  result.push(createHorizontalRule());

  return result;
}

// Function to generate Sub-themes process content (Step 2)
function generateSubThemesProcessContent(): Content[] {
  const result: Content[] = [];

  // Get data from stores
  const { codeData } = useCodeStore.getState();
  const { whatLLMDid: codeWhatLLMDid, rationale: codeRationale, llmDescription: codeLlmDescription } = useCodeStore.getState();
  const { codeMemo } = useEditStore.getState();

  // Calculate statistics
  const stats = calculateStepStatistics(codeData || []);

  result.push({
    text: [
      { text: "Step 2: ", fontSize: 11, bold: true, color: BRAND.accent },
      { text: "Sub-themes", fontSize: 11, bold: true }
    ],
    marginBottom: 6,
    marginTop: 8,
    headlineLevel: 2,
    tocItem: true,
    id: 'subThemesProcessSection',
    tocStyle: 'tocLevel2'
  });

  // Step summary box
  result.push({
    table: {
      widths: ['*'],
      body: [
        [{
          stack: [
            {
              text: "Step Summary",
              fontSize: 11,
              bold: true,
              marginBottom: 5,
              color: BRAND.textDark
            },
            {
              text: `Total Sub-themes: ${stats.total} | AI-Generated: ${stats.aiGenerated} | User-Edited: ${stats.userEdited}`,
              fontSize: 10,
              marginBottom: 5
            },
            {
              text: "LLM groups open codes into coherent sub-themes, while human researcher validates groupings and refines thematic boundaries.",
              fontSize: 10,
              italics: true
            }
          ],
          fillColor: BRAND.primaryBg,
          margin: [10, 10, 10, 10]
        }]
      ]
    },
    layout: 'noBorders',
    marginBottom: 8
  });

  // AI Mechanical Task section
  if ((codeWhatLLMDid && typeof codeWhatLLMDid === 'string' && codeWhatLLMDid.trim()) ||
      (codeRationale && typeof codeRationale === 'string' && codeRationale.trim()) ||
      (codeLlmDescription && typeof codeLlmDescription === 'string' && codeLlmDescription.trim())) {

    const mechanicalTaskContent = [];

    mechanicalTaskContent.push({
      text: [
        createAIBadge(),
        { text: " MindCoder Mechanical Task", fontSize: 11, bold: true, marginLeft: 5 }
      ],
      marginTop: 5,
      marginBottom: 6,
      headlineLevel: 3,
      tocItem: false,
      id: 'codeMechanicalTask',
      tocStyle: 'tocLevel3',
      tocMargin: [10, 0, 0, 0]
    });

    if (codeLlmDescription && typeof codeLlmDescription === 'string' && codeLlmDescription.trim()) {
      mechanicalTaskContent.push({
        text: cleanContent(codeLlmDescription),
        fontSize: 10,
        marginBottom: 6,
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
          marginBottom: 5,
          headlineLevel: 4,
          id: 'codeWhatLLMDidParam'
        },
        {
          text: cleanContent(codeWhatLLMDid),
          fontSize: 10,
          marginBottom: 6,
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
          marginBottom: 5,
          headlineLevel: 4,
          id: 'codeRationaleParam'
        },
        {
          text: cleanContent(codeRationale),
          fontSize: 10,
          marginBottom: 6,
          marginLeft: 5
        }
      );
    }

    result.push({
      table: {
        widths: ['*'],
        body: [
          [{
            stack: mechanicalTaskContent,
            fillColor: BRAND.aiBg,
            margin: [10, 10, 10, 10]
          }]
        ]
      },
      layout: 'noBorders',
      marginTop: 8,
      marginBottom: 8
    });
  }

  // Human Interpretation section
  const subThemesHumanInterpretationContent = [];

  subThemesHumanInterpretationContent.push({
    text: [
      createHumanBadge(),
      { text: " Human Interpretation", fontSize: 11, bold: true, marginLeft: 5 }
    ],
    marginTop: 5,
    marginBottom: 6,
    headlineLevel: 3,
    tocItem: false,
    id: 'codeHumanInterpretation',
    tocStyle: 'tocLevel3',
    tocMargin: [10, 0, 0, 0]
  });

  // Human interpretation guidance
  subThemesHumanInterpretationContent.push(
    {
      text: "In this stage, the LLM provides an initial map of sub-themes, while you should bring judgment, contextual understanding, and methodological rigor to confirm, adjust, or expand the map. Your engagement ensures that the sub-themes stay trustworthy, relevant, and analytically useful.",
      fontSize: 10,
      marginBottom: 6,
      marginLeft: 5,
      alignment: 'justify'
    }
  );

  // Prompt to LLM
  subThemesHumanInterpretationContent.push(
    {
      text: "Prompt to LLM",
      fontSize: 11,
      bold: true,
      marginTop: 8,
      marginBottom: 5,
      headlineLevel: 4,
      id: 'codingStyleParam'
    }
  );

  const { llmHistory = [] } = useLLMHistoryStore.getState();
  const codeHistory = llmHistory.filter(entry => entry.step === "code");
  if (codeHistory.length > 0) {
    codeHistory.forEach((entry) => {
      subThemesHumanInterpretationContent.push(
        {
          text: formatTimestampForPDF(entry.timestamp),
          fontSize: 9,
          bold: true,
          marginLeft: 5,
          marginBottom: 3
        },
        {
          text: cleanContent(entry.userPrompt || ""),
          fontSize: 9,
          marginLeft: 5,
          marginBottom: 8
        }
      );
    });
  } else {
    subThemesHumanInterpretationContent.push({
      text: "No customized prompt yet",
      fontSize: 9,
      marginLeft: 5,
      marginBottom: 8
    });
  }

  // User Memo
  subThemesHumanInterpretationContent.push(
    {
      text: "User Memo",
      fontSize: 11,
      bold: true,
      marginTop: 8,
      marginBottom: 5,
      headlineLevel: 4,
      id: 'codeMemoParam'
    },
    {
      text: cleanContent(codeMemo && typeof codeMemo === 'string' && codeMemo.trim() ? codeMemo : "No memo added yet"),
      fontSize: 10,
      marginBottom: 6,
      marginLeft: 5
    }
  );

  result.push({
    table: {
      widths: ['*'],
      body: [
        [{
          stack: subThemesHumanInterpretationContent,
          fillColor: BRAND.humanBlueBg,
          margin: [10, 10, 10, 10]
        }]
      ]
    },
    layout: 'noBorders',
    marginTop: 5,
    marginBottom: 12
  });

  result.push(createHorizontalRule());

  return result;
}

// Function to generate Themes process content (Step 3)
function generateThemesProcessContent(): Content[] {
  const result: Content[] = [];

  // Get data from stores
  const { conceptData } = useConceptStore.getState();
  const { whatLLMDid: conceptWhatLLMDid, rationale: conceptRationale, llmDescription: conceptLlmDescription } = useConceptStore.getState();
  const { conceptualizingStyle } = useAppStore.getState();
  const { conceptMemo } = useEditStore.getState();

  // Calculate statistics
  const stats = calculateStepStatistics(conceptData || []);

  result.push({
    text: [
      { text: "Step 3: ", fontSize: 11, bold: true, color: BRAND.accent },
      { text: "Themes", fontSize: 11, bold: true }
    ],
    marginBottom: 6,
    marginTop: 8,
    headlineLevel: 2,
    tocItem: true,
    id: 'themesProcessSection',
    tocStyle: 'tocLevel2'
  });

  // Step summary box
  result.push({
    table: {
      widths: ['*'],
      body: [
        [{
          stack: [
            {
              text: "Step Summary",
              fontSize: 11,
              bold: true,
              marginBottom: 5,
              color: BRAND.textDark
            },
            {
              text: `Total Themes: ${stats.total} | AI-Generated: ${stats.aiGenerated} | User-Edited: ${stats.userEdited}`,
              fontSize: 10,
              marginBottom: 5
            },
            {
              text: "LLM synthesizes sub-themes into overarching themes, while human researcher provides interpretive depth and theoretical alignment.",
              fontSize: 10,
              italics: true
            }
          ],
          fillColor: BRAND.primaryBg,
          margin: [10, 10, 10, 10]
        }]
      ]
    },
    layout: 'noBorders',
    marginBottom: 8
  });

  // AI Mechanical Task section
  if ((conceptWhatLLMDid && typeof conceptWhatLLMDid === 'string' && conceptWhatLLMDid.trim()) ||
      (conceptRationale && typeof conceptRationale === 'string' && conceptRationale.trim()) ||
      (conceptLlmDescription && typeof conceptLlmDescription === 'string' && conceptLlmDescription.trim())) {

    const mechanicalTaskContent = [];

    mechanicalTaskContent.push({
      text: [
        createAIBadge(),
        { text: " MindCoder Mechanical Task", fontSize: 11, bold: true, marginLeft: 5 }
      ],
      marginTop: 5,
      marginBottom: 6,
      headlineLevel: 3,
      tocItem: false,
      id: 'conceptMechanicalTask',
      tocStyle: 'tocLevel3',
      tocMargin: [10, 0, 0, 0]
    });

    if (conceptLlmDescription && typeof conceptLlmDescription === 'string' && conceptLlmDescription.trim()) {
      mechanicalTaskContent.push({
        text: cleanContent(conceptLlmDescription),
        fontSize: 10,
        marginBottom: 6,
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
          marginBottom: 5,
          headlineLevel: 4,
          id: 'conceptWhatLLMDidParam'
        },
        {
          text: cleanContent(conceptWhatLLMDid),
          fontSize: 10,
          marginBottom: 6,
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
          marginBottom: 5,
          headlineLevel: 4,
          id: 'conceptRationaleParam'
        },
        {
          text: cleanContent(conceptRationale),
          fontSize: 10,
          marginBottom: 6,
          marginLeft: 5
        }
      );
    }

    result.push({
      table: {
        widths: ['*'],
        body: [
          [{
            stack: mechanicalTaskContent,
            fillColor: BRAND.aiBg,
            margin: [10, 10, 10, 10]
          }]
        ]
      },
      layout: 'noBorders',
      marginTop: 8,
      marginBottom: 8
    });
  }

  // Human Interpretation section
  const themesHumanInterpretationContent = [];

  themesHumanInterpretationContent.push({
    text: [
      createHumanBadge(),
      { text: " Human Interpretation", fontSize: 11, bold: true, marginLeft: 5 }
    ],
    marginTop: 5,
    marginBottom: 6,
    headlineLevel: 3,
    tocItem: false,
    id: 'conceptHumanInterpretation',
    tocStyle: 'tocLevel3',
    tocMargin: [10, 0, 0, 0]
  });

  // Human interpretation guidance
  themesHumanInterpretationContent.push(
    {
      text: "This stage transforms the analysis from a preliminary structure into a coherent thematic framework. The LLM offers a draft map of themes, and you should provide the critical review, interpretive judgment, and theoretical alignment necessary to produce a trustworthy and meaningful set of final themes.",
      fontSize: 10,
      marginBottom: 6,
      marginLeft: 5,
      alignment: 'justify'
    }
  );

  // Prompt to LLM
  themesHumanInterpretationContent.push(
    {
      text: "Prompt to LLM",
      fontSize: 11,
      bold: true,
      marginTop: 8,
      marginBottom: 5,
      headlineLevel: 4,
      id: 'conceptualizingStyleParam'
    }
  );

  const { llmHistory = [] } = useLLMHistoryStore.getState();
  const conceptHistory = llmHistory.filter(entry => entry.step === "concept");
  if (conceptHistory.length > 0) {
    conceptHistory.forEach((entry) => {
      themesHumanInterpretationContent.push(
        {
          text: formatTimestampForPDF(entry.timestamp),
          fontSize: 9,
          bold: true,
          marginLeft: 5,
          marginBottom: 3
        },
        {
          text: cleanContent(entry.userPrompt || ""),
          fontSize: 9,
          marginLeft: 5,
          marginBottom: 8
        }
      );
    });
  } else if (conceptualizingStyle && typeof conceptualizingStyle === 'string' && conceptualizingStyle.trim()) {
    themesHumanInterpretationContent.push({
      text: cleanContent(conceptualizingStyle),
      fontSize: 9,
      marginLeft: 5,
      marginBottom: 8
    });
  } else {
    themesHumanInterpretationContent.push({
      text: "No customized prompt yet",
      fontSize: 9,
      marginLeft: 5,
      marginBottom: 8
    });
  }

  // User Memo
  themesHumanInterpretationContent.push(
    {
      text: "User Memo",
      fontSize: 11,
      bold: true,
      marginTop: 8,
      marginBottom: 5,
      headlineLevel: 4,
      id: 'conceptMemoParam'
    },
    {
      text: cleanContent(conceptMemo && typeof conceptMemo === 'string' && conceptMemo.trim() ? conceptMemo : "No memo added yet"),
      fontSize: 10,
      marginBottom: 6,
      marginLeft: 5
    }
  );

  result.push({
    table: {
      widths: ['*'],
      body: [
        [{
          stack: themesHumanInterpretationContent,
          fillColor: BRAND.humanBlueBg,
          margin: [10, 10, 10, 10]
        }]
      ]
    },
    layout: 'noBorders',
    marginTop: 5,
    marginBottom: 12
  });

  result.push(createHorizontalRule());

  return result;
}

// Function to generate timeline/flow visualization
function generateTimelineContent(): Content[] {
  const result: Content[] = [];

  result.push({
    text: "Analysis Timeline",
    fontSize: 16,
    bold: true,
    color: BRAND.primaryDark,
    marginTop: 20,
    marginBottom: 8,
    headlineLevel: 2,
    tocItem: true,
    id: 'analysisTimelineSection',
    tocStyle: 'tocLevel2'
  });

  // Timeline visualization
  result.push({
    table: {
      widths: ['*', 30, '*', 30, '*'],
      body: [
        [
          {
            stack: [
              { text: "STEP 1", fontSize: 11, bold: true, color: BRAND.accent, alignment: 'center' },
              { text: "Open Codes", fontSize: 11, bold: true, alignment: 'center', marginTop: 5 },
              { text: "Raw data -> Initial codes", fontSize: 9, alignment: 'center', marginTop: 3 }
            ],
            fillColor: BRAND.primaryBg2,
            margin: [8, 8, 8, 8]
          },
          {
            text: ">>",
            fontSize: 16,
            bold: true,
            alignment: 'center',
            color: BRAND.textLight
          },
          {
            stack: [
              { text: "STEP 2", fontSize: 11, bold: true, color: BRAND.accent, alignment: 'center' },
              { text: "Sub-themes", fontSize: 11, bold: true, alignment: 'center', marginTop: 5 },
              { text: "Codes -> Grouped patterns", fontSize: 9, alignment: 'center', marginTop: 3 }
            ],
            fillColor: BRAND.primaryBg2,
            margin: [8, 8, 8, 8]
          },
          {
            text: ">>",
            fontSize: 16,
            bold: true,
            alignment: 'center',
            color: BRAND.textLight
          },
          {
            stack: [
              { text: "STEP 3", fontSize: 11, bold: true, color: BRAND.accent, alignment: 'center' },
              { text: "Themes", fontSize: 11, bold: true, alignment: 'center', marginTop: 5 },
              { text: "Sub-themes -> Final themes", fontSize: 9, alignment: 'center', marginTop: 3 }
            ],
            fillColor: BRAND.primaryBg2,
            margin: [8, 8, 8, 8]
          }
        ]
      ]
    },
    layout: 'noBorders',
    marginBottom: 12
  });

  result.push(createHorizontalRule());

  return result;
}

// Function to generate Open Codes section content (for Primary Codebook - data only)
function generateOpenCodesContent(): Content[] {
  const result: Content[] = [];
  // This section is now integrated into the main theme codebook
  return result;
}

// Function to generate Sub-themes section content (for Primary Codebook - data only)
function generateSubThemesContent(): Content[] {
  const result: Content[] = [];
  // This section is now integrated into the main theme codebook
  return result;
}

// Function to generate Themes section content (for Primary Codebook - improved table design)
// Lighten a hex color by blending with white
function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

// Generate 3-column Theme Map (Open Codes → Sub-themes → Themes) for PDF
function generateThemeMapTable(): Content[] {
  const { conceptData } = useConceptStore.getState();
  if (!conceptData || conceptData.length === 0) return [];

  const THEME_COLORS = ["#E3C8C0", "#FFE2D4", "#C9ECCF", "#C9ECE6", "#D5ECF9", "#DDDDF3", "#F9D5F8", "#F9D5D5"];

  const tableBody: any[][] = [];

  // Header row
  tableBody.push([
    { text: 'OPEN CODES', fontSize: 8, bold: true, color: BRAND.textLight, margin: [5, 4, 5, 4], fillColor: BRAND.primaryBg },
    { text: '', width: 15, fillColor: BRAND.primaryBg, margin: [0, 0, 0, 0] },
    { text: 'SUB-THEMES', fontSize: 8, bold: true, color: BRAND.textLight, margin: [5, 4, 5, 4], fillColor: BRAND.primaryBg },
    { text: '', width: 15, fillColor: BRAND.primaryBg, margin: [0, 0, 0, 0] },
    { text: 'THEMES', fontSize: 8, bold: true, color: BRAND.textLight, margin: [5, 4, 5, 4], fillColor: BRAND.primaryBg },
  ]);

  conceptData.forEach((concept, ci) => {
    // Always use palette by index (matching ThemeMap.tsx web view)
    const themeColor = THEME_COLORS[ci % THEME_COLORS.length];
    const codes = Object.values(concept.codes).flat();
    const allOpenCodes: { name: string; isAI: boolean; count: number }[] = [];

    codes.forEach((code, codeIdx) => {
      // Give each sub-theme a slightly different shade
      const hueShift = codes.length > 1 ? (codeIdx / codes.length) * 0.3 - 0.15 : 0;
      const baseR = parseInt(themeColor.slice(1, 3), 16);
      const baseG = parseInt(themeColor.slice(3, 5), 16);
      const baseB = parseInt(themeColor.slice(5, 7), 16);
      const sr = Math.min(255, Math.max(0, Math.round(baseR + hueShift * 60)));
      const sg = Math.min(255, Math.max(0, Math.round(baseG - hueShift * 30)));
      const sb = Math.min(255, Math.max(0, Math.round(baseB + hueShift * 20)));
      const codeColor = code.color || `#${sr.toString(16).padStart(2,"0")}${sg.toString(16).padStart(2,"0")}${sb.toString(16).padStart(2,"0")}`;
      const cards = Object.values(code.data || {}).flat();
      cards.forEach((card) => {
        allOpenCodes.push({
          name: card.name,
          isAI: card.isGPT !== false,
          count: (card.topics || []).length,
          color: codeColor,
        });
      });
    });

    // Build open codes column text
    const openCodesStack = allOpenCodes.map((oc) => ({
      text: [
        { text: '● ', color: oc.color, fontSize: 8 },
        oc.isAI ? createAIBadge() : createUserBadge(),
        { text: ` ${cleanTitle(oc.name)}`, fontSize: 8 },
        { text: ` (${oc.count})`, fontSize: 7, color: BRAND.textLight },
      ],
      margin: [0, 1, 0, 1],
    }));

    // Build sub-themes column
    const subthemesStack = codes.map((code) => ({
      text: [
        { text: '● ', color: code.color || lightenColor(themeColor, 0.15), fontSize: 9 },
        code.isGPT !== false ? createAIBadge() : createUserBadge(),
        { text: ` ${cleanTitle(code.name)}`, fontSize: 9, bold: true },
      ],
      margin: [0, 2, 0, 2],
    }));

    // Theme column
    const themeStack = [
      {
        text: [
          concept.isGPT !== false ? createAIBadge() : createUserBadge(),
          { text: ` ${cleanTitle(concept.name)}`, fontSize: 10, bold: true },
        ],
        margin: [0, 0, 0, 3],
      },
      ...(concept.definition ? [{
        text: cleanContent(concept.definition),
        fontSize: 8,
        color: BRAND.textLight,
        italics: true,
        margin: [0, 0, 0, 0],
      }] : []),
    ];

    tableBody.push([
      { stack: openCodesStack, margin: [5, 5, 5, 5] },
      { text: '→', fontSize: 10, color: BRAND.primaryLight, alignment: 'center', margin: [0, 5, 0, 0] },
      { stack: subthemesStack, margin: [5, 5, 5, 5], fillColor: lightenColor(themeColor, 0.6) },
      { text: '→', fontSize: 10, color: BRAND.primaryLight, alignment: 'center', margin: [0, 5, 0, 0] },
      { stack: themeStack, margin: [5, 5, 5, 5], fillColor: lightenColor(themeColor, 0.4) },
    ]);
  });

  return [{
    table: {
      headerRows: 1,
      widths: ['*', 15, '*', 15, '*'],
      body: tableBody,
    },
    layout: {
      hLineWidth: (i: number) => (i <= 1 ? 1 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => BRAND.borderLight,
      paddingLeft: () => 2,
      paddingRight: () => 2,
    },
    marginTop: 8,
    marginBottom: 8,
  }];
}

function generateThemesContent(): Content[] {
  const result: Content[] = [];

  // Get data from stores
  const { conceptData } = useConceptStore.getState();

  if (conceptData && conceptData.length > 0) {
    conceptData.forEach((concept, conceptIndex) => {
      // Theme header (colored row)
      const themeHeaderData = [
        [{
          text: [
            concept.isGPT !== false ? createAIBadge() : createUserBadge(),
            { text: ` ${cleanTitle(concept.name)}`, fontSize: 11, bold: true, marginLeft: 5 }
          ],
          fillColor: BRAND.primary,
          color: '#FFFFFF',
          margin: [10, 8, 10, 8]
        }]
      ];

      result.push({
        table: {
          widths: ['*'],
          body: themeHeaderData
        },
        layout: 'noBorders',
        marginTop: conceptIndex > 0 ? 20 : 10,
        marginBottom: 5,
        headlineLevel: 3,
        tocItem: true,
        id: `themes_concept_${concept.nanoid || concept.id}`,
        tocStyle: 'tocLevel3',
        tocMargin: [10, 0, 0, 0]
      });

      // Theme definition
      if (concept.definition) {
        result.push({
          table: {
            widths: ['*'],
            body: [
              [{
                text: cleanContent(concept.definition),
                fontSize: 10,
                italics: true,
                fillColor: BRAND.primaryBg,
                margin: [15, 10, 15, 10]
              }]
            ]
          },
          layout: 'noBorders',
          marginBottom: 6
        });
      }

      // Sub-themes table
      const subThemeRows = [];
      
      for (const codeKey in concept.codes) {
        const codes = concept.codes[codeKey];
        codes.forEach((code, codeIndex) => {
          // Sub-theme header row
          subThemeRows.push([
            {
              text: [
                code.isGPT !== false ? createAIBadge() : createUserBadge(),
                { text: ` ${cleanTitle(code.name)}`, fontSize: 11, bold: true, marginLeft: 5 }
              ],
              fillColor: BRAND.primaryLight,
              margin: [15, 6, 10, 6]
            }
          ]);

          // Sub-theme definition row
          if (code.definition) {
            subThemeRows.push([
              {
                text: cleanContent(code.definition),
                fontSize: 9,
                italics: true,
                fillColor: BRAND.primaryBg2,
                margin: [20, 6, 15, 6]
              }
            ]);
          }

          // Open codes rows
          for (const dataKey in code.data) {
            const clusters = code.data[dataKey];
            clusters.forEach((cluster, clusterIndex) => {
              if (cluster.active !== false) {
                // Alternate row colors for open codes
                const isEvenRow = clusterIndex % 2 === 0;
                const fillColor = isEvenRow ? '#FFFFFF' : BRAND.primaryBg;
                
                subThemeRows.push([
                  {
                    stack: [
                      {
                        text: [
                          cluster.isGPT ? createAIBadge() : createUserBadge(),
                          { text: ` ${cleanTitle(cluster.name)}`, fontSize: 10, bold: true, marginLeft: 5 }
                        ],
                        marginBottom: 3
                      },
                      ...(cluster.topics && cluster.topics.length > 0 ? [
                        {
                          text: `Data Segments (${cluster.topics.length}):`,
                          fontSize: 8,
                          bold: true,
                          marginBottom: 2,
                          color: BRAND.textLight
                        },
                        ...cluster.topics.slice(0, 3).map((topic: any) => ({
                          text: `"${topic.content.length > 100 ? topic.content.substring(0, 100) + '...' : topic.content}"`,
                          fontSize: 8,
                          marginBottom: 2,
                          marginLeft: 5,
                          italics: true,
                          color: BRAND.textDark
                        })),
                        ...(cluster.topics.length > 3 ? [{
                          text: `... and ${cluster.topics.length - 3} more segments`,
                          fontSize: 8,
                          italics: true,
                          color: BRAND.textLight,
                          marginLeft: 5
                        }] : [])
                      ] : [])
                    ],
                    fillColor,
                    margin: [25, 8, 15, 8]
                  }
                ]);
              }
            });
          }
        });
      }

      if (subThemeRows.length > 0) {
        result.push({
          table: {
            widths: ['*'],
            body: subThemeRows
          },
          layout: {
            hLineWidth: function (i: number, node: any) {
              return i === 0 || i === node.table.body.length ? 1 : 0.5;
            },
            vLineWidth: function (i: number, node: any) {
              return 0;
            },
            hLineColor: function (i: number, node: any) {
              return BRAND.borderLight;
            },
            paddingLeft: function (i: number, node: any) { return 0; },
            paddingRight: function (i: number, node: any) { return 0; },
            paddingTop: function (i: number, node: any) { return 0; },
            paddingBottom: function (i: number, node: any) { return 0; }
          },
          marginBottom: 8
        });
      }
    });
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
  cardData: CardDataForPDF[],
  fileCardMap: Record<string, string[]>
) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = (event.target?.result as string) || "";

      // Use the unified coverage calculation algorithm
      const coverage = calculateFileCoverageFromCardData(fileContent, file.name, cardData, fileCardMap);

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
  const { cardData, fileCardMap } = useCardStore.getState();

  console.log('PDF Coverage Calculation - Store data:', {
    uploadedFileNames: uploadedFiles.map(f => f.name),
    cardDataLength: cardData.length,
    allCardIds: cardData.map(c => c.id),
  });

  // Use existing coverage data, only calculate if missing
  const coveragePromises = uploadedFiles.map(async (file) => {
    const existingCoverage = fileCoverageData[file.name];

    if (existingCoverage) {
      console.log(`Using existing coverage data for ${file.name}:`, existingCoverage);
      return { fileName: file.name, coverage: existingCoverage };
    }

    // Only calculate if no existing data
    try {
      console.log(`No existing coverage data for ${file.name}, calculating...`);
      const coverage = await calculateFileCoverage(file, cardData, fileCardMap);
      setFileCoverageData(file.name, coverage);
      return { fileName: file.name, coverage };
    } catch (error) {
      console.error(`Error calculating coverage for ${file.name}:`, error);
      return { fileName: file.name, coverage: null };
    }
  });

  // Wait for all coverage calculations to complete
  await Promise.all(coveragePromises);

  // Get updated coverage data
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
            { text: " - Coverage calculation error", fontSize: 10, italics: true, color: BRAND.accent }
          ],
          fontSize: 11
        });
      } else {
        coverageItems.push({
          text: [
            { text: displayName, bold: true },
            { text: ` - ${coverage.coveragePercentage}% coverage (${coverage.coveredWords}/${coverage.totalWords} words)`, fontSize: 10 }
          ],
          fontSize: 11
        });
      }
    } else {
      // If no coverage data available, show file name with no coverage
      console.log(`No coverage data found for ${file.name} in PDF generation`);
      coverageItems.push({
        text: [
          { text: displayName, bold: true },
          { text: " - No coverage data available", fontSize: 10, italics: true }
        ],
        fontSize: 11
      });
    }
  });

  if (coverageItems.length > 0) {
    result.push({
      text: "Document Coverage",
      fontSize: 16,
      bold: true,
      marginTop: 8,
      marginBottom: 6,
      headlineLevel: 3,
      tocItem: true,
      id: 'documentCoverageSection',
      tocStyle: 'tocLevel3'
    });

    coverageItems.forEach(item => {
      result.push({
        ...item,
        marginBottom: 5,
        marginLeft: 10
      });
    });

    result.push({ text: "", marginBottom: 12 });
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
      { text: cleanTitle(sectionTitle), fontSize: 11, bold: true, marginTop: 8, marginBottom: 8, headlineLevel: 2 },
      { text: cleanContent(typeof sectionContent === 'string' ? sectionContent : ''), fontSize: 10, marginBottom: 12, alignment: 'justify' }
    );

    const subsections = section.Subsections;
    if (subsections && subsections.length > 0) {
      subsections.forEach((subsection: any, subIndex: number) => {
        const subsectionTitle = subsection.Title || subsection.title || `Subsection ${subIndex + 1}`;
        const subsectionContent = subsection.Content || subsection.content;

        reportContent.push(
          { text: cleanTitle(subsectionTitle), fontSize: 11, bold: true, marginTop: 8, marginBottom: 5, marginLeft: 15, headlineLevel: 3 },
          { text: cleanContent(typeof subsectionContent === 'string' ? subsectionContent : ''), fontSize: 10, marginBottom: 6, marginLeft: 15, alignment: 'justify' }
        );
      });
    }
  });

  if (report.Conclusion || report.conclusion) {
    const conclusion = report.Conclusion || report.conclusion;
    if (typeof conclusion === 'string') {
      reportContent.push(
        { text: "Conclusion", fontSize: 11, bold: true, marginTop: 8, marginBottom: 8, headlineLevel: 2 },
        { text: cleanContent(conclusion), fontSize: 10, marginBottom: 12, alignment: 'justify' }
      );
    }
  }

  const docDefinition = {
    pageSize: 'LETTER',
    pageOrientation: 'portrait',
    compress: true,
    pdfVersion: '1.7',
    pageMargins: [50, 45, 50, 45],

    styles: {
      tocTitle: {
        fontSize: 11,
        bold: true,
        margin: [0, 15, 0, 10]
      },
      tocText: {
        fontSize: 10
      },
      tocNumber: {
        fontSize: 9,
        italics: true
      },
      tocLevel1: {
        fontSize: 11,
        bold: true,
        margin: [0, 5, 0, 2],
        color: '#AA7667'
      },
      tocLevel2: {
        fontSize: 10,
        margin: [15, 3, 0, 2],
        italics: false
      },
      tocLevel3: {
        fontSize: 9,
        margin: [30, 2, 0, 2],
        color: '#000000'
      },
      tocLevel4: {
        fontSize: 9,
        margin: [60, 3, 0, 3],
        color: '#9B8578'
      },
      tocLevel5: {
        fontSize: 9,
        margin: [80, 2, 0, 2],
        color: '#9B8578'
      },
      tocLevel6: {
        fontSize: 9,
        margin: [100, 2, 0, 2],
        color: '#9B8578'
      },
      tableHeader: {
        bold: true,
        fontSize: 11,
        fillColor: '#F3F4F6'
      }
    },

    outline: [
      { title: cleanTitle(reportTitle), ref: 'reportTitle', open: true },
      { title: 'Analysis Configuration', ref: 'analysisConfigurationSection', open: true },
      { title: 'Findings', ref: 'reportSection', open: true },
      {
        title: 'Codebook Development Process',
        ref: 'codebookDevelopmentProcessSection',
        open: true,
        items: [
          {
            title: 'Step 1: Open Codes',
            ref: 'openCodesProcessSection',
            items: [
              { title: 'Human Interpretation', ref: 'topicHumanInterpretation' },
              { title: 'MindCoder Mechanical Task', ref: 'topicMechanicalTask' }
            ]
          },
          {
            title: 'Step 2: Sub-themes',
            ref: 'subThemesProcessSection',
            items: [
              { title: 'Human Interpretation', ref: 'codeHumanInterpretation' },
              { title: 'MindCoder Mechanical Task', ref: 'codeMechanicalTask' }
            ]
          },
          {
            title: 'Step 3: Themes',
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
      // Header with logo and date
      { image: logoBase64, width: 100, alignment: "center" },
      {
        text: formatDate(new Date()),
        fontSize: 9,
        color: BRAND.textLight,
        alignment: "center",
        margin: [0, 8, 0, 8],
      },
      
      // Main title
      {
        text: cleanTitle(reportTitle),
        fontSize: 11,
        bold: true,
        color: BRAND.textDark,
        alignment: "center",
        margin: [0, 0, 0, 12],
        headlineLevel: 1,
        id: 'reportTitle'
      },

      // Disclaimer section with improved styling
      {
        table: {
          widths: ['*'],
          body: [
            [{
              stack: [
                {
                  text: "Disclaimer",
                  fontSize: 9,
                  bold: true,
                  marginBottom: 3,
                  color: BRAND.textLight
                },
                {
                  text: "AI-assisted analysis. Codes and themes were generated by LLM and reviewed by the researcher. Treat as reference, not definitive findings.",
                  fontSize: 8,
                  color: BRAND.textLight,
                  alignment: 'left'
                }
              ],
              fillColor: BRAND.primaryBg,
              margin: [10, 8, 10, 8]
            }]
          ]
        },
        layout: 'noBorders',
        marginTop: 8,
        marginBottom: 8
      },

      // Table of Contents with improved styling
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
            { textStyle: 'tocLevel2', textMargin: [20, 0, 0, 0] },
            { textStyle: 'tocLevel3', textMargin: [40, 0, 0, 0] },
            { textStyle: 'tocLevel4', textMargin: [60, 0, 0, 0] },
            { textStyle: 'tocLevel5', textMargin: [80, 0, 0, 0] },
            { textStyle: 'tocLevel6', textMargin: [100, 0, 0, 0] }
          ]
        }
      },

      // Add horizontal rule after TOC
      createHorizontalRule(),

      // Analysis Configuration section (new requirement #4)
      ...generateAnalysisConfigurationContent(),

      // Key Finding Summary section
      {
        text: "Findings",
        fontSize: 16,
        bold: true,
        color: BRAND.primaryDark,
        marginBottom: 8,
        marginTop: 18,
        headlineLevel: 1,
        tocItem: true,
        id: 'reportSection'
      },
      createHorizontalRule(),
      ...reportContent,
      
      { text: '', pageBreak: 'before' },
      ...generateThemeMapTable(),


      // Codebook Development Process section
      {
        text: "Codebook Development Process",
        fontSize: 16,
        bold: true,
        color: BRAND.primaryDark,
        marginBottom: 8,
        marginTop: 18,
        headlineLevel: 1,
        tocItem: true,
        id: 'codebookDevelopmentProcessSection',
        pageBreak: 'before'
      },
      createHorizontalRule(),

      // Add timeline visualization
      ...generateTimelineContent(),

      // Step 1: Open Codes process section (improved)
      ...generateOpenCodesProcessContent(),
      
      // Step 2: Sub-themes process section (improved)
      ...generateSubThemesProcessContent(),
      
      // Step 3: Themes process section (improved)
      ...generateThemesProcessContent(),

      // Primary Codebook section
      {
        text: "Primary Codebook",
        fontSize: 16,
        bold: true,
        color: BRAND.primaryDark,
        marginBottom: 8,
        marginTop: 18,
        headlineLevel: 1,
        tocItem: true,
        id: 'primaryCodebookSection',
        pageBreak: 'before'
      },
      createHorizontalRule(),
      
      // Primary Codebook description
      {
        text: "This primary codebook is provided as a reference to support your downstream tasks, such as group discussions, the development of higher-level theories, and formal report writing. The table below shows the hierarchical structure of themes, sub-themes, and open codes with their associated data segments.",
        fontSize: 9,
        marginBottom: 8,
        italics: true,
        color: BRAND.textLight,
        alignment: 'justify'
      },
      
      // Document Coverage Information
      ...(await generateDocumentCoverageContent()),
      
      // Themes section with improved table-based design (requirement #5)
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