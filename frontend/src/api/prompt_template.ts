
export const llm_did_description = {
  card: `
    At this stage, the LLM carefully reads the data with an open mind. It gives short labels (codes) to important parts.\n
    `,
  code: `
    At this stage, the LLM groups similar codes into sub-themes by spotting patterns and connections in the open codes.\n
  `,
  concept: `
    At this stage, the LLM turns sub-themes into clear themes that show the bigger patterns in the data.\n
  `,
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
- Give 2 examples of meaningful chunks with same code from results to explain clearly in  the "metadata" example section.
- Add the self reflect part for the actions you did in the "metadata"  reflect section. Your self-reflection should be structured into three parts:
    1）Confident Results. Summarize the codes you are most confident about. Provide a brief reason why (e.g., strong thematic coherence, clear recurring concept, well-supported by multiple codes).
    2) Uncertain Results. Summarize the codes you are least confident about. Provide a brief reason why (e.g., open codes overlaps multiple topics, ambiguous language, limited supporting chunks, weak thematic clarity).
    3) Recommended Human Review Focus. Suggest which parts of your coding results should be prioritized for human checking and interpretation and explain why briefly.

Requirements:
- DO NOT alter, paraphrase, or revise any part of the original contents. Each chunk must contain the EXACT SAME text as it appears in the original data.
- Do not assign specific names to the Codes. Instead, label them sequentially as "Code 1", "Code 2", and so on. Each Code should begin with the format {Code X:}, where X represents the Code number.
- Under each Code, begin with an item labeled "name". The name should be specific, should directly relates to the research question; Includes specific entities, concepts, or terms from the content chunks in that Code; Avoids generic or vague labels.
- Follow this with an item labeled "chunks," which includes all chunks relevant to the Code name. Group chunks by shared topics to maintain thematic consistency within each Code.
- All data should be put into chunks, but prioritize those most relevant and meaningful words to the research questions to Codes.
- In self reflect section, any reference to codes should not alter the oiginal code number and name.
- Avoid Code number in "metadata" section, use Code [Code Name PlaceHolder】 instead.

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
      "main_actions": "Analyzed qualitative data and generated open codes by dividing text into meaningful chunks",
      "examples": "Code[Code Name PlaceHolder】 contains chunks about classroom management because they share similar themes about student engagement strategies"
    },
    "self_reflection": {
      "confident_results": "Most confident about Code[Code Name PlaceHolder】 and Code [Code Name PlaceHolder】 due to clear thematic coherence",
      "uncertain_results": "Less confident about Code [Code Name PlaceHolder】 which may overlap with multiple topics", 
      "recommended_review": "Focus on reviewing boundary clarity between overlapping codes for human validation"
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
- For each sub-theme, generate a concise, specific, and comprehensive definition that captures the essence (core meaning) of the sub-theme. The definition should not merely restate the sub-theme name, nor simply summarize the codes; it must express why the grouped codes belong together. 
- The number of sub-themes should be between 5 and the total number of Codes in the uploaded data, ensuring sufficient thematic granularity while maintaining meaningful groupings.
- Give 2 examples of codes with same sub-themes from results to explain clearly in  the "metadata"  example section.
- Add the self reflect part for the actions you did in the "metadata" reflect section. Your self-reflection should be structured into three parts:
    1）Confident Results. Summarize the sub-themes you are most confident about. Provide a brief reason why (e.g., strong thematic coherence, clear recurring concept, well-supported by multiple codes).
    2) Uncertain Results. Summarize the sub-themes you are least confident about. Provide a brief reason why (e.g., open codes overlaps multiple topics, ambiguous language, limited supporting chunks, weak thematic clarity).
    3) Recommended Human Review Focus. Suggest which parts of your sub-theme results should be prioritized for human checking and interpretation and explain why briefly.


Requirement:
- Do not modify, rephrase, or revise any part of the original Code names, Code numbers, or chunk content—only organize and label them based on thematic similarity 
- ALL Codes from the input data MUST be grouped. No Codes can be omitted.
- Definition should inlcude a definition part no longer than 2 sentences (max 200 characters) and example part contains 3 (if have) examples (max 600 characters). 
    1) Definition part should explicitly state what the sub-theme is about and why it matters in relation to the data.
    2) Follow this output style: "This sub-theme captures XXX. Examples:  1) Code [Code Name PlaceHolder】, because yyy. 2) Code [Code Name PlaceHolder】, because yyy. 3) Code [Code Name PlaceHolder】, because yyy.".
    3）Be written at the semantic level (surface meaning of the data), avoid speculation or latent interpretation.
