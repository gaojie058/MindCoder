import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey:''
});


export const handleOpenAIRequest = async (prompt: string, fileContents?: string[], temperature: number = 0) => {
    try {
        let fullPrompt = prompt;

        const response = await openai.responses.create({
            model: "gpt-5",
            input: fullPrompt,
            reasoning: { effort: "low" },
            text: { verbosity: "low" },
        });

        console.log('OpenAI response:', response);
        
        // 检测并转换output_text为JSON格式
        const outputText = response.output_text;
        
        // if (typeof outputText==='string') {
        //     const json = extractJsonFromString(outputText);
        //     if (json) {
        //         return json;
        //     }
        //     // If we couldn't extract JSON, maybe the whole thing is JSON
        //     try {
        //         return JSON.parse(outputText);
        //     } catch (e) {
        //         console.error("Failed to parse output as JSON and couldn't extract valid JSON.", e);
        //         throw new Error('Output is not valid JSON and a JSON object could not be extracted.');
        //     }
        // }
        return outputText;
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to process the prompt');
    }
};

// // 测试函数
// async function testOpenAI() {
//     try {
//         console.log('开始测试 OpenAI API...');
        
//         // 从文件读取测试提示词
//         const fs = require('fs');
//         const path = require('path');
        
//         const promptFilePath = path.join(__dirname, 'test_prompt_code.txt');
        
//         let testPrompt: string;
        
//         try {
//             testPrompt = fs.readFileSync(promptFilePath, 'utf8').trim();
//             console.log('从文件读取测试提示:', promptFilePath);
//         } catch (fileError) {
//             console.log('无法读取文件，使用默认提示词');
//             testPrompt = "请简单介绍一下人工智能的发展历史";
//         }
        
//         console.log('测试提示内容:', testPrompt);
        
//         const result = await handleOpenAIRequest(testPrompt);
        
//         // 将结果保存到文件
//         const resultFilePath = path.join(__dirname, 'result_gpt.json');
        
//         try {
//             fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2), 'utf8');
//             console.log('结果已保存到:', resultFilePath);
//         } catch (saveError) {
//             console.error('保存结果文件失败:', saveError);
//         }
        
//     } catch (error) {
//         console.error('测试失败:', error);
//     }
// }

// // 如果直接运行此文件，则执行测试
// if (require.main === module) {
//     testOpenAI();
// }
