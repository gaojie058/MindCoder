/**
 * Common interface every LLM provider implements.
 *
 * - `matches` decides whether this provider handles a given model name.
 * - `complete` returns the full text (non-streaming).
 * - `streamChunks` yields text deltas; the dispatcher handles SSE framing.
 */
export interface LLMProvider {
    name: string;
    matches(model: string): boolean;
    complete(prompt: string, model: string, temperature: number): Promise<string>;
    streamChunks(prompt: string, model: string, temperature: number): AsyncIterable<string>;
}
