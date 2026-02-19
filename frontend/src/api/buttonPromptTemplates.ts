export const buttonPromptTemplates: Record<string, string> = {
  codebutton: "Generate a concise sub-theme name [within 2-6 words] to summarize the following selected open codes. Generate in plain texts no more than 50 characters.",

  codedefinitionbutton: "Read the open codes below and write a definition (2-3 sentences, max 300 characters) in plain everyday language. Start with 'This sub-theme...' as the subject, then use a verb to describe what it covers. Then explain why the codes are grouped together (e.g. 'They are grouped because...'). No examples, no jargon, no bullet points.",

  conceptbutton: "Generate a high-level, concise, abstract theme name (around 2~3 words) to summarize the following selected sub-themes. Generate in plain texts no more than 50 characters.",

  conceptdefinitionbutton: "Read the sub-themes below and write a definition (2-3 sentences, max 300 characters) in plain everyday language. Start with 'This theme...' as the subject, then use a verb to describe what it covers. Then explain why the sub-themes are grouped together (e.g. 'They are grouped because...'). No examples, no jargon, no bullet points.",

};
