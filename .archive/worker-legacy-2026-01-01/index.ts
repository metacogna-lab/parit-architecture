import { saveArtifactToR2, Env } from './storage';

// --- Provider Interfaces ---
interface StreamChunk {
  text: string;
  isFinal: boolean;
}

interface LLMProvider {
  generate(prompt: string, systemInstruction?: string): Promise<string>;
  generateStream(prompt: string, systemInstruction?: string): AsyncGenerator<StreamChunk>;
}

class GeminiProvider implements LLMProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }
  
  async generate(prompt: string, systemInstruction?: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data: any = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Error: No response";
  }

  async *generateStream(prompt: string, systemInstruction?: string): AsyncGenerator<StreamChunk> {
     // Simulating stream for Gemini REST (Real impl requires SSE from Google)
     const fullText = await this.generate(prompt, systemInstruction);
     const chunks = fullText.match(/.{1,20}/g) || [fullText];
     
     for (const chunk of chunks) {
         await new Promise(r => setTimeout(r, 50)); // Sim delay
         yield { text: chunk, isFinal: false };
     }
     yield { text: '', isFinal: true };
  }
}

class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }
  async generate(prompt: string, system: string): Promise<string> { return `[OpenAI] Processed: ${prompt.substring(0, 20)}...`; }
  async *generateStream(prompt: string): AsyncGenerator<StreamChunk> {
      yield { text: '[OpenAI Stream] ', isFinal: false };
      yield { text: prompt.substring(0, 10), isFinal: true };
  }
}

class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }
  async generate(prompt: string, system: string): Promise<string> { return `[Anthropic] Processed: ${prompt.substring(0, 20)}...`; }
  async *generateStream(prompt: string): AsyncGenerator<StreamChunk> {
      yield { text: '[Anthropic Stream] ', isFinal: false };
      yield { text: prompt.substring(0, 10), isFinal: true };
  }
}

// --- Main Worker Entry Point ---
export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Agent-Provider, X-Agent-Type, X-Cloud-Trace-Context, X-Project-Env, Accept",
        },
      });
    }

    if (request.url.endsWith("/generate") && request.method === "POST") {
      try {
        const body: any = await request.json();
        const { prompt, systemInstruction, projectId, stageId } = body;
        
        const providerHeader = request.headers.get('X-Agent-Provider') || env.DEFAULT_PROVIDER || 'google';
        const isStream = request.headers.get('Accept') === 'text/event-stream';

        let provider: LLMProvider;
        switch (providerHeader) {
          case 'openai': provider = new OpenAIProvider(env.OPENAI_API_KEY || ''); break;
          case 'anthropic': provider = new AnthropicProvider(env.ANTHROPIC_API_KEY || ''); break;
          case 'google': default: provider = new GeminiProvider(env.GEMINI_API_KEY || ''); break;
        }

        if (isStream) {
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();
            const encoder = new TextEncoder();

            ctx.waitUntil((async () => {
                try {
                    const generator = provider.generateStream(prompt, systemInstruction);
                    for await (const chunk of generator) {
                        const sse = `data: ${JSON.stringify({ type: 'chunk', content: chunk.text })}\n\n`;
                        await writer.write(encoder.encode(sse));
                    }
                } catch(e) {
                    const err = `data: ${JSON.stringify({ type: 'error', message: String(e) })}\n\n`;
                    await writer.write(encoder.encode(err));
                } finally {
                    await writer.close();
                }
            })());

            return new Response(readable, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        const result = await provider.generate(prompt, systemInstruction);

        if (projectId && stageId) {
          ctx.waitUntil(saveArtifactToR2(env, projectId, stageId, result));
        }

        return new Response(JSON.stringify({ content: result }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          }
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
}