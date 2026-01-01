
import { ArchitectureState } from "@parti/shared";
import { Env } from "./index";

function createReq(agentName: string, state: any) {
    return new Request("http://internal/generate", {
        method: "POST",
        body: JSON.stringify({ context: state, prompt: `Execute task for ${agentName}` }),
        headers: { "Content-Type": "application/json", "X-Agent-Type": agentName }
    });
}

// Helper fetcher interface to match Env
interface Fetcher {
    fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

export async function executeParallelNodes(state: ArchitectureState, env: Env) {
  // 1. Define Parallel Tasks Mapping
  // We explicitly check availability of bindings to ensure we only execute what's configured
  const agentMap: Record<string, Fetcher> = {};
  
  if (env.PRD_AGENT) agentMap['prd'] = env.PRD_AGENT;
  if (env.DATA_AGENT) agentMap['data'] = env.DATA_AGENT;
  if (env.LOGIC_AGENT) agentMap['logic'] = env.LOGIC_AGENT;

  const agentKeys = Object.keys(agentMap);

  if (agentKeys.length === 0) return { ...state, status: 'complete' as const };

  // 2. Parallel Execution (Fan-Out) using Promise.all
  const promises = agentKeys.map(key => {
      const binding = agentMap[key];
      // Map simple keys to Agent Role Names for the prompt context
      const agentRoleName = key === 'prd' ? 'Requirements-Architect' : key === 'data' ? 'Data-Architect' : 'Logic-Architect';
      return binding.fetch(createReq(agentRoleName, state)).then(r => r.json());
  });

  const results = await Promise.all(promises);

  // 3. Reduction (Fan-In) & Merge
  // We map the results back to their corresponding agent keys
  const newArtifacts: Record<string, any> = {};
  results.forEach((res, i) => {
      const key = agentKeys[i];
      if (res) {
          newArtifacts[key] = (res as any).output || res;
      }
  });

  return {
    ...state,
    artifacts: { ...state.artifacts, ...newArtifacts },
    status: 'review_required' as const // Trigger HITL Interrupt after parallel burst
  };
}
