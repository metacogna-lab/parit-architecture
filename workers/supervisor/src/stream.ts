
import { Env } from './index';
import { assembleContext } from './context';
import { requiresInterrupt } from './utils';

export function createAgentStream() {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const streamUpdate = async (type: string, data: any) => {
    const msg = `data: ${JSON.stringify({ type, ...data })}\n\n`;
    await writer.write(encoder.encode(msg));
  };

  return {
    readable,
    streamUpdate,
    close: () => writer.close()
  };
}

export async function handleStreamRequest(request: Request, env: Env) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Extract Payload
  let body: any = {};
  try {
      body = await request.json();
  } catch (e) {
      console.warn("Failed to parse request body for stream context injection");
  }

  const projectId = request.headers.get('X-Project-ID') || body.projectId;
  
  // Context Assembly
  let injectedContext = "";
  if (projectId) {
      injectedContext = await assembleContext(env, projectId);
  }

  // 1. Kick off parallel execution
  const agentTasks = [];
  if (env.PRD_AGENT) agentTasks.push({ id: 'prd', binding: env.PRD_AGENT });
  if (env.DATA_AGENT) agentTasks.push({ id: 'data', binding: env.DATA_AGENT });
  if (env.LOGIC_AGENT) agentTasks.push({ id: 'logic', binding: env.LOGIC_AGENT });

  // 2. Stream Heartbeats & Partial Data
  const streamPromises = agentTasks.map(async (agent) => {
    try {
        // Construct new body with injected context
        const agentBody = {
            ...body,
            context: (body.context || "") + "\n\n" + injectedContext
        };

        const agentReq = new Request(request.url, {
            method: request.method,
            headers: new Headers(request.headers),
            body: JSON.stringify(agentBody)
        });
        
        agentReq.headers.set("X-Target-Agent", agent.id);
        agentReq.headers.set("Accept", "text/event-stream");
        agentReq.headers.set("Content-Type", "application/json");

        const response = await agent.binding.fetch(agentReq);
        const reader = response.body?.getReader();

        if (!reader) return;

        const decoder = new TextDecoder();
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    try {
                        const json = JSON.parse(line.substring(6));
                        
                        let status: 'thinking' | 'writing' | 'complete' = 'thinking';
                        let delta = '';

                        if (json.type === 'delta') {
                            status = 'writing';
                            delta = json.content || '';
                        } else if (json.type === 'status') {
                            status = 'thinking';
                            delta = json.message || '';
                        } else if (json.type === 'complete') {
                            status = 'complete';
                            delta = json.message || 'Done';

                            // ✅ HITL Interrupt Detection
                            // Check if this agent requires interrupt AND returned interrupt_signal
                            if (json.response && requiresInterrupt(agent.id)) {
                                const agentResponse = json.response;

                                if (agentResponse.system_state?.interrupt_signal === true) {
                                    // Send interrupt event to frontend
                                    const interruptPacket = {
                                        timestamp: Date.now(),
                                        agentId: agent.id,
                                        delta: '⚠️ Human review required',
                                        status: 'interrupted' as const,
                                        interrupt: {
                                            stage: agent.id,
                                            artifact: agentResponse.artifact,
                                            message: agentResponse.system_state.message,
                                            reasoning: agentResponse.trace?.reasoning || ''
                                        }
                                    };

                                    const interruptSSE = `data: ${JSON.stringify(interruptPacket)}\n\n`;
                                    await writer.write(encoder.encode(interruptSSE));

                                    // Log interrupt for observability
                                    console.log(`[SUPERVISOR] HITL interrupt triggered for ${agent.id}`);

                                    // Don't send normal complete packet if interrupted
                                    continue;
                                }
                            }
                        } else if (json.type === 'error') {
                            status = 'complete';
                            delta = `Error: ${json.chunk || json.message}`;
                        }

                        const packet = {
                            timestamp: Date.now(),
                            agentId: agent.id,
                            delta: delta,
                            status: status
                        };

                        const sse = `data: ${JSON.stringify(packet)}\n\n`;
                        await writer.write(encoder.encode(sse));
                    } catch (e) {
                         // ignore parse errors
                    }
                }
            }
        }
    } catch (e) {
        const errPacket = {
            timestamp: Date.now(),
            agentId: agent.id,
            delta: String(e),
            status: 'complete'
        };
        const err = `data: ${JSON.stringify(errPacket)}\n\n`;
        await writer.write(encoder.encode(err));
    }
  });

  // 3. Close stream when all agents finish
  Promise.allSettled(streamPromises).then(() => {
      writer.close();
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
