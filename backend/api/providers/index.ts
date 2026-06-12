import { Response } from "express";
import dotenv from "dotenv";
import { LLMProvider } from "./types";
import { openaiProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import { deepseekProvider } from "./deepseek";
import { kimiProvider } from "./kimi";

dotenv.config();

// Registry. Order matters only for overlapping matchers; here they're
// disjoint by model prefix. OpenAI is last and also acts as the fallback.
const providers: LLMProvider[] = [
    anthropicProvider,
    deepseekProvider,
    kimiProvider,
    openaiProvider,
];

/** Pick the provider that owns this model name (falls back to OpenAI). */
export function getProvider(model: string): LLMProvider {
    return providers.find((p) => p.matches(model)) || openaiProvider;
}

/** Build the full prompt from user prompt + uploaded file contents. */
function buildFullPrompt(prompt: string, fileContents?: string[]): string {
    let fullPrompt = prompt;
    if (fileContents && fileContents.length > 0) {
        fullPrompt += `\n\n### Uploaded Files Content:\n${fileContents.join("\n\n")}`;
    }
    return fullPrompt;
}

/**
 * Non-streaming handler. Name kept for backward compatibility with the route.
 */
export const handleOpenAIRequest = async (
    prompt: string,
    fileContents?: string[],
    temperature: number = 0,
    model: string = "deepseek-chat"
): Promise<string> => {
    const fullPrompt = buildFullPrompt(prompt, fileContents);
    const provider = getProvider(model);
    try {
        return await provider.complete(fullPrompt, model, temperature);
    } catch (error) {
        console.error(`[${provider.name}] Error:`, error);
        throw new Error("Failed to process the prompt");
    }
};

/**
 * Streaming handler — writes SSE events to the Express response.
 * Each event: data: {"text": "..."}\n\n   Final event: data: [DONE]\n\n
 * Name kept for backward compatibility with the route.
 */
export const handleOpenAIRequestStream = async (
    prompt: string,
    fileContents: string[] | undefined,
    temperature: number,
    model: string,
    res: Response
): Promise<void> => {
    const fullPrompt = buildFullPrompt(prompt, fileContents);
    const provider = getProvider(model);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
        for await (const text of provider.streamChunks(fullPrompt, model, temperature)) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
    } catch (error) {
        console.error(`[${provider.name}] Streaming error:`, error);
        res.write(`data: ${JSON.stringify({ error: "Failed to process the prompt" })}\n\n`);
        res.end();
    }
};
