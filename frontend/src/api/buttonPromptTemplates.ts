export const buttonPromptTemplates: Record<string, string> = {
  codebutton: "Generate a concise sub-theme name [within 2-6 words] to summarize the following selected open codes. Generate in plain texts no more than 50 characters.",

  codedefinitionbutton: "Summarize the following open codes (in formattedSelectedData) and generate a concise and straightforward but comprehensive definition to capture the essence (core meaning) of the sub-theme no more than 200 characters. The definition should not merely restate the sub-theme name, nor simply summarize the codes; it must express why the grouped codes belong together. Output format should strictly follow this: This sub-theme describes XXX. Examples:  1) Code 【Code Name PlaceHolder】, because yyy. 2) Code 【Code Name PlaceHolder】, because yyy. 3) Code 【Code Name PlaceHolder】, because yyy.",

  conceptbutton: "Generate a high-level, concise, abstract theme name (around 2~3 words) to summarize the following selected sub-themes. Generate in plain texts no more than 50 characters. ",

  conceptdefinitionbutton: `Summarize the following sub-themes (in formattedSelectedData) and generate a concise and straightforward but comprehensive definition to capture the essence (core meaning) of the theme no more than 200 characters. The definition should not merely restate the theme name, nor simply summarize the sub-themes; it must express why the grouped sub-themes belong together. Output format should strictly follow this: This theme describes XXX. Examples:  1) Sub-Theme 【Sub-Theme Name PlaceHolder】, because yyy. 2) Sub-Theme 【Sub-Theme Name PlaceHolder】, because yyy. 3) Sub-Theme 【Sub-Theme Name PlaceHolder】, because yyy.`,

};