- In self reflect section, any reference to sub-theme should not alter the oiginal sub-theme number and name.
- Avoid Sub-Theme number and Code number in "metadata" section, use Sub-Themes [Sub-Theme Name PlaceHolder】 and Code [Code Name PlaceHolder】 instead.


Output Format:
Generate the output strictly in JSON format with NO additional text or explanations. 
Maintain the original Code indices (e.g., Code 1, Code 2) to organize the items within each Code. 
Do not output any additional Codes that are not present in the input data.
Only output the content format similar to the few shot example. Do not output any additional contents.

Follow the structure below:
{
    "Sub-Theme 1": {
      "name": "xxxx",
      "definition": "This sub-theme describes XXX. Examples:  1) Code [Code Name PlaceHolder】, because yyy. 2) Code [Code Name PlaceHolder】, because yyy. 3) Code [Code Name PlaceHolder】, because yyy.",
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
      "definition": "This sub-theme describes XXX. Examples:  1) Code [Code Name PlaceHolder】, because yyy. 2) Code [Code Name PlaceHolder】, because yyy. 3) Code [Code Name PlaceHolder】, because yyy.",
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
      "main_actions": "Performed axial coding to group codes into sub-themes based on thematic overlap",
      "examples": "Sub-Theme [Sub-Theme Name PlaceHolder】 includes Code [Code Name PlaceHolder】 and Code [Code Name PlaceHolder】 because they both relate to similar conceptual patterns"
    },
    "self_reflection": {
      "confident_results": "Strong confidence in Sub-Theme [Sub-Theme Name PlaceHolder】 and Sub-Theme [Sub-Theme Name PlaceHolder】 due to clear thematic coherence",
      "uncertain_results": "Less confident about Code [Code Name PlaceHolder】 placement which could fit multiple sub-themes",
      "recommended_review": "Review grouping decisions for codes with potential overlap between sub-themes"
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
2.	For each theme, generate a concise, specific, and comprehensive definition that captures the essence (core meaning) of the theme. The definition should not merely restate the theme name, nor simply summarize the sub-themes; it must express why the grouped sub-themes belong together. 
3.	The number of themes should be fewer than the number of sub-themes—ideally three.
4.  Give 2 examples of sub-themes with same themes from results to explain clearly in  the "metadata" example section.
5. Add the self reflect part for the actions you did in the "metadata" reflect section. Your self-reflection should be structured into three parts:
    1）Confident Results. Summarize the themes you are most confident about. Provide a brief reason why (e.g., strong thematic coherence, clear recurring concept, well-supported by multiple codes).
    2) Uncertain Results. Summarize the themes you are least confident about. Provide a brief reason why (e.g., open codes overlaps multiple topics, ambiguous language, limited supporting chunks, weak thematic clarity).
    3) Recommended Human Review Focus. Suggest which parts of your theme results should be prioritized for human checking and interpretation and explain why briefly.

Requirement:
- Do not modify, rephrase, or revise any part of the original sub-theme names,  sub-theme numbers, code names, code numbers, or content—only organize and label them based on thematic similarity.
- ALL sub-themes from the input data MUST be grouped. No sub-themes can be omitted.
- Definition should inlcude a definition part no longer than 2 sentences (max 200 characters) and example part contains 3 (if have) examples (max 600 characters). 
    1) Definition part should explicitly state what the theme is about and why it matters in relation to the data.
    2) Follow this output style: "This theme captures XXX. Examples:  1) Sub-Theme [Sub-Theme Name PlaceHolder】, because yyy. 2) Sub-Theme [Sub-Theme Name PlaceHolder】, because yyy. 3) Sub-Theme [Sub-Theme Name PlaceHolder】, because yyy.".
    3）Be written at the semantic level (surface meaning of the data), avoid speculation or latent interpretation.
