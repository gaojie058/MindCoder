import { API_URL } from "@/api/api";
import axios from "axios";

export const SendJson = async (data: {
  prompt: string;
  files: File[];
}) => {
  try {
    const formData = new FormData();
    
    // Add FormData
    data.files.forEach(file => {
      formData.append('files', file);
    });

    formData.append('message', data.prompt);

    const response = await axios.post(API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error sending request to API:", error);
    throw error;
  }
};

export const promptTemplate = `You are a helpful assistant specializing in qualitative data analysis. Your task is to convert the uploaded documents into a structured format for easier analysis.

Uploaded Data: \${uploadedFiles}

Task Description:
1. Convert the contents of uploaded documents into a structured format.
2. Label each text chunk as Chunk1, Chunk2… DO NOT combine the files, label them seperately.
3. Generate a total of 10-50 chunks. Each chunk should not be split by lines but rather by similar topics. For example, if several lines or conversation turns fall within the same topic context, consider them as a single chunk.
4. For interview data, it makes sense to group multiple turns of conversation around a specific topic. For instance, concentrate on how the speakers explore a particular idea or challenge, like navigating the complexities of a tough lesson in class.
5. Maintain original data integrity from "Uploaded Data".
6. Keep each Interviewer question and corresponding Interviewee answer as a single chunk.
7. No need to keep file types like.txt, .docx, etc in the Filename.

Desired Format:
Generate the output strictly in JSON format with NO additional text or explanations.Maintain the original section indices(e.g., Section 1, Section 2) to organize the items within each section.Follow the structure below:

{
  "Filename1": {
    "Chunk1": "xxxxx",
      "Chunk2": "xxxxxx",
        "Chunk3": "xxxxxxx",
    ...
  },
  "Filename2": {
    "Chunk1": "xxxxx",
      "Chunk2": "xxxxxx",
        "Chunk3": "xxxxxxx",
          "..."
  }
}

Few - shot Example:
{
  "P1_johndoe": {
    "Chunk1": "Speaker1: Hey, did you understand what the teacher was talking about in class today? The new math topic seemed really complicated. Speaker2: Yeah, I know what you mean. The concept of derivatives can be tricky at first. But I think I got the hang of it after the examples she gave. What part confused you the most? Speaker1: Honestly, it's the notation and remembering all the rules. Like, when she started talking about the chain rule, I got completely lost. Do you have any tips on how to remember it? Speaker2: I totally get that. The chain rule is one of those things that just takes practice. I usually try to visualize the function as layers, like an onion. You take the derivative of the outer layer first and then work your way in. It helps me keep track of what I'm doing. Speaker1: That's a good way to think about it. I guess I need to practice more. Maybe we could study together this weekend? Go over some of the problems from the textbook? Speaker2: That sounds like a great idea! We can meet up at the library on Saturday. I think it’ll be helpful to work through the problems together and compare notes. Speaker1: Perfect! And if we have any questions, we can always ask the teacher after class next week. I think she’s open to giving extra help",
      "Chunk2": "Interviewer: What is Engagement? Interviewee: Engagement isn't just about keeping students busy; it's about fostering a love for learning. By incorporating interactive activities and real-world examples, you can capture their interest and make the material more relatable."
  },
  "P2_janedoe": {
    "Chunk1": "A well-structured lesson plan is the backbone of effective teaching. Start by outlining clear objectives and planning activities that align with these goals, ensuring that each part of the lesson builds towards a comprehensive understanding of the topic.",
      "Chunk2": "Curriculum development should focus on creating a balanced approach that integrates both foundational knowledge and critical thinking skills. Incorporating varied resources and assessment methods helps cater to different learning styles and keeps students motivated.",
        "Chunk3": "Regularly updating your curriculum to include current events, technology, and interdisciplinary connections can make learning more relevant and exciting for students. This approach also encourages them to make connections beyond the classroom."
  }
}
`