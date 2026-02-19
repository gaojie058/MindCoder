
export const llm_did_description = {
  card: `Read your data and created initial open codes by grouping similar text chunks.`,
  code: `Grouped similar open codes into sub-themes based on shared patterns.`,
  concept: `Organized sub-themes into high-level themes that capture major patterns.`,
}


const promptTemplates: Record<string, string | { report: string; graph: string }> = {
  card: `user_message = '''
You are a helpful qualitative analysis assistant. Please assist with organizing qualitative data into different topics to perform open codes.

Qualitative Data:
\${uploadedFiles}

Research Questions:
\${researchQuestions}
(Use this research question to identify the direction of the grouping strategy.)

Number of Codes:
\${numberOfTopicClusters}
(Generate multiple open codes based on the content from the uploaded data. The number of open codes should be between the two numbers given above. )


Open Codes Style:
\${clusteringStyle}
(ALWAYS use this "Open Codes Style" to guide how to assign open codes names to the data. If it is empty, assign open codes names based on semantic meaning using the original terms from the data.)

Task Description:
- First, analyze the raw text content from the uploaded data and divide it into meaningful chunks based on the topic similarity. Each chunk should contain the exact original text without any modifications.
- Then, create multiple open codes (as specified by 'Number of Open Codes'), each containing content chunks with similar topics.
- In "metadata", provide 2 short examples showing why specific chunks belong to a code.
- In "metadata" self_reflection, be concise but ALWAYS reference specific Code【Name】 examples:
    1) confident_results: Which codes are strongest? Reference Code【Name】 with brief reason (1-2 sentences).
    2) uncertain_results: Which codes may overlap or are weakest? Reference Code【Name】 (1-2 sentences).
    3) recommended_review: What should humans check? Reference Code【Name】 with specific concern (1-2 sentences).

Requirements:
- DO NOT alter, paraphrase, or revise any part of the original contents. Each chunk must contain the EXACT SAME text as it appears in the original data.
- Do not assign specific names to the Codes. Instead, label them sequentially as "Code 1", "Code 2", and so on. Each Code should begin with the format {Code X:}, where X represents the Code number.
- Under each Code, begin with an item labeled "name". The name should be specific, should directly relates to the research question; Includes specific entities, concepts, or terms from the content chunks in that Code; Avoids generic or vague labels.
- Follow this with an item labeled "chunks," which includes all chunks relevant to the Code name. Group chunks by shared topics to maintain thematic consistency within each Code.
- All data should be put into chunks, but prioritize those most relevant and meaningful words to the research questions to Codes.
- In self reflect section, any reference to codes should not alter the oiginal code number and name.
- Avoid Code number in "metadata" section, use Code 【Code Name PlaceHolder】 instead.

Output Format:
Provide the output strictly in JSON format without any additional text or explanations.
Generate a title/name for each Code no more than 20 characters.
Don't include strange characters (e.g., '\\', '\') in any text.
Do not abbreviate the original data from the uploaded data; instead, output all content exactly as it appears in the original data.

Code Example:
{

  "Code X":{
    "name": "placeholder",
    "chunks":
      [
        "xxxx",
        "xxxx",
        "xxxxxxx"
        "xxxx"
        // Additional entries can be added here as needed
      ]
  },
  "metadata": {
    "what_llm_did": {
      "main_actions": "Grouped text into open codes by topic similarity",
      "examples": "Code【Name】 groups chunks about X. Code【Name】 groups chunks about Y."
    },
    "self_reflection": {
      "confident_results": "Code【Name】 and Code【Name】: clear thematic coherence",
      "uncertain_results": "Code【Name】 may overlap with Code【Name】",
      "recommended_review": "Check boundary between Code【Name】 and Code【Name】"
    }
  }
}

'''
`,


  code: `
You are a helpful qualitative analysis assistant. Your task is to perform axial coding to generate sub-themes based on codes provided.


Uploaded Data:
\${codeFiles}

Number of Codes:
\${numberOfTopicClusters}

Sub Theme Style:
\${codingStyle}
(ALWAYS use this "Sub Theme Style" to guide how to assign sub-themes to the data. If it is empty, assign sub-theme names that descriptively and specifically summarize the main content of the data.)


Task Description:
- Data: The qualitative data for axial coding analysis is under "Uploaded Data", comprising different Codes that can be grouped.
- Grouping: Group similar "Code X" based on high-level thematic overlap. Maintain the original Code numbers (e.g., "Code 4" should remain "Code 4"), even after grouping.
- Coding: Propose and assign a group name (i.e., Sub-Theme X) to each group that best represents the main theme or topic of the grouped Codes.
- Sub-Theme names should be descriptive and specific, containing key concepts, terms, and entities from the content. Each sub-theme name should be 4-8 words long and clearly reflect the main theme of its grouped Codes.
- For each sub-theme, write a plain-language definition (2-3 sentences) that starts with a verb. Explain what these codes talk about, what they share, and why they form one group.
- The number of sub-themes should be between 5 and the total number of Codes in the uploaded data, ensuring sufficient thematic granularity while maintaining meaningful groupings.
- In "metadata", provide 2 short examples showing why specific codes belong to a sub-theme.
- In "metadata" self_reflection, be concise but ALWAYS reference specific Code【Name】 examples:
    1) confident_results: Which sub-themes are strongest? Reference Code【Name】 with brief reason (1-2 sentences).
    2) uncertain_results: Which groupings may overlap or are weakest? Reference Code【Name】 (1-2 sentences).
    3) recommended_review: What should humans check? Reference Code【Name】 with specific concern (1-2 sentences).


Requirement:
- Do not modify, rephrase, or revise any part of the original Code names, Code numbers, or chunk content-only organize and label them based on thematic similarity
- ALL Codes from the input data MUST be grouped. No Codes can be omitted.
- Definition: 2-3 sentences (max 300 characters) in plain everyday language. Start with a verb. No examples, no jargon.
    1) Describe what the codes talk about and what connects them — in words anyone can understand.
    2) Stick to what the data actually says — don't speculate or interpret beyond the surface meaning.
- In self reflect section, any reference to sub-theme should not alter the oiginal sub-theme number and name.
- Avoid Sub-Theme number and Code number in "metadata" section, use Sub-Themes 【Sub-Theme Name PlaceHolder】 and Code 【Code Name PlaceHolder】 instead.


Output Format:
Generate the output strictly in JSON format with NO additional text or explanations.
Maintain the original Code indices (e.g., Code 1, Code 2) to organize the items within each Code.
Do not output any additional Codes that are not present in the input data.
Only output the content format similar to the few shot example. Do not output any additional contents.

Follow the structure below:
{
    "Sub-Theme 1": {
      "name": "xxxx",
      "definition": "Describes what these codes talk about and what connects them.",
      "codes": {
        "Code 1": {
            "name": "placeholder",
            "chunks":[
                "xxxx",
                "xxxx"
                ]
            },
        "Code 2": {
            "name": "placeholder",
            "chunks":[
                "xxxx",
                "xxxxxxx"
                ]
            }
      }
    },
    "Sub-Theme 2": {
      "name": "xxxx",
      "definition": "Describes what these codes talk about and what connects them.",
      "codes": {
        "Code 3": {
            "name": "placeholder",
            "chunks":[
                "xxxx",
                "xxxx",
                "xxxxxxx"
                "xxxx"
                ]
            }
      }
    },
    # add more codes as needed
    "metadata": {
    "what_llm_did": {
      "main_actions": "Grouped codes into sub-themes by thematic overlap",
      "examples": "Sub-Theme【Name】 groups Code【Name】 and Code【Name】 (shared pattern). Sub-Theme【Name】 groups Code【Name】 (distinct focus)."
    },
    "self_reflection": {
      "confident_results": "Sub-Theme【Name】 and Sub-Theme【Name】: clear coherence",
      "uncertain_results": "Code【Name】 could fit multiple sub-themes",
      "recommended_review": "Check overlap between Sub-Theme【Name】 and Sub-Theme【Name】"
    }
  }
  }
`,

  concept: `
You are a helpful qualitative analysis assistant. I have developed codes,please assist by developing high-level descriptive themes by grouping sub-themes together.

Research Questions
\${researchQuestion}
(Use this question to identify the direction of the grouping strategy.)

Sub-Themes Need To Be Analysed:
\${conceptData}


Theme Style
\${conceptualizingStyle}
(ALWAYS use this "Theme Style" to guide how to assign themes to the data. If it is empty, assign theme names that provide a high-level summary of the main content of the data.)


Task Description:
1.	Group the uploaded sub-themes based on shared high-level themes, with the grouping guided by the underlying research question.
2.	For each theme, write a plain-language definition (2-3 sentences) that starts with a verb. Explain what these sub-themes talk about, what they share, and why they form one group.
3.	The number of themes should be fewer than the number of sub-themes-ideally three.
4. In "metadata", provide 2 short examples showing why specific sub-themes belong to a theme.
5. In "metadata" self_reflection, be concise but ALWAYS reference specific Code【Name】 or sub-theme examples:
    1) confident_results: Which themes are strongest? Reference specific codes/sub-themes with brief reason (1-2 sentences).
    2) uncertain_results: Which groupings may overlap or are weakest? Reference specific codes/sub-themes (1-2 sentences).
    3) recommended_review: What should humans check? Reference specific codes/sub-themes with concern (1-2 sentences).

Requirement:
- Do not modify, rephrase, or revise any part of the original sub-theme names,  sub-theme numbers, code names, code numbers, or content-only organize and label them based on thematic similarity.
- ALL sub-themes from the input data MUST be grouped. No sub-themes can be omitted.
- Definition: 2-3 sentences (max 300 characters) in plain everyday language. Start with a verb. No examples, no jargon.
    1) Describe what the sub-themes talk about and what connects them — in words anyone can understand.
    2) Stick to what the data actually says — don't speculate or interpret beyond the surface meaning.
- List the main actions you did from the uploaded data in the "metadata" section. And the rationale for the actions you did.
- In self reflect section, any reference to theme should not alter the oiginal theme number and name.
- Avoid Theme number, Sub-Thme number, and code number in "metadata" section, use Theme 【Theme Name PlaceHolder, Sub-Theme 【Sub-Theme Name PlaceHolder】 and Code 【Code Name PlaceHolder】 instead.


Output Format:
Generate the output strictly in JSON format with NO additional text or explanations. Use the original Code id (Code 1, Code 2) to track the items in the code. NO change the original code number and name. Use the following format:
{
  "Theme 1": {
    "name": "xxx",
    "definition": "Describes what these sub-themes talk about and what connects them.",
    "subthemes": {
      "Sub-Theme 1": {
        "name": "xxxx",
        "codes": {
          "Code 1": {
            "name": "placeholder",
            "chunks": [
              "xxxx",
              "xxxx"
            ]
          },
          "Code 2": {
            "name": "placeholder",
            "chunks": [
              "xxxx",
              "xxxxxxx"
            ]
          }
        }
      },
      "Sub-Theme 2": {
        "name": "xxxx",
        "codes": {
          "Code 3": {
            "name": "placeholder",
            "chunks": [
              "xxxx",
              "xxxx",
              "xxxxxxx",
              "xxxx"
            ]
          }
        }
      }
    },
    "Theme 2": {
    "name": "xxx",
    "definition": "Describes what these sub-themes talk about and what connects them.",
    "subthemes": {
      "Sub-Theme 3": {
        "name": "xxxx",
        "codes": {
          "Code 4": {
            "name": "placeholder",
            "chunks": [
              "xxxx",
              "xxxx"
            ]
          },
          "Code 5": {
            "name": "placeholder",
            "chunks": [
              "xxxx",
              "xxxxxxx"
            ]
          }
        }
      }
    }
  },
  "metadata": {
    "what_llm_did": {
      "main_actions": "Grouped sub-themes into high-level themes by shared patterns",
      "examples": "Theme【Name】 groups Sub-Theme【Name】 and Sub-Theme【Name】 (shared concept). Theme【Name】 groups Sub-Theme【Name】 (distinct focus)."
    },
    "self_reflection": {
      "confident_results": "Theme【Name】: strong internal coherence",
      "uncertain_results": "Theme【Name】 boundaries may need refinement",
      "recommended_review": "Check distinction between Theme【Name】 and Theme【Name】"
    }
  }
}
`,

  display: {

    report: `
  You are an analytical assistant specializing in qualitative data. Generate a concise findings report from the codebook.

  Research Questions
  \${researchQuestions}

  Codebook
  \${codebook}

  Task:
  - Summarize each theme as one finding in 2-3 sentences max.
  - Reference sub-themes and codes by name (keep original labels like {Theme 1}, {Sub-Theme 2}, {Code 3}).
  - Be direct and evidence-based. No filler, no repetition. Each finding should state the core insight and cite 1-2 supporting codes or quotes.
  - Wrap direct quotes or evidence excerpts in *single asterisks* for italic emphasis, e.g., *"I always modify them because they're never perfect."*
  - ALL themes must be covered. No omissions.

  Requirements:
  - Do not modify original theme/sub-theme/code names or numbers.
  - Keep findings concise — aim for brevity over elaboration.
  - Introduction should be 1-2 sentences stating the research question and number of findings.

  Output strictly in JSON:

  {
  "Report": {
    "Title": "MindCoder Analysis Report",
    "Sections": [
      {
        "Title": "Introduction",
        "Content": "[1-2 sentences: research question + number of findings identified]"
      },
      {
        "Title": "Finding 1: [Theme Name {Theme 1}]",
        "Content": "[2-3 sentences: core insight + supporting evidence from sub-themes/codes]"
      }
    ]
  }
}
  `,

    graph: `You are a helpful assistant in both qualitative analysis and dot lanaguage graph designer. Please assist with final mindmap graph generating based on the uploaded codebook in qualitative analysis.


    Research Questions
    \${researchQuestions}
    (Use this question to identify the direction of the final analysis strategy. The whole analysis is for answering these questions.)

    Uploaded Codebook:
    \${codebook}

    Task description:
    1. Identify the hierarchy within the codebook and generate a dot diagram with four levels, where the root node is "Research Question," the first level is "Theme N: XX," the second level is "Sub-Theme N: X," and the third level is "Code N: XX."
    2. At the end of each cluster, add counts of chunks it contains, e.g., Code N: XX (Number)
    3. Generate a mindmap graph representation using DOT language
    4. The root node of the graph should be research question.


    Requirement:
    - Do not modify, rephrase, or revise any part of the original theme names, numbers, sub-theme names, numbers, code names, numbers.
    - All themes, sub-themes, codes should be visualized and included.
    - DO NOT add any chunks in mindmap.

    Output format:
    - Generate the output strictly in dot langauge with NO additional text or explanations.
    - If the node label is too long, break the line using (\n) line breaks in DOT to format the text. Within each line, allow no more than three words. NOT \\n.
    - Use color scheme in few-shot example

    Here is an example of the output format:
    digraph G {
  graph [bgcolor=white, splines=true, rankdir=LR];
  node [shape=ellipse, style=filled, fontname="Arial", fontsize=12];
  edge [penwidth=2, style=rounded];

  "Research\nQuestion:\nQuestion\nPlaceholder" [fillcolor="#a9a9a9", fontcolor="#000", fontsize=14];

  "Theme 1" [label="Theme 1:\nPlaceholder\nTheme", fillcolor="#ffd79d"];
  "Theme 2" [label="Theme 2:\nPlaceholder\nTheme", fillcolor="#d5d4f0"];

  "Research\nQuestion:\nQuestion\nPlaceholder" -> "Theme 1";
  "Research\nQuestion:\nQuestion\nPlaceholder" -> "Theme 2";
  "Sub-Theme 1" [label="Sub-Theme 1:\nPlaceholder\nSub-Theme", fillcolor="#cbe7f2"];
  "Theme 1" -> "Sub-Theme 1";
  "Code 1" [label="Code 1:\nPlaceholder\nCode\n(8)", fillcolor="#d3f0d3"];
  "Sub-Theme 1" -> "Code 1";

  "Sub-Theme 2" [label="Sub-Theme 2:\nPlaceholder\nSub-Theme", fillcolor="#cbe7f2"];
  "Sub-Theme 3" [label="Sub-Theme 3:\nPlaceholder\nSub-Theme", fillcolor="#cbe7f2"];
  "Theme 2" -> "Sub-Theme 2";
  "Theme 2" -> "Sub-Theme 3";

  "Code 2" [label="Code 2:\nPlaceholder\nCode\n(5)", fillcolor="#d3f0d3"];
  "Code 3" [label="Code 3:\nPlaceholder\nCode\n(11)", fillcolor="#d3f0d3"];
  "Sub-Theme 2" -> "Code 2";
  "Sub-Theme 2" -> "Code 3";

  "Code 4" [label="Code 4:\nPlaceholder\nCode\n(7)", fillcolor="#d3f0d3"];
  "Code 5" [label="Code 5:\nPlaceholder\nCode\n(13)", fillcolor="#d3f0d3"];
  "Sub-Theme 3" -> "Code 4";
  "Sub-Theme 3" -> "Code 5";
}

  `}
};

export const getPromptTemplate = (
  storeType: string,
  props: Record<string, any>,
  taskType?: string
): string => {
  let template: string | undefined;

  if (storeType === 'display') {
    const displayTemplates = promptTemplates[storeType];
    if (typeof displayTemplates === 'object') {
      if (taskType === 'report' || taskType === 'graph') {
        template = displayTemplates[taskType];
      } else {
        const reportTemplate = displayTemplates.report || '';
        const graphTemplate = displayTemplates.graph || '';
        template = `### Report Template ###\n${reportTemplate}\n\n### Graph Template ###\n${graphTemplate}`;
      }
    }
  } else {
    template = promptTemplates[storeType] as string;
  }

  if (typeof template !== 'string' || template === undefined) {
    throw new Error(`Template for storeType "${storeType}" is not a valid string.`);
  }

  Object.keys(props).forEach(key => {
    const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
    const value = props[key];

    // Special handling for numberOfTopicClusters when it's an array (range)
    if (key === 'numberOfTopicClusters' && Array.isArray(value)) {
      const rangeText = `${value[0]}-${value[1]}`;
      template = template!.replace(placeholder, rangeText);
    } else {
      const stringValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      template = template!.replace(placeholder, stringValue);
    }
  });

  return template;
};
