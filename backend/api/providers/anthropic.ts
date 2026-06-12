import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { LLMProvider } from "./types";

dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Map friendly names from the UI to actual model IDs.
const modelMap: Record<string, string> = {
    "claude-sonnet": "claude-sonnet-4-20250514",
};

function resolveModel(model: string): string {
    return modelMap[model] || model;
}

export const anthropicProvider: LLMProvider = {
    name: "anthropic",
    matches: (model) => model.startsWith("claude"),

    async complete(prompt, model, temperature) {
        const response = await anthropic.messages.create({
            model: resolveModel(model),
            max_tokens: 8192,
            temperature,
            messages: [{ role: "user", content: prompt }],
        });

        const outputText = response.content
            .filter((block: any) => block.type === "text")
            .map((block: any) => block.text)
            .join("");
        console.log("[anthropic] response:", outputText);
        return outputText;
    },

    async *streamChunks(prompt, model, temperature) {
        const stream = anthropic.messages.stream({
            model: resolveModel(model),
            max_tokens: 8192,
            temperature,
            messages: [{ role: "user", content: prompt }],
        });
        for await (const event of stream) {
            if (event.type === "content_block_delta" && (event.delta as any).type === "text_delta") {
                yield (event.delta as any).text as string;
            }
        }
    },
};
