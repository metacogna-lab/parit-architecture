import type { AgentResponse } from './index';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiStreamOptions {
  onChunk?: (chunk: string) => void;
  onStatus?: (status: string) => void;
  onComplete?: (response: AgentResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Call Google Gemini API with structured JSON output
 *
 * @param prompt - System prompt + user context
 * @param config - Gemini API configuration
 * @returns AgentResponse conforming to the contract
 */
export async function callGeminiAPI(
  prompt: string,
  config: GeminiConfig
): Promise<AgentResponse> {
  const model = config.model || 'gemini-2.0-flash-exp';
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required but not provided');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: config.temperature || 0.7,
      maxOutputTokens: config.maxTokens || 8192,
      responseMimeType: 'application/json'
    }
  };

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    // Extract the generated content
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const generatedText = candidate.content.parts[0].text;
    const latencyMs = Date.now() - startTime;

    // Parse as AgentResponse
    let agentResponse: AgentResponse;
    try {
      agentResponse = JSON.parse(generatedText);
    } catch (parseError) {
      // If Gemini didn't return valid JSON, wrap it
      console.error('Failed to parse Gemini response as JSON:', parseError);
      throw new Error(`Gemini returned invalid JSON: ${generatedText.substring(0, 200)}...`);
    }

    // Add latency to trace if not present
    if (agentResponse.trace) {
      agentResponse.trace.latency_ms = latencyMs;
      agentResponse.trace.model_used = model;
    }

    return agentResponse;
  } catch (error: any) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

/**
 * Call Gemini API with streaming support
 *
 * @param prompt - System prompt + user context
 * @param config - Gemini API configuration
 * @param options - Streaming callbacks
 */
export async function callGeminiStreamingAPI(
  prompt: string,
  config: GeminiConfig,
  options: GeminiStreamOptions = {}
): Promise<AgentResponse> {
  const model = config.model || 'gemini-2.0-flash-exp';
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required but not provided');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: config.temperature || 0.7,
      maxOutputTokens: config.maxTokens || 8192,
      responseMimeType: 'application/json'
    }
  };

  const startTime = Date.now();
  let accumulatedText = '';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini Streaming API error (${response.status}): ${errorBody}`);
    }

    if (!response.body) {
      throw new Error('No response body from Gemini streaming API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          try {
            const data = JSON.parse(jsonStr);
            const candidate = data.candidates?.[0];
            if (candidate?.content?.parts?.[0]?.text) {
              const partialText = candidate.content.parts[0].text;
              accumulatedText += partialText;

              // Call onChunk callback
              if (options.onChunk) {
                options.onChunk(partialText);
              }
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    // Parse accumulated text as AgentResponse
    let agentResponse: AgentResponse;
    try {
      agentResponse = JSON.parse(accumulatedText);
    } catch (parseError) {
      console.error('Failed to parse accumulated Gemini response as JSON:', parseError);
      throw new Error(`Gemini returned invalid JSON: ${accumulatedText.substring(0, 200)}...`);
    }

    // Add latency to trace
    if (agentResponse.trace) {
      agentResponse.trace.latency_ms = latencyMs;
      agentResponse.trace.model_used = model;
    }

    // Call onComplete callback
    if (options.onComplete) {
      options.onComplete(agentResponse);
    }

    return agentResponse;
  } catch (error: any) {
    if (options.onError) {
      options.onError(error);
    }
    console.error('Gemini Streaming API call failed:', error);
    throw error;
  }
}

/**
 * Build a complete prompt by combining system prompt and user context
 *
 * @param systemPrompt - Agent-specific system prompt
 * @param context - User context (product seed, upstream artifacts)
 * @returns Complete prompt string
 */
export function buildPrompt(systemPrompt: string, context: Record<string, any>): string {
  const contextStr = JSON.stringify(context, null, 2);

  return `${systemPrompt}

---

**User Context:**
\`\`\`json
${contextStr}
\`\`\`

Please analyze the above context and generate a response in the EXACT JSON format specified in the system prompt.
Ensure your response is VALID JSON with the following structure:

{
  "system_state": {
    "current_phase": "<phase>",
    "status": "complete" | "interrupted" | "failed",
    "interrupt_signal": true | false,
    "message": "..."
  },
  "artifact": {
    "type": "code" | "markdown" | "mermaid_erd" | "json",
    "content": "...",
    "logic_summary": "..."
  },
  "trace": {
    "agent": "<agent-name>",
    "reasoning": "...",
    "tokens_estimated": <number>
  }
}`;
}