- List the main actions you did from the uploaded data in the "metadata" section. And the rationale for the actions you did.
- In self reflect section, any reference to theme should not alter the oiginal theme number and name.
- Avoid Theme number, Sub-Thme number, and code number in "metadata" section, use Theme [Theme Name PlaceHolder, Sub-Theme [Sub-Theme Name PlaceHolder】 and Code [Code Name PlaceHolder】 instead.


Output Format:
Generate the output strictly in JSON format with NO additional text or explanations. Use the original Code id (Code 1, Code 2) to track the items in the code. NO change the original code number and name. Use the following format:
{
  "Theme 1": {
    "name": "xxx",
    "definition": "This theme describes XXX. Examples:  1) Sub-Theme [Sub-Theme Name PlaceHolder】, because yyy. 2) Sub-Theme [Sub-Theme Name PlaceHolder】, because yyy. 3) Sub-Theme [Sub-Theme Name PlaceHolder】, because yyy.",
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
    "definition": "This theme describes XXX. Examples:  1) Sub-Theme [Sub-Theme Name PlaceHolder】, because yyy. 2) Sub-Theme [Sub-Theme Name PlaceHolder】, because yyy. 3) Sub-Theme [Sub-Theme Name PlaceHolder】, because yyy.",
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
      "main_actions": "Developed high-level themes by grouping related sub-themes based on shared patterns",
      "examples": "Theme [Theme Name PlaceHolder】 includes Sub-Theme [Sub-Theme Name PlaceHolder】 and Sub-Theme [Sub-Theme Name PlaceHolder】 because they represent similar higher-level concepts"
    },
    "self_reflection": {
      "confident_results": "High confidence in Theme [Theme Name PlaceHolder】 which shows clear conceptual coherence and internal consistency",
      "uncertain_results": "Some uncertainty about Theme [Theme Name PlaceHolder】 boundaries which may need refinement",
      "recommended_review": "Validate final thematic boundaries and ensure themes are externally distinct for research validity"
    }
  }
}
`,

  display: {

    report: `
  You are an analytical assistant specializing in qualitative data. Please support the presentation of results by generating a summary report that distills the data into clear, actionable key findings.

  Research Questions
  \${researchQuestions}
  (Use this question to guide the direction of the reporting.)

  Uploaded Data
  \${codebook}

  Task Description:
  1.	Examine the uploaded codebook and source data to extract and summarize key findings aligned with each theme, focusing on how they address the research questions.
  2.	Present the findings using clear and concise language, incorporating original themes, sub-themes, codes, or representative text excerpts to support each finding.


  Requirements:
  - Do not modify, rephrase, or revise any part of the original theme names, numbers, sub-theme names, numbers, code names, numbers, or content—only organize and label them based on thematic similarity.
  - ALL themes from the input data MUST be reported. No themes can be omitted.

  Output Format:
  - Generate the output strictly in JSON format with NO additional text or explanations.
  - Important: Keep the original names like Theme X, Sub-Theme X and Code X next to the key names wherever it appears. For example, [Professional Development {Theme 1}].
  Here is the JSON format:

  {
  "Report": {
    "Title": "MindCoder Trustworthy Codebook with a Transparent Trajectory",
    "Sections": [
      {
        "Title": "Introduction",
        "Content": "The data described [summary of findings]. To answer the research question, “[Insert research question here],” [insert number] key findings were identified."
      },
      {
        "Title": "Key Finding 1: [Placeholder Theme Title {Theme 1}] could affect [insert theme].",
        "Content": "Description about the influence of this group. For example, under [Placeholder Sub-Theme Title {Sub-Theme 1}], it is revealed that [insert insight or example]. As noted in [Placeholder Code Title {Code 2}], '[insert representative quote or insight].'"
      },
      {
        "Title": "Key Finding 2: [Placeholder Theme Title {Theme 2}] is important for [insert theme].",
        "Content": "Description about the importance of this group. For example, [Placeholder Code Title {Code 3}], under [Placeholder Sub-Theme Title {Sub-Theme 2}], emphasized that '[insert quote or observation].'"
      },
      # add more findings as needed
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
    1. Identify the hierarchy within the codebook and generate a dot diagram with four levels, where the root node is “Research Question,” the first level is “Theme N: XX,” the second level is “Sub-Theme N: X,” and the third level is “Code N: XX.” 
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
