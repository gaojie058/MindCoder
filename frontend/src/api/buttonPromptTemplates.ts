export const buttonPromptTemplates: Record<string, string> = {
  codebutton: "Generate a concise name [within 2-6 words] to summarize the following selected topics contents. Generate in plain texts no more than 50 characters.",

  codedefinitionbutton: "Summarize the following contents (in formattedSelectedData) and generate a concise and straightforward but comprehensive definition to explain the main content in plain texts no more than 200 characters. Output format should strictly follow this: This code describes XXX, for example, XXX",

  conceptbutton: "Generate a high-level, concise, abstract name (around 2~3 words) to summarize the following selected codes contents. Generate in plain texts no more than 50 characters. ",

  conceptdefinitionbutton: `Summarize the following contents (in formattedSelectedData) and generate a concise and straightforward but comprehensive definition to explain the main content in plain texts no more than 200 characters. Output format should strictly follow this: This concept describes XXX, for example, XXX.`,

};
