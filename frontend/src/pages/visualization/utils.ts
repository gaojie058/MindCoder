import { API_URL } from "@/api/api";
import axios from "axios";

export const sendRequest = async (data: {
  prompt: string;
  files: File[];
}) => {
  try {
    const formData = new FormData();

    // Add FormData
    data.files.forEach(file => {
      formData.append('files', file);
    });


    formData.append('message', data.prompt);

    // for (let pair of formData.entries()) {
    //   console.log("😈😈😈😈😈😈 checking FormData", pair[0] + ': ' + pair[1]);
    //   }

    const response = await axios.post(API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error sending request to API:", error);
    throw error;
  }
};

export const promptGraph = {
  patchWork: `You are a helpful assistant in both qualitative analysis and dot lanaguage digraph designer. Please assist with final patchwork digraph in Graphviz dot language generating based on the uploaded codebook in qualitative analysis. 
  
 Uploaded Codebook:
  \${codebook}

Task Description:
1. Identify the hierarchy within the codebook and generate a rectangular treemap diagram in dot language, where every area is the Sub-theme in the codebook. 
2. Each area's name is the subtheme name, e.g., Sub-theme 1: XXX (N), where XXX is the actual code name, N is the number of codes under each sub-theme, and the area of each rectangle represents the number of codes it contains.

Requirement:
- Do not modify, rephrase, or revise any part of the original Sub-theme names.
- All Sub-theme names should be visualized and included. 
- DO NOT add any new sub-themes contents in patchwork. 

Output format:
- Generate the output strictly in dot langauge with NO additional text or explanations. 
- If the node label is too long, break the line using (\n) line breaks in DOT to format the text. Within each line, allow no more than two words. For example, "Sub-Theme 1:\nSleep\nRoutine\nDetails\n(8)".
- Use color scheme in few-shot example

Few-shot example structure:
- Start with: digraph { layout=patchwork; node [style=filled, fontname="Arial", fontsize=6]; }
- For each Sub-theme: "Sub-theme X:\nSub-theme Name\n(N)" [area=N fillcolor="#colorcode"];
- Use colors: #ffd79d (yellow), #cbe7f2 (blue), #d5d4f0 (purple), #d3f0d3 (green)
- End with: }

Example node format:
"Sub-theme 1:\nSub-theme Name\n(N)" [area=N fillcolor="#ffd79d"];
"Sub-theme 2:\nSub-theme Name\n(N)" [area=N fillcolor="#ffd79d"];
"Sub-theme 3:\nSub-theme Name\n(N)" [area=N fillcolor="#ffd79d"];

  `,
  osage: `You are a helpful assistant in both qualitative analysis and dot lanaguage digraph designer. Please assist with final osage digraph in Graphviz dot language generating based on the uploaded codebook in qualitative analysis.  

  Uploaded Codebook:
\${codebook}

Task Descriptions::

1. Parse the codebook to identify the hierarchy Theme → Subtheme → Code.
2. Draw a cluster for each Theme. Inside each Theme cluster, draw a cluster for each Subtheme. Inside each Subtheme cluster, create nodes for all Codes.
3. Preserve every original theme, subtheme and code name exactly (no rewriting, no reordering, no renaming).
4. The Theme label must follow:  Theme t: {ThemeName} (N) where N is the number of subthemes under that theme.
5. The Subtheme label must follow:  Subtheme t.s: {SubthemeName} (N) where N is the number of codes under that subtheme.
6. The Code label must follow:  Code t.s.c: {CodeName} (N) where (N) is the number of text chunks under that code.

Style & Layout:
1. Begin with this header and global styles (keep the font family, node shape, and cluster look exactly):
  digraph MindCoder {
  layout=osage;
  compound=true;
  splines=true;
  fontname="Helvetica";
  node [shape=box, fontname="Helvetica"];
  edge [fontname="Helvetica"];

2. Theme cluster (rotate the following color pairs by theme index):
  ID: cluster_theme{t}
  Label: label="Theme {t}: {ThemeName}";
  Style: style="rounded,filled"; penwidth=1.5;
  Fill color: chosen from  #cce5ff (light blue), #d5f5e3 (light green), #fdebd0 (light orange), #f9d5e5 (light pink)
  

3. Subtheme cluster (use the lighter pair matching the parent theme):
  ID: cluster_theme{t}_sub{s}
  Label: label="Subtheme {t}.{s}: {SubthemeName} (N)";
  Style: style="rounded,filled"
  Fill Color: chosen from #cce5ff (light blue), #d5f5e3 (light green), #fdebd0 (light orange), #f9d5e5 (light pink)


4. Code nodes (placed inside their Subtheme cluster):
  ID: T{t}_S{s}_C{c} (c = the code’s index within that subtheme, keep original order).
  Label: label="Code {c}: {OriginalCodeName}".
  If a label is too long, wrap with \n and keep no more than 3 words per line. For example:
  "Code 1: Distrust of agile \n buzz words by \n default"

Output rules:
- Output DOT only — no explanations, no markdown fences/backticks.
- Include all themes, subthemes, and codes from the codebook.
- Do not add any chunk contents.
- Properly close the graph with }.

digraph MindCoder {
  layout=osage;
  compound=true;
  splines=true;
  fontname="Helvetica";
  node [shape=box, fontname="Helvetica"];
  edge [fontname="Helvetica"];

  // ===== Theme 1 =====
  subgraph cluster_theme1 {
    label="Theme 1: Collaboration & Workflow";
    style="rounded,filled"; color="#3b82f6"; fillcolor="#eaf2ff"; penwidth=1.5;

    // --- Subtheme 1 ---
    subgraph cluster_theme1_sub1 {
      label="Subtheme 1: Hand-off Frictions (3)";
      style="rounded,filled"; color="#60a5fa"; fillcolor="#f3f8ff";
      T1_S1_C1 [label="Code 1: unclear ownership during \n hand-off"];
      T1_S1_C2 [label="Code 2: inconsistent file versions \n between teams"];
      T1_S1_C3 [label="Code 3: missing rationale in \n notes"];
    }

    // --- Subtheme 2 ---
    subgraph cluster_theme1_sub2 {
      label="Subtheme 2: Review Rituals (2)";
      style="rounded,filled"; color="#60a5fa"; fillcolor="#f3f8ff";
      T1_S2_C1 [label="Code 4: weekly syncs reduce \n drift"];
      T1_S2_C2 [label="Code 5: checklist improves traceability"];
    }
  }

  // ===== Theme 2 =====
  subgraph cluster_theme2 {
    label="Theme 2: Sensemaking Support";
    style="rounded,filled"; color="#10b981"; fillcolor="#ecfdf5"; penwidth=1.5;

    // --- Subtheme 3 ---
    subgraph cluster_theme2_sub3 {
      label="Subtheme 3: Transparency of LLM (2)";
      style="rounded,filled"; color="#34d399"; fillcolor="#f2fdf8";
      T2_S1_C1 [label="Code 6: show 'what LLM \n did' logs"];
      T2_S1_C2 [label="Code 7: highlight low-confidence \n areas"];
    }

    // --- Subtheme 4 ---
    subgraph cluster_theme2_sub4 {
      label="Subtheme 4: Human Interpretation (3)";
      style="rounded,filled"; color="#34d399"; fillcolor="#f2fdf8";
      T2_S2_C1 [label="Code 8: memo fields for \n reasoning"];
      T2_S2_C2 [label="Code 9: rename/ regroup with \n rationale"];
      T2_S2_C3 [label="Code 10: audit trail for \n decisions"];
    }
  }
}

`
}

// Uploaded Codebook:
// \${codebook}

// Task Description:
// 1. Identify the theme-subtheme-code hierarchy within the codebook and generate an osage diagram in dot language. 
// 2. Each area's name is the subtheme name, e.g., Subtheme 1: XXX (N), where XXX is the actual code name, N is the number of text chunks under each code.

// Requirement:
// - Do not modify, rephrase, or revise any part of the original theme-subtheme-code names.
// - All theme-subtheme-code names should be visualized and included. 
// - DO NOT add any chunks contents in osage. 

// Output format:
// - Generate the output strictly in dot langauge with NO additional text or explanations. 
// - If the node label is too long, break the line using (\n) line breaks in DOT to format the text. Within each line, allow no more than one word. For example, "Code 1:\nSleep\nRoutine\nDetails \n(8)".
// - Use color scheme in few-shot example


// Few-shot example structure:
// - Start with: digraph { layout=osage; node [style=filled, fontname="Arial", fontsize=12]; }
// - Create subgraphs for themes: subgraph Theme_X { label="Theme X: ThemeName"; }
// - Create subgraphs for sub-themes: subgraph Sub_theme_X { label="Sub-theme X: SubThemeName"; }
// - For each node: "NodeName" [label="Subtheme X:\nNodeLabel\n(N)", fillcolor="#colorcode"];
// - Use colors: #cce5ff (light blue), #d5f5e3 (light green), #fdebd0 (light orange), #f9d5e5 (light pink)
// - End with: }


// - Theme 1 → color="#3b82f6"; fillcolor="#eaf2ff"
//   - Theme 2 → color="#10b981"; fillcolor="#ecfdf5"
//   - Theme 3 → color="#f59e0b"; fillcolor="#fff7e6"
//   - Theme 4 → color="#8b5cf6"; fillcolor="#f3efff"
//   - (Theme 5+ repeat this cycle)


// - under Theme 1 → color="#60a5fa"; fillcolor="#f3f8ff"
//     - under Theme 2 → color="#34d399"; fillcolor="#f2fdf8"
//     - under Theme 3 → color="#fbbf24"; fillcolor="#fff9ee"
//     - under Theme 4 → color="#a78bfa"; fillcolor="#f7f3ff"