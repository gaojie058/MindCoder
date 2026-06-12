import { createOpenAICompatProvider } from "./openaiCompat";

// Kimi / Moonshot: OpenAI-compatible Chat Completions API.
// Models: kimi-k2-0711-preview, moonshot-v1-8k, moonshot-v1-32k, ...
// Use the global endpoint by default; override with KIMI_BASE_URL
// (China: https://api.moonshot.cn/v1).
export const kimiProvider = createOpenAICompatProvider({
    name: "kimi",
    apiKey: process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY,
    baseURL: process.env.KIMI_BASE_URL || "https://api.moonshot.ai/v1",
    matches: (model) => model.startsWith("kimi") || model.startsWith("moonshot"),
});
