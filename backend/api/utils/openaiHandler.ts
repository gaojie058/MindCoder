import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Response } from "express";
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VITE_API_URL
    ? process.env.OPENAI_API_KEY
    : process.env.OPENAI_API_KEY;

const openai = new OpenAI({
    apiKey: apiKey
});

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Build the full prompt from user prompt + file contents.
 */
function buildFullPrompt(prompt: string, fileContents?: string[]): string {
    let fullPrompt = prompt;
    if (fileContents && fileContents.length > 0) {
        fullPrompt += `\n\n### Uploaded Files Content:\n${fileContents.join('\n\n')}`;
    }
    return fullPrompt;
}

/**
 * Non-streaming handler (legacy, kept for backward compat).
 */
export const handleOpenAIRequest = async (prompt: string, fileContents?: string[], temperature: number = 0, model: string = 'gpt-5-2025-08-07') => {
    try {
        const fullPrompt = buildFullPrompt(prompt, fileContents);

        if (model.startsWith('claude')) {
            return await handleAnthropicRequest(fullPrompt, model, temperature);
        }

        const messages: { role: 'system' | 'user'; content: string }[] = [
            { role: 'user', content: fullPrompt }
        ];

        const stream = await openai.responses.create({
            model: model,
            input: messages,
            reasoning: { effort: "minimal" },
            stream: true,
        });

        let outputText = "";
        for await (const chunk of stream) {
            const anyChunk = chunk as any;
            if (anyChunk.type === 'response.output_text.delta' && anyChunk.delta) {
                outputText += anyChunk.delta;
            }
        }
        
        console.log('OpenAI response (from stream):', outputText);
        return outputText;
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to process the prompt');
    }
};

/**
 * Streaming handler — writes SSE events to the Express response.
 * Each event: data: <text chunk>\n\n
 * Final event: data: [DONE]\n\n
 */
export const handleOpenAIRequestStream = async (
    prompt: string,
    fileContents: string[] | undefined,
    temperature: number,
    model: string,
    res: Response
) => {
    const fullPrompt = buildFullPrompt(prompt, fileContents);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        if (model.startsWith('claude')) {
            // Anthropic streaming
            const modelMap: Record<string, string> = {
                'claude-sonnet': 'claude-sonnet-4-20250514',
            };
            const actualModel = modelMap[model] || model;

            const stream = anthropic.messages.stream({
                model: actualModel,
                max_tokens: 8192,
                temperature: temperature,
                messages: [{ role: 'user', content: fullPrompt }],
            });

            for await (const event of stream) {
                if (event.type === 'content_block_delta' && (event.delta as any).type === 'text_delta') {
                    res.write(`data: ${JSON.stringify({ text: (event.delta as any).text })}\n\n`);
                }
            }
        } else {
            // OpenAI streaming
            const messages: { role: 'system' | 'user'; content: string }[] = [
                { role: 'user', content: fullPrompt }
            ];

            const stream = await openai.responses.create({
                model: model,
                input: messages,
                reasoning: { effort: "minimal" },
                stream: true,
            });

            for await (const chunk of stream) {
                const anyChunk = chunk as any;
                if (anyChunk.type === 'response.output_text.delta' && anyChunk.delta) {
                    res.write(`data: ${JSON.stringify({ text: anyChunk.delta })}\n\n`);
                }
            }
        }

        res.write(`data: [DONE]\n\n`);
        res.end();
    } catch (error) {
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Failed to process the prompt' })}\n\n`);
        res.end();
    }
};

async function handleAnthropicRequest(prompt: string, model: string, temperature: number): Promise<string> {
    try {
        // Map friendly names to actual model IDs
        const modelMap: Record<string, string> = {
            'claude-sonnet': 'claude-sonnet-4-20250514',
        };
        const actualModel = modelMap[model] || model;

        const response = await anthropic.messages.create({
            model: actualModel,
            max_tokens: 8192,
            temperature: temperature,
            messages: [
                { role: 'user', content: prompt }
            ],
        });

        const outputText = response.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('');

        console.log('Anthropic response:', outputText);
        return outputText;
    } catch (error) {
        console.error('Anthropic Error:', error);
        throw new Error('Failed to process the prompt with Anthropic');
    }
}
