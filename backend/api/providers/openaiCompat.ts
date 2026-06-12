import OpenAI from "openai";
import dotenv from "dotenv";
import { LLMProvider } from "./types";

dotenv.config();

/**
 * Factory for any provider that speaks the OpenAI Chat Completions API
 * (DeepSeek, Kimi/Moonshot, Together, Groq, ...). They only differ by
 * baseURL, API key, and which model names they own.
 */
export function createOpenAICompatProvider(opts: {
    name: string;
    apiKey: string | undefined;
    baseURL: string;
    matches: (model: string) => boolean;
}): LLMProvider {
    // Dummy fallback key so the SDK can be instantiated even when this
    // provider isn't configured (another provider may be the one in use).
    const client = new OpenAI({
        apiKey: opts.apiKey || "missing",
        baseURL: opts.baseURL,
    });

    return {
        name: opts.name,
        matches: opts.matches,

        async complete(prompt, model, temperature) {
            const response = await client.chat.completions.create({
                model,
                temperature,
                messages: [{ role: "user", content: prompt }],
            });
            const outputText = response.choices[0]?.message?.content || "";
            console.log(`[${opts.name}] response:`, outputText);
            return outputText;
        },

        async *streamChunks(prompt, model, temperature) {
            const stream = await client.chat.completions.create({
                model,
                temperature,
                messages: [{ role: "user", content: prompt }],
                stream: true,
            });
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content;
                if (delta) yield delta;
            }
        },
    };
}
