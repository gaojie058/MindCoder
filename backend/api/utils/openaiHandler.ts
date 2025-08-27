import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VITE_API_URL
    ? process.env.OPENAI_API_KEY
    : process.env.OPENAI_API_KEY;

const openai = new OpenAI({
    apiKey: apiKey
});

export const handleOpenAIRequest = async (prompt: string, fileContents?: string[], temperature: number = 0) => {
    try {
        let fullPrompt = prompt;

        if (fileContents && fileContents.length > 0) {
            fullPrompt += `\n\n### Uploaded Files Content:\n${fileContents.join('\n\n')}`;
        }

        const messages: { role: 'system' | 'user'; content: string }[] = [
            { role: 'user', content: fullPrompt }
        ];

        const stream = await openai.responses.create({
            model: "gpt-5",
            input: messages,
            reasoning: { effort: "minimal" },
            stream: true,
        });

      // 修改后的代码
        let outputText = "";
        for await (const chunk of stream) {
        // 使用类型断言(as any)来绕过可能不正确的SDK类型定义
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

// export const handleOpenAIRequestCompletion = async (prompt: string, fileContents?: string[]) => {
//     try {
//         let fullPrompt = prompt;

//         if (fileContents && fileContents.length > 0) {
//             fullPrompt += `\n\n### Uploaded Files Content:\n${fileContents.join('\n\n')}`;
//         }


//         console.log("Here is the final prompt sent to GPT-4.1:", fullPrompt)

//         const messages: { role: 'system' | 'user'; content: string }[] = [
//             { role: 'user', content: fullPrompt }
//         ];

//         const response = await openai.chat.completions.create({
//             model: 'gpt-4.1',
//             messages: messages,
//         });

//         console.log('OpenAI response:', response.output_text);
//         const outputText = response.output_text;

//         return outputText;
//     } catch (error) {
//         console.error('Error:', error);
//         throw new Error('Failed to process the prompt');
//     }
// };