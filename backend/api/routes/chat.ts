import express, { Request } from 'express';
import multer from 'multer';
import { handleOpenAIRequest, handleOpenAIRequestStream } from '../providers';

const upload = multer();
const chatRouter = express.Router();

const fixJsonString = (jsonString: string): string => {
    // This regex finds a closing brace `}`, followed by optional whitespace,
    // a literal closing bracket `]`, and then another closing brace `}`.
    // It replaces this pattern with just the two braces, effectively removing the bracket.
    const regex = /(}\s*)](\s*})/g;
    return jsonString.replace(regex, "$1$2");
};

chatRouter.post('/chat', upload.array('files'), async (req: Request, res) => {
    try {
        let prompt: string;

        // Parse the message from the request body
        if (typeof req.body.message === 'string') {
            try {
                const messageObj = JSON.parse(req.body.message);
                prompt = messageObj.content;
            } catch (error) {
                // If parsing fails, use the message as-is
                prompt = req.body.message;
            }
        } else {
            prompt = req.body.message;
        }

        console.log("Received prompt:", prompt);
        if (!prompt) {
            throw new Error("Prompt is empty or undefined");
        }

        let fileContents: string[] = [];

        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(file => {
                const fileContent = (file as Express.Multer.File).buffer.toString('utf-8');
                fileContents.push(fileContent);
                console.log("Received file:", file.originalname);
            });
        }
        // Parse model from request
        const model = req.body.model || 'deepseek-chat';
        console.log("Using model:", model);

        const result = await handleOpenAIRequest(prompt, fileContents, 1, model);

        // gpt4.1
        // const result = await handleOpenAIRequestCompletion(prompt, fileContents);
        console.log('Sending response:', result);

        // Check if this is a graph response (contains "digraph" or "graph")
        console.log('Checking if response contains digraph:', result && result.includes('digraph'));
        // console.log('Checking if response contains graph:', result && result.includes('graph'));

        //  if (result && (result.includes('digraph') || result.includes('graph'))) {
        // TODO: 检查是否包含graphviz语法而不是只通过关键词匹配 (有可能需要修改prompt 引导gpt按照指定格式输出)
        if (result && (result.includes('digraph'))) {
            // Wrap graph response in markdown code blocks
            const formattedResult = `\`\`\`dot\n${result}\n\`\`\``;
            console.log('Wrapping graph response in markdown blocks:', formattedResult);
            res.json({ message: formattedResult });
        }
        // Check if this is a report response (contains JSON structure)
        // TODO: 检查是否包含报告而不是只通过关键词匹配
        else if (result && (result.includes('"Report"') || result.includes('"Title"') || result.includes('"Sections"'))) {
            // If the response is already wrapped in JSON code blocks, send as is
            if (result.includes('```json')) {
                res.json({ message: result });
            } else {
                // Wrap report response in JSON code blocks
                const formattedResult = `\`\`\`json\n${result}\n\`\`\``;
                res.json({ message: formattedResult });
            }
        } else {
            // Try to validate and fix JSON response
            let fix_result = fixJsonString(result);

            // Validate if the result is valid JSON
            try {
                JSON.parse(fix_result);
                console.log('JSON validation passed, sending fixed response');
            } catch (jsonError) {
                console.warn('JSON validation failed, attempting additional fixes:', jsonError);

                // Try additional JSON fixes
                fix_result = fix_result
                    // Remove any non-JSON content before the first {
                    .replace(/^[^{]*/, '')
                    // Remove any non-JSON content after the last }
                    .replace(/}[^}]*$/, '}')
                    // Fix common array/object syntax issues
                    .replace(/,\s*([}\]])/g, '$1')
                    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

                try {
                    JSON.parse(fix_result);
                    console.log('Additional JSON fixes successful');
                } catch (finalError) {
                    console.error('All JSON fixes failed, sending original response');
                    fix_result = result; // Fall back to original response
                }
            }

            console.log('Sending response as-is (no special formatting)');
            res.json({ message: fix_result });
        }
    } catch (error: any) {
        console.error('Error in chat route:', error);
        res.status(500).json({ error: error.message });
    }
});

// ── Streaming endpoint ──────────────────────────────────────────
// POST /chat/stream — returns SSE text/event-stream
// This avoids Vercel's 10s function timeout by keeping the connection alive.
chatRouter.post('/chat/stream', upload.array('files'), async (req: Request, res) => {
    try {
        let prompt: string;

        if (typeof req.body.message === 'string') {
            try {
                const messageObj = JSON.parse(req.body.message);
                prompt = messageObj.content;
            } catch (error) {
                prompt = req.body.message;
            }
        } else {
            prompt = req.body.message;
        }

        if (!prompt) {
            throw new Error("Prompt is empty or undefined");
        }

        let fileContents: string[] = [];
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach(file => {
                const fileContent = (file as Express.Multer.File).buffer.toString('utf-8');
                fileContents.push(fileContent);
            });
        }

        const model = req.body.model || 'deepseek-chat';
        console.log("[stream] Using model:", model, "prompt length:", prompt.length);

        await handleOpenAIRequestStream(prompt, fileContents, 0, model, res);
    } catch (error: any) {
        console.error('Error in chat/stream route:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
});

export default chatRouter;
