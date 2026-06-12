import { createOpenAICompatProvider } from "./openaiCompat";

// DeepSeek: OpenAI-compatible Chat Completions API.
// Models: deepseek-chat (V3), deepseek-reasoner (R1).
export const deepseekProvider = createOpenAICompatProvider({
    name: "deepseek",
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    matches: (model) => model.startsWith("deepseek"),
});
