export const buttonPromptTemplates: Record<string, string> = {
  codebutton: "Generate a concise sub-theme name [within 2-6 words] to summarize the following selected open codes. Generate in plain texts no more than 50 characters.",

  codedefinitionbutton: "Summarize the following open codes (in formattedSelectedData) and generate a concise, direct definition (1-2 sentences, max 200 characters) that captures what the sub-theme is about and why these codes belong together. Do not include examples. Do not merely restate the sub-theme name or list the codes.",

  conceptbutton: "Generate a high-level, concise, abstract theme name (around 2~3 words) to summarize the following selected sub-themes. Generate in plain texts no more than 50 characters. ",

  conceptdefinitionbutton: `Summarize the following sub-themes (in formattedSelectedData) and generate a concise, direct definition (1-2 sentences, max 200 characters) that captures what the theme is about and why these sub-themes belong together. Do not include examples. Do not merely restate the theme name or list the sub-themes.`,

};
