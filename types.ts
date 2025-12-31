
import React from 'react';
import { z } from 'zod';

// --- Domain Entities ---

export type StageType = 'prd' | 'design' | 'data' | 'logic' | 'api' | 'frontend' | 'deployment';
export type ProcessingStatus = 'locked' | 'idle' | 'processing' | 'awaiting_approval' | 'complete' | 'failed';
export type LLMProvider = 'openai' | 'anthropic' | 'google';
export type GraphStatus = 'idle' | 'running' | 'interrupted' | 'error';
export type CloudProvider = 'local' | 'cloudflare';

// --- User Identity ---
export interface UserProfile {
    name: string;
    role: string;
    email?: string;
    avatar?: string;
    clearance: string; // e.g. 'LEVEL 4'
    unit: string;      // e.g. 'R&D / CORE'
}

// --- Zod Schemas & Contracts ---

export const SchemaFieldZod = z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean().optional(),
    isKey: z.boolean().optional(),
    description: z.string().optional()
});

export const SchemaTableZod = z.object({
    name: z.string(),
    module: z.string().optional(),
    description: z.string().optional(),
    fields: z.array(SchemaFieldZod)
});

export const DataStructureZod = z.object({
    entities: z.array(z.object({
        name: z.string(),
        module: z.string().optional(),
        description: z.string().optional(),
        fields: z.array(z.string()) // Simple string list for initial generation
    })).optional(),
    relations: z.array(z.string()).optional(),
    zod_types: z.string().optional(),
    indexing_strategy: z.string().optional()
});

// --- D1 Database Schemas ---
export const CheckpointSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string(),
  phase: z.enum(['prd', 'design', 'data', 'logic', 'api', 'frontend', 'deployment']),
  state_snapshot: z.string(), // Stringified JSON of the Graph
  agent_id: z.string(),      // Originating agent
  created_at: z.number()
});

export type Checkpoint = z.infer<typeof CheckpointSchema>;
export type SchemaField = z.infer<typeof SchemaFieldZod>;
export type SchemaTable = z.infer<typeof SchemaTableZod>;
export type DataStructureSchema = z.infer<typeof DataStructureZod>;

// --- Application Interfaces ---

export interface AgentResponse {
  system_state: {
    current_phase: string; 
    status: string; 
    interrupt_signal: boolean;
    message: string;
  };
  artifact: {
    type: string; 
    content: string;
    logic_summary: string;
  };
  trace: {
    agent: string;
    reasoning: string;
    tokens_estimated: number;
  };
}

export interface RequirementSchema {
  user_stories: string[];
  functional_specs: string;
  priority_map: Record<string, 'high'|'medium'|'low'>;
}

export interface DesignTokenSchema {
  colors: Record<string, string>;
  spacing_scale: string[];
  typography_fluid: Record<string, string>;
  vibe_tokens: string[];
}

export interface StageNode {
  id: StageType;
  title: string;
  icon?: React.ReactNode; 
  x: number;
  y: number;
  status: ProcessingStatus;
  basePrompt: string;
  userPrompt?: string; 
  output: string | null;
  summary: string | null;
  reasoningSteps: string[];
  validationStatus?: 'pending' | 'valid' | 'invalid';
  validationErrors?: string[];
  schemaType?: 'Requirement' | 'DesignToken' | 'DataStructure' | 'Lifecycle';
  structuredOutput?: RequirementSchema | DesignTokenSchema | DataStructureSchema | any;
}

export interface ArtefactNode {
    id: string;
    sourceStageId: StageType;
    targetStageId: StageType;
    type: 'code' | 'doc' | 'schema' | 'config';
    label: string;
    content: string;
    promptContext: string;
}

export interface LogEntry {
    id: string;
    source: string;
    message: string;
    timestamp: string;
    type: 'info' | 'warning' | 'success' | 'error' | 'system' | 'agent';
}

export interface ActivityFeedItem {
    timestamp: number;
    agentId: string;
    delta: string;
    status: 'thinking' | 'writing' | 'complete';
}

export interface CommitEntry {
    id: string;
    hash: string;
    message: string;
    author: string;
    timestamp: string;
    tags?: string[];
}

export interface TraceSpan {
    id: string;
    name: string;
    type: 'chain' | 'llm' | 'tool';
    status: 'success' | 'error' | 'running';
    inputs: any;
    outputs: any;
    startTime: number;
    endTime?: number;
    tokens?: number;
    cost?: number;
    children?: TraceSpan[];
}

export interface Blueprint {
    id: string;
    name: string;
    description: string;
    stageCount: number;
    status: string;
    lastEdited: string;
    tags: string[];
}

export interface RecentProject {
    id: string;
    name: string;
    date: string;
}

// --- Intelligence & Configuration Types ---

export interface ModelSpec {
    id: string;
    name: string;
    provider: LLMProvider;
    contextWindow: string;
    costPer1k: string;
}

export interface AgentTierConfig {
    id: string; 
    name: string;
    description: string;
    agents: StageType[]; 
    model: string; // Model ID
    provider: LLMProvider;
}

export interface ProjectSettings {
    id: string; 
    name: string;
    environment: string;
    llmProvider: LLMProvider; // Default Provider
    llmModel: string;
    apiKey: string;
    googleApiKey?: string;
    openaiApiKey?: string;
    vectorDb: string;
    customInstructions: string;
    providerPreference?: CloudProvider; 
    agentTiers: AgentTierConfig[]; // Per-tier overrides
}

export interface ToastData {
    message: string;
    type: 'success' | 'error' | 'info' | 'guidance';
}

export interface GraphCheckpoint {
    id: string; 
    step: number;
    agent: string;
    timestamp: number;
    stateSnapshot: any;
}

export interface InterruptPayload {
    node: string;
    message: string;
    snapshot: any; 
}

// --- Persistence Models (Hydration) ---

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
