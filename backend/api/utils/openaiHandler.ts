import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
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

export const handleOpenAIRequest = async (prompt: string, fileContents?: string[], temperature: number = 0, model: string = 'gpt-5-2025-08-07') => {
    try {
        let fullPrompt = prompt;

        if (fileContents && fileContents.length > 0) {
            fullPrompt += `\n\n### Uploaded Files Content:\n${fileContents.join('\n\n')}`;
        }

        // Route to Anthropic if model starts with "claude"
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
