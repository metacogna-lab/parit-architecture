import { FRONTEND_WORKER_PROMPT } from './systemPrompts';
import { callGeminiAPI, callGeminiStreamingAPI, buildPrompt, type AgentResponse } from '@parit/shared';

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

interface Env {
  GEMINI_API_KEY: string;
  GEMINI_MODEL?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const isStream = request.headers.get("Accept") === "text/event-stream";

    // Parse request body for context
    let context: Record<string, any> = {};
    try {
      const body = await request.json();
      context = body.context || {};
    } catch (e) {
      context = {};
    }

    // Build complete prompt
    const fullPrompt = buildPrompt(FRONTEND_WORKER_PROMPT, context);

    // Configuration
    const config = {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
      temperature: 0.7,
      maxTokens: 8192
    };

    if (isStream) {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      ctx.waitUntil((async () => {
        try {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Designing frontend architecture...' })}\n\n`));

          const agentResponse = await callGeminiStreamingAPI(fullPrompt, config, {
            onChunk: async (chunk: string) => {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`));
            },
            onStatus: async (status: string) => {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: status })}\n\n`));
            },
            onComplete: async (response: AgentResponse) => {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'complete', message: response.system_state.message, response })}\n\n`));
            },
            onError: async (error: Error) => {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`));
            }
          });

          await writer.close();
        } catch (error: any) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`));
          await writer.close();
        }
      })());

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });
    }

    // Non-streaming
    try {
      const agentResponse = await callGeminiAPI(fullPrompt, config);

      return new Response(JSON.stringify(agentResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        system_state: {
          current_phase: 'frontend',
          status: 'failed',
          interrupt_signal: false,
          message: `Failed to generate frontend architecture: ${error.message}`
        },
        artifact: {
          type: 'code',
          content: '',
          logic_summary: 'Error occurred during frontend architecture generation'
        },
        trace: {
          agent: 'frontend-agent',
          reasoning: 'Error in Gemini API call',
          tokens_estimated: 0
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
