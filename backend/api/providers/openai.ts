import OpenAI from "openai";
import dotenv from "dotenv";
import { LLMProvider } from "./types";

dotenv.config();

// Dummy fallback key so the SDK can be instantiated even when OpenAI
// isn't configured (e.g. only DeepSeek/Kimi/Anthropic is in use).
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "missing",
});

// OpenAI uses the newer Responses API (not Chat Completions), so it gets
// its own provider rather than the openaiCompat factory.
export const openaiProvider: LLMProvider = {
    name: "openai",

    // Default/fallback provider — also explicitly owns gpt-* / o-series models.
    matches: (model) =>
        model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4"),

    async complete(prompt, model, _temperature) {
        const stream = await openai.responses.create({
            model,
            input: [{ role: "user", content: prompt }],
            reasoning: { effort: "minimal" },
            stream: true,
        });

        let outputText = "";
        for await (const chunk of stream) {
            const anyChunk = chunk as any;
            if (anyChunk.type === "response.output_text.delta" && anyChunk.delta) {
                outputText += anyChunk.delta;
            }
        }
        console.log("[openai] response (from stream):", outputText);
        return outputText;
    },

    async *streamChunks(prompt, model, _temperature) {
        const stream = await openai.responses.create({
            model,
            input: [{ role: "user", content: prompt }],
            reasoning: { effort: "minimal" },
            stream: true,
        });
        for await (const chunk of stream) {
            const anyChunk = chunk as any;
            if (anyChunk.type === "response.output_text.delta" && anyChunk.delta) {
                yield anyChunk.delta as string;
            }
        }
    },
};
