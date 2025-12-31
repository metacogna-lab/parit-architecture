export * from './systemPrompts';
export * from './gemini';

// --- Core Agent Response Contract ---
// This is the REQUIRED structure that all agents must return
export interface AgentResponse {
  system_state: {
    current_phase: 'prd' | 'design' | 'data' | 'logic' | 'api' | 'frontend' | 'deployment';
    status: 'complete' | 'interrupted' | 'failed';
    interrupt_signal: boolean;
    message: string;
  };
  artifact: {
    type: 'code' | 'markdown' | 'mermaid_erd' | 'json';
    content: string;
    logic_summary: string;
  };
  trace: {
    agent: string;
    reasoning: string;
    tokens_estimated: number;
    model_used?: string;
    latency_ms?: number;
  };
}

export interface StreamChunk {
  type: 'chunk' | 'status' | 'artifact';
  agent: string;
  content?: string;
  message?: string;
  isFinal?: boolean;
}

export interface ArchitectureState {
  stage: string;
  artifacts: Record<string, any>;
  status: 'idle' | 'running' | 'review_required' | 'complete';
}

export interface StreamEvent {
  agent: string;
  chunk?: string;
  type?: 'status' | 'delta' | 'complete' | 'error';
  payload?: any;
}

// --- Persistence Models (D1) ---

export interface ProjectRow {
  id: string;
  name: string;
  product_seed: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface ArtifactRow {
  id: string;
  project_id: string;
  agent_id: string;
  artifact_type: string;
  content: string; // R2 Key or inline content
  metadata: string;
  created_at: string;
}

export interface TraceRow {
  trace_id: string;
  project_id: string;
  agent_id: string;
  status: string;
  latency_ms: number;
  langsmith_url: string;
  created_at: string;
}

export interface CheckpointRow {
  checkpoint_id: string;
  project_id: string;
  thread_id: string;
  phase: string;
  state_snapshot: string;
  is_interrupted: number;
  created_at: string;
}

export interface HydrationResponse {
  project: ProjectRow;
  history: {
    logs: TraceRow[];
    artifacts: ArtifactRow[];
    checkpoints: CheckpointRow[];
  };
}

export const API_VERSION = 'v1';