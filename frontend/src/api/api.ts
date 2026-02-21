const useLocalAPI = import.meta.env.VITE_USE_LOCAL_API === 'true';

export const API_URL = useLocalAPI
  ? import.meta.env.VITE_LOCAL_API_URL
  : import.meta.env.VITE_PROD_API_URL;

// Streaming endpoint — same base but /chat/stream instead of /chat
export const API_STREAM_URL = API_URL.replace(/\/chat$/, '/chat/stream');

/**
 * POST FormData to the streaming endpoint and collect the full response text.
 * Uses SSE (text/event-stream) to avoid Vercel's 10s function timeout.
 */
export async function fetchStream(formData: FormData): Promise<string> {
  const response = await fetch(API_STREAM_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // Parse SSE lines: "data: {...}\n\n"
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) fullText += parsed.text;
        } catch (e) {
          // Skip non-JSON lines
        }
      }
    }
  }

  return fullText;
}