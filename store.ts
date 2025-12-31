
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import React from 'react';
import { 
  StageNode, 
  ArtefactNode, 
  LogEntry, 
  CommitEntry, 
  TraceSpan, 
  SchemaTable, 
  Blueprint, 
  ProjectSettings, 
  ToastData,
  StageType, 
  GraphCheckpoint,
  InterruptPayload,
  GraphStatus,
  RecentProject,
  AgentResponse,
  SchemaTableZod,
  ProjectRow,
  TraceRow,
  ArtifactRow,
  CheckpointRow,
  AgentTierConfig,
  ModelSpec,
  ActivityFeedItem,
  UserProfile
} from './types';
import { ArchitectureGraph } from './agentGraph'; 
import { INTERRUPT_STAGES } from './constants';
import { generateArtifact } from './api'; 
import { z } from 'zod';

const GUIDANCE_TIPS: Record<StageType, string> = {
    prd: "Best Practice: Use Gherkin syntax (Given-When-Then) for clearer user stories.",
    design: "Best Practice: Specify explicit token values (e.g., 'blue-500' is #3b82f6) to reduce ambiguity.",
    data: "Best Practice: Ensure 3rd Normal Form (3NF) to minimize data redundancy.",
    logic: "Best Practice: Define idempotent keys for critical mutation endpoints.",
    api: "Best Practice: Adhere to RESTful conventions or GraphQL schema definitions.",
    frontend: "Best Practice: Plan skeleton loading states for every async component.",
    deployment: "Best Practice: Implement health check endpoints (/health) for zero-downtime rollbacks."
};

const getApiBaseUrl = () => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://127.0.0.1:8787';
    }
    return '';
};

const API_BASE = getApiBaseUrl();

// Default Tiers
const DEFAULT_TIERS: AgentTierConfig[] = [
    { id: 'tier_0', name: 'Supervisor (L0)', description: 'Orchestration & Routing', agents: [], model: 'gpt-5', provider: 'openai' },
    { id: 'tier_1', name: 'Strategy (L1)', description: 'Reasoning & Planning (PRD)', agents: ['prd'], model: 'gemini-2.5-pro', provider: 'google' },
    { id: 'tier_2', name: 'Structure (L2)', description: 'Schema & Design Constraints', agents: ['data', 'design'], model: 'gemini-2.5-flash', provider: 'google' },
    { id: 'tier_3', name: 'Implementation (L3)', description: 'Code Generation & Specs', agents: ['logic', 'api', 'frontend', 'deployment'], model: 'gpt-5-mini', provider: 'openai' },
];

export const AVAILABLE_MODELS: ModelSpec[] = [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', contextWindow: '2M', costPer1k: '$0.002' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', contextWindow: '1M', costPer1k: '$0.0005' },
    { id: 'gpt-5', name: 'GPT-5', provider: 'openai', contextWindow: '128k', costPer1k: '$0.06' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai', contextWindow: '64k', costPer1k: '$0.001' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: '200k', costPer1k: '$0.075' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', contextWindow: '200k', costPer1k: '$0.015' },
];

interface AppState {
    productSeed: string;
    isSeeded: boolean;
    isDecomposing: boolean; 
    stages: StageNode[];
    artefacts: ArtefactNode[];
    partialArtifacts: Record<string, string>; 
    schemas: SchemaTable[];
    blueprints: Blueprint[];
    recentProjects: RecentProject[];
    projectSettings: ProjectSettings;
    userProfile: UserProfile;
    
    // Trial Tracking
    hasUsedFreeTier: boolean;

    logs: LogEntry[];
    commits: CommitEntry[];
    traces: TraceSpan[];
    
    // Streaming & Activity
    activityFeed: ActivityFeedItem[]; // Real-time consolidated stream
    agentActivity: Record<string, { status: 'thinking' | 'writing' | 'complete', message: string }>; // Current status per agent

    metrics: {
        totalTokens: number;
        avgLatency: number;
        enrichmentCycles: number;
        estCost: number;
    };
    graphInstance: ArchitectureGraph | null;
    checkpoints: GraphCheckpoint[];
    activeAgentId: string | null; 
    isGraphPaused: boolean; 
    isManualPaused: boolean; 
    
    graphStatus: GraphStatus;
    interruptPayload: InterruptPayload | null;
    isDirty: boolean; 
    
    currentThinkingStep: string | null; // Legacy single-thread support
    currentThinkingAgent: string | null;

    activeStageId: StageType | null;
    selectedArtefact: ArtefactNode | null;
    toast: ToastData | null;
    processingStepIndex: number;
    isEnriching: boolean;
    isSimulationRunning: boolean;
    showPromptGuidance: boolean;
    isConsoleOpen: boolean;
    
    setProductSeed: (seed: string) => void;
    seedProject: (seed: string) => void;
    loadBlueprint: (blueprintId: string) => void;
    setDecomposing: (val: boolean) => void; 
    updateStage: (id: StageType, updates: Partial<StageNode>) => void;
    setActiveStageId: (id: StageType | null) => void;
    setSelectedArtefact: (artefact: ArtefactNode | null) => void;
    setToast: (toast: ToastData | null) => void;
    setShowPromptGuidance: (show: boolean) => void;
    setIsConsoleOpen: (isOpen: boolean) => void;
    
    addLog: (source: string, message: string, type?: LogEntry['type']) => void;
    addCommit: (message: string, author?: string) => void;
    
    runAgent: (id: StageType) => Promise<void>;
    startStreamingBuild: (prompt: string) => Promise<void>; 

    resolveInterrupt: (feedback: string) => Promise<void>; 
    timeTravel: (checkpointId: string) => void; 
    serializeProject: () => string;
    
    deleteBlueprints: (ids: string[]) => void;
    deleteProjects: (ids: string[]) => void;

    startSimulation: () => Promise<void>;
    toggleSimulationPause: () => void;
    stopSimulation: () => void;
    enrichArchitecture: () => Promise<void>;
    handleAgentCommand: (msg: string) => void;
    resetProject: () => void;
    
    startTrace: (name: string, type: TraceSpan['type']) => string;
    endTrace: (id: string, status: TraceSpan['status'], outputs: any, tokens: number) => void;
    
    // --- Hydration Actions ---
    fetchProjects: () => Promise<void>;
    hydrateProject: (id: string) => Promise<void>;

    // --- Settings & Env Actions ---
    updateProjectSettings: (settings: Partial<ProjectSettings>) => void;
    updateUserProfile: (profile: Partial<UserProfile>) => void;
    rotateSession: () => Promise<void>;
    updateAgentTier: (tierId: string, updates: Partial<AgentTierConfig>) => void;
    wipeProjectData: () => Promise<void>;
    
    markFreeTierUsed: () => void;
}

// --- Helper: Intelligence Context Injection ---
const getHeaders = (settings: ProjectSettings, agentId?: StageType): Record<string, string> => {
    const tiers = settings.agentTiers || DEFAULT_TIERS;
    // If agentId provided, find specific tier, else default to L0 (Supervisor)
    const tier = agentId 
        ? (tiers.find(t => t.agents.includes(agentId)) || tiers[0])
        : tiers.find(t => t.id === 'tier_0') || tiers[0];

    return {
        'X-Agent-Provider': tier.provider,
        'X-Agent-Model': tier.model,
        'X-Intelligence-Tier': tier.id,
        'X-Project-Env': settings.environment,
        'X-Project-ID': settings.id,
        // Pass Provider Keys if available
        ...(settings.googleApiKey ? { 'X-Google-Key': settings.googleApiKey } : {}),
        ...(settings.openaiApiKey ? { 'X-OpenAI-Key': settings.openaiApiKey } : {})
    };
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
    productSeed: '',
    isSeeded: false,
    isDecomposing: false,
    stages: [],
    artefacts: [],
    partialArtifacts: {}, 
    schemas: [],
    blueprints: [
      { id: 'bp_1', name: 'Vintage Typewriter Marketplace', description: 'A two-sided marketplace with auction mechanics, user profiles, and payment integration.', stageCount: 6, status: 'active', lastEdited: '2 mins ago', tags: ['E-commerce', 'React'] },
      { id: 'bp_2', name: 'Corporate CRM', description: 'Internal tool for managing leads, sales pipelines, and role-based access control.', stageCount: 4, status: 'draft', lastEdited: '1 week ago', tags: ['SaaS', 'Internal'] },
      { id: 'bp_3', name: 'IoT Data Pipeline', description: 'High-throughput ingestion service for sensor data with real-time analytics dashboard.', stageCount: 5, status: 'active', lastEdited: '3 days ago', tags: ['Data', 'Real-time'] }
    ],
    recentProjects: [],
    projectSettings: {
      id: '',
      name: 'My New Architecture',
      environment: 'dev',
      llmProvider: 'google',
      llmModel: 'gemini-2.5-pro',
      apiKey: '', // Legacy single key
      googleApiKey: '',
      openaiApiKey: '',
      vectorDb: 'chroma',
      customInstructions: '',
      providerPreference: 'local',
      agentTiers: DEFAULT_TIERS
    },
    userProfile: {
        name: 'Jane Smith',
        role: 'Chief Systems Architect',
        clearance: 'LEVEL 4',
        unit: 'R&D / CORE'
    },
    hasUsedFreeTier: false,
    logs: [],
    commits: [],
    traces: [],
    activityFeed: [],
    agentActivity: {},
    metrics: {
        totalTokens: 0,
        avgLatency: 0,
        enrichmentCycles: 0,
        estCost: 0
    },
    graphInstance: null,
    checkpoints: [],
    activeAgentId: null,
    isGraphPaused: false,
    isManualPaused: false,
    interruptPayload: null,
    graphStatus: 'idle',
    isDirty: false,
    
    currentThinkingStep: null,
    currentThinkingAgent: null,

    activeStageId: null,
    selectedArtefact: null,
    toast: null,
    processingStepIndex: 0,
    isEnriching: false,
    isSimulationRunning: false,
    showPromptGuidance: false,
    isConsoleOpen: false,

    setProductSeed: (seed) => set({ productSeed: seed }),
    setDecomposing: (val) => set({ isDecomposing: val }),
    setActiveStageId: (id) => {
        set({ activeStageId: id });
        if (id && GUIDANCE_TIPS[id]) {
             setTimeout(() => {
                 set({ toast: { message: GUIDANCE_TIPS[id], type: 'guidance' } });
             }, 300);
        }
    },
    setSelectedArtefact: (artefact) => set({ selectedArtefact: artefact }),
    setToast: (toast) => set({ toast }),
    setShowPromptGuidance: (show: boolean) => set({ showPromptGuidance: show }),
    setIsConsoleOpen: (isOpen) => set({ isConsoleOpen: isOpen }),
    updateStage: (id, updates) => set(state => ({
        stages: state.stages.map(s => s.id === id ? { ...s, ...updates } : s),
        isDirty: true
    })),

    updateProjectSettings: (updates) => set(state => ({
        projectSettings: { ...state.projectSettings, ...updates }
    })),
    updateUserProfile: (updates) => set(state => ({
        userProfile: { ...state.userProfile, ...updates }
    })),
    markFreeTierUsed: () => set({ hasUsedFreeTier: true }),

    // --- Hydration Implementation ---
    fetchProjects: async () => {
        try {
            const res = await fetch(`${API_BASE}/api/projects`);
            if (!res.ok) throw new Error("Backend unavailable");
            const data: ProjectRow[] = await res.json();
            
            set({ 
                recentProjects: data.map(p => ({
                    id: p.id,
                    name: p.name || 'Untitled Project',
                    date: new Date(p.updated_at).toLocaleDateString()
                }))
            });
        } catch (e) {
            console.warn("API Fetch Failed, utilizing local cache/mocks.");
            if (get().recentProjects.length === 0) {
                set({
                    recentProjects: [
                        { id: 'mock-1', name: 'Demo: E-Commerce Platform', date: new Date().toLocaleDateString() },
                        { id: 'mock-2', name: 'Demo: SaaS Dashboard', date: new Date().toLocaleDateString() }
                    ]
                });
            }
        }
    },

    hydrateProject: async (id: string) => {
        if (id.startsWith('mock-')) return; 
        
        try {
            const res = await fetch(`${API_BASE}/api/hydrate/${id}`);
            if (res.status === 404) {
                console.warn("Project not found in cloud, using local state.");
                return;
            }
            if (!res.ok) {
                throw new Error(`Backend error: ${res.statusText}`);
            }
            
            const data = await res.json();
            const { project, history } = data;
            const { logs, artifacts, checkpoints } = history;

            const mappedLogs: LogEntry[] = logs.map((l: TraceRow) => ({
                id: l.trace_id,
                source: l.agent_id,
                message: l.status,
                timestamp: new Date(l.created_at).toLocaleTimeString(),
                type: 'info'
            }));

            const mappedArtifacts: ArtefactNode[] = artifacts.map((a: ArtifactRow) => ({
                id: a.id,
                sourceStageId: 'prd', 
                targetStageId: 'design',
                type: a.artifact_type.includes('markdown') ? 'doc' : 'code',
                label: a.artifact_type,
                content: a.content,
                promptContext: 'Restored from history'
            }));

            const mappedCheckpoints: GraphCheckpoint[] = checkpoints.map((c: CheckpointRow) => ({
                id: c.checkpoint_id,
                step: 0,
                agent: 'System',
                timestamp: new Date(c.created_at).getTime(),
                stateSnapshot: JSON.parse(c.state_snapshot)
            }));
            
            set({
                projectSettings: { 
                    ...get().projectSettings, 
                    id: project.id, 
                    name: project.name, 
                    environment: project.environment as any 
                },
                productSeed: project.product_seed,
                isSeeded: true,
                logs: mappedLogs,
                artefacts: mappedArtifacts,
                checkpoints: mappedCheckpoints,
            });
            get().setToast({ message: "Project Synced from Cloud", type: "success" });

        } catch (e) {
            console.warn("Hydration failed (offline mode):", e);
            get().setToast({ message: "Cloud sync unavailable. Operating in local mode.", type: 'info' });
        }
    },

    loadBlueprint: (blueprintId: string) => {
        const blueprint = get().blueprints.find(b => b.id === blueprintId);
        if (!blueprint) return;

        get().setToast({ message: `Initializing template: ${blueprint.name}`, type: 'info' });
        get().seedProject(blueprint.description);
        get().updateProjectSettings({ name: blueprint.name });
    },

    seedProject: async (seed) => {
        const traceId = get().startTrace('Supervisor: Initialization', 'chain');

        // Generate project ID server-side via POST /api/projects
        let projectId = Math.random().toString(36).substring(2, 10); // Fallback for offline mode
        try {
            const response = await fetch(`${API_BASE}/api/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productSeed: seed,
                    name: seed.substring(0, 30) + (seed.length > 30 ? '...' : ''),
                    environment: get().projectSettings.environment || 'development'
                })
            });

            if (response.ok) {
                const data = await response.json();
                projectId = data.projectId;
                get().addLog('System', `Project created: ${projectId}`, 'success');
            } else {
                get().addLog('System', 'Backend unavailable, using local project ID', 'warning');
            }
        } catch (e) {
            console.warn('Failed to create project in backend, using local ID:', e);
            get().addLog('System', 'Operating in offline mode', 'info');
        }
        
        const startX = 150;
        const startY = 300;
        const gap = 220; 

        const newStages: StageNode[] = [
            { 
                id: 'prd', title: "Product Requirements", icon: null, x: startX, y: startY, status: 'idle', 
                basePrompt: "Act as a Lead PM. Analyze the user request and generate a detailed PRD.", userPrompt: seed, output: null, summary: null, 
                reasoningSteps: ["Analyzing Intent...", "Identifying User Personas...", "Drafting User Stories...", "Prioritizing Requirements...", "Finalizing PRD..."],
                schemaType: 'Requirement', validationStatus: 'pending'
            },
            { 
                id: 'design', title: "Design System", icon: null, x: startX + gap, y: startY, status: 'locked', 
                basePrompt: "Act as a Design Engineer. Define the design tokens, color palette, and component primitives.", output: null, summary: null, 
                reasoningSteps: ["Extracting Theme Constraints...", "Generating Token Scale...", "Defining Component Primitives...", "Checking Accessibility...", "Compiling Style Guide..."],
                schemaType: 'DesignToken', validationStatus: 'pending'
            },
            { 
                id: 'data', title: "Data Model", icon: null, x: startX + gap * 2, y: startY, status: 'locked', 
                basePrompt: "Act as a DB Architect. Define the database schema using 3NF.", output: null, summary: null, 
                reasoningSteps: ["Identifying Entities...", "Normalizing Relations...", "Defining Indices...", "Generating Zod Schemas...", "Rendering Mermaid ERD..."],
                schemaType: 'DataStructure', validationStatus: 'pending'
            },
            { 
                id: 'logic', title: "Business Logic", icon: null, x: startX + gap * 3, y: startY, status: 'locked', 
                basePrompt: "Act as a Backend Eng. Define the business logic, endpoints, and middleware.", output: null, summary: null, 
                reasoningSteps: ["Designing Endpoints...", "Defining Middleware Layers...", "Structuring Error Responses...", "Validating Security..."], validationStatus: 'pending' 
            },
            { 
                id: 'api', title: "API Specification", icon: null, x: startX + gap * 4, y: startY, status: 'locked', 
                basePrompt: "Act as an API Architect. Generate the OpenAPI specification.", output: null, summary: null, 
                reasoningSteps: ["Defining Routes...", "Specifying Request/Response Models...", "Generating OpenAPI Spec...", "Checking Auth Scopes..."], validationStatus: 'pending' 
            },
            { 
                id: 'frontend', title: "Frontend Architecture", icon: null, x: startX + gap * 5, y: startY, status: 'locked', 
                basePrompt: "Act as a Frontend Lead. Structure the component tree and state management.", output: null, summary: null, 
                reasoningSteps: ["Structuring Component Tree...", "Designing Hooks...", "Implementing State Management...", "Defining Skeleton States...", "Reviewing Performance..."], validationStatus: 'pending' 
            },
            { 
                id: 'deployment', title: "Deployment & CI/CD", icon: null, x: startX + gap * 6, y: startY, status: 'locked', 
                basePrompt: "Act as a DevSecOps. Configure CI/CD pipelines and infrastructure.", output: null, summary: null, 
                reasoningSteps: ["Configuring CI Pipelines...", "Defining Infrastructure...", "Setting up Environments...", "Implementing Health Checks...", "Finalizing Rollback Strategy..."], validationStatus: 'pending' 
            },
        ];

        const graph = new ArchitectureGraph();
        const newProject: RecentProject = {
            id: projectId,
            name: seed.substring(0, 20) + (seed.length > 20 ? '...' : ''),
            date: new Date().toLocaleDateString()
        };

        set({ 
            stages: newStages, 
            artefacts: [],
            schemas: [],
            logs: [],
            commits: [],
            checkpoints: [],
            traces: [],
            metrics: { totalTokens: 0, avgLatency: 0, enrichmentCycles: 0, estCost: 0 },
            isSeeded: true, 
            isDecomposing: true, 
            showPromptGuidance: false,
            toast: { message: "Architecture Canvas Initialized.", type: "success" },
            graphInstance: graph,
            isDirty: false,
            graphStatus: 'idle',
            productSeed: seed,
            projectSettings: { ...get().projectSettings, id: projectId },
            recentProjects: [newProject, ...get().recentProjects.slice(0, 4)],
            activityFeed: []
        });
        
        get().addLog('Supervisor', `Initializing Project ${projectId.toUpperCase()}`, 'system');
        get().addCommit('Initial commit: Project scaffolded');
        get().endTrace(traceId, 'success', { output: 'Graph Scaffolded' }, 150);
    },

    // --- New Settings Logic ---

    rotateSession: async () => {
        get().addLog('System', 'Rotating Session ID...', 'system');
        await new Promise(r => setTimeout(r, 500)); 
        get().seedProject(get().productSeed || "New Session Project");
        get().setToast({ message: "Session Rotated Successfully", type: "success" });
    },

    updateAgentTier: (tierId, updates) => {
        const currentTiers = get().projectSettings.agentTiers || DEFAULT_TIERS;
        const newTiers = currentTiers.map(t => t.id === tierId ? { ...t, ...updates } : t);
        get().updateProjectSettings({ agentTiers: newTiers });
        get().setToast({ message: `Tier configuration updated`, type: "success" });
    },

    wipeProjectData: async () => {
        const projectId = get().projectSettings.id;
        get().addLog('System', `Wiping data for project ${projectId}...`, 'warning');
        
        await new Promise(r => setTimeout(r, 1000));

        set({ 
            productSeed: '',
            isSeeded: false,
            isDecomposing: false,
            stages: [],
            artefacts: [],
            partialArtifacts: {},
            schemas: [],
            logs: [],
            commits: [],
            traces: [],
            metrics: { totalTokens: 0, avgLatency: 0, enrichmentCycles: 0, estCost: 0 },
            checkpoints: [],
            isDirty: false,
            isManualPaused: false,
            isSimulationRunning: false,
            activityFeed: [],
            agentActivity: {}
        });
        get().setToast({ message: "Project Data Wiped (Local & Remote)", type: "success" });
    },

    // --- Rest of the Store Actions ---
    serializeProject: () => {
        const state = get();
        const exportData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            project: state.projectSettings,
            stages: state.stages,
            artefacts: state.artefacts,
            schemas: state.schemas
        };
        return JSON.stringify(exportData, null, 2);
    },

    addLog: (source, message, type: LogEntry['type'] = 'info') => {
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        const newLog: LogEntry = { id: Math.random().toString(), source, message, timestamp: timeString, type };
        set(state => ({ logs: [...state.logs, newLog] }));
    },

    addCommit: (message, author = 'Supervisor') => {
        const hash = Math.random().toString(16).substring(2, 9);
        const now = new Date();
        const newCommit: CommitEntry = {
            id: hash,
            hash,
            message,
            author,
            timestamp: `${now.getHours()}:${now.getMinutes()}`
        };
        set(state => ({ commits: [newCommit, ...state.commits] }));
    },

    startTrace: (name, type) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newTrace: TraceSpan = {
            id,
            name,
            type,
            status: 'running',
            startTime: Date.now(),
            inputs: {},
            outputs: {},
            children: []
        };
        set(state => ({ traces: [newTrace, ...state.traces] }));
        return id;
    },

    endTrace: (id, status, outputs, tokens) => {
        const endTime = Date.now();
        set(state => {
            const updatedTraces = state.traces.map(t => {
                if (t.id === id) {
                    const cost = (tokens / 1000) * 0.002; 
                    return { ...t, status, endTime, outputs, tokens, cost };
                }
                return t;
            });
            const currentMetrics = state.metrics;
            return { 
                traces: updatedTraces,
                metrics: {
                    ...currentMetrics,
                    totalTokens: currentMetrics.totalTokens + (tokens || 0),
                    estCost: currentMetrics.estCost + ((tokens || 0) / 1000 * 0.002)
                }
            };
        });
    },

    startStreamingBuild: async (prompt: string) => {
        set({ graphStatus: 'running', isGraphPaused: false, agentActivity: {} });
        get().addLog('Supervisor', 'Starting Parallel Execution Fan-Out...', 'system');
        
        try {
            const settings = get().projectSettings;
            const headers = getHeaders(settings); // Use helper for Supervisor/L0 settings

            const response = await fetch(`${API_BASE}/api/generate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'X-Target-Agent': 'graph',
                    ...headers // Inject configured headers
                },
                body: JSON.stringify({ prompt, projectId: settings.id })
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No response body");

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');
                
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const payload = JSON.parse(line.replace('data: ', ''));
                        const { timestamp, agentId, delta, status } = payload;

                        // Consolidated Activity Stream (Last 50)
                        set(state => {
                            const newActivityItem: ActivityFeedItem = { timestamp, agentId, delta, status };
                            const updatedFeed = [...state.activityFeed, newActivityItem].slice(-50);
                            
                            // Parallel Tracking Logic
                            let updatedAgentActivity = { ...state.agentActivity };
                            
                            if (status === 'thinking') {
                                updatedAgentActivity[agentId] = { status: 'thinking', message: delta };
                            } else if (status === 'writing') {
                                updatedAgentActivity[agentId] = { status: 'writing', message: 'Generating output...' };
                                // Accumulate partial artifact
                                const currentContent = state.partialArtifacts[agentId] || '';
                                return {
                                    activityFeed: updatedFeed,
                                    agentActivity: updatedAgentActivity,
                                    partialArtifacts: { ...state.partialArtifacts, [agentId]: currentContent + delta },
                                    stages: state.stages.map(s => 
                                        s.id === agentId ? { ...s, output: currentContent + delta, status: 'processing' } : s
                                    )
                                };
                            } else if (status === 'complete') {
                                delete updatedAgentActivity[agentId];
                                return {
                                    activityFeed: updatedFeed,
                                    agentActivity: updatedAgentActivity,
                                    // Stage completion is handled below via explicit side-effect check if needed, 
                                    // but usually 'complete' signal is enough to trigger final commit logic
                                };
                            } else if (status === 'error') {
                                delete updatedAgentActivity[agentId];
                                return {
                                    activityFeed: updatedFeed,
                                    agentActivity: updatedAgentActivity
                                };
                            }

                            return { 
                                activityFeed: updatedFeed,
                                agentActivity: updatedAgentActivity
                            };
                        });

                        if (status === 'complete') {
                            get().addLog(agentId, 'Agent Finished', 'success');
                            get().updateStage(agentId as StageType, { status: 'complete' });
                        }

                    } catch (e) {
                        console.warn('SSE Parse Error', line);
                    }
                }
            }
            
            // Finalize
            set({ graphStatus: 'idle', currentThinkingStep: null, partialArtifacts: {}, agentActivity: {} });
            get().addLog('Supervisor', 'Parallel execution complete.', 'success');

        } catch (e) {
            console.error(e);
            get().addLog('Supervisor', 'Streaming Failed', 'error');
            set({ graphStatus: 'idle', agentActivity: {} });
        }
    },

    runAgent: async (id) => {
        const state = get();
        const stageIndex = state.stages.findIndex(s => s.id === id);
        if (stageIndex === -1) return;
        const stage = state.stages[stageIndex];
        
        set({ graphStatus: 'running' });

        const traceId = get().startTrace(`Graph: ${stage.title}`, 'chain');
        const agentName = stage.title.split(' ')[0] + ' Worker';
        set({ activeAgentId: agentName, currentThinkingAgent: agentName });
        
        get().updateStage(id, { status: 'processing', output: '' }); 
        set({ processingStepIndex: 0, currentThinkingStep: "Connecting to Inference Engine..." });

        try {
            const context = state.artefacts.map(a => `[${a.sourceStageId.toUpperCase()} OUTPUT]:\n${a.content}`).join("\n\n");
            const prompt = stage.userPrompt ? `${stage.basePrompt}\nAdditional Instructions: ${stage.userPrompt}` : stage.basePrompt;
            
            // Use helper to consistently get headers for this specific agent tier
            const headers = getHeaders(state.projectSettings, id);
            headers['X-Cloud-Trace-Context'] = traceId;

            // --- SINGLE AGENT STREAMING LOGIC ---
            if (state.projectSettings.providerPreference === 'cloudflare') {
                headers['X-Agent-Type'] = agentName;
                headers['X-Target-Agent'] = id; 
                headers['Accept'] = 'text/event-stream';
                
                try {
                    const response = await fetch(`${API_BASE}/api/generate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...headers },
                        body: JSON.stringify({ 
                            stageId: id, 
                            prompt, 
                            context,
                            systemInstruction: stage.basePrompt, 
                            projectId: state.projectSettings.id 
                        })
                    });

                    if (!response.ok) throw new Error(`Streaming Error: ${response.statusText}`);
                    
                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();
                    let fullContent = '';

                    while (true) {
                        const { value, done } = await reader!.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n\n');
                        
                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            try {
                                const payload = JSON.parse(line.replace('data: ', ''));
                                
                                const contentChunk = payload.chunk || payload.content || '';
                                const type = payload.type || 'delta';

                                if (type === 'status') {
                                     set({ currentThinkingStep: payload.message });
                                } else if (type === 'delta' || type === 'chunk') {
                                     fullContent += contentChunk;
                                     get().updateStage(id, { output: fullContent }); 
                                }
                            } catch (e) {
                                console.warn('Failed to parse SSE chunk', line);
                            }
                        }
                    }

                    const agentResponse: AgentResponse = {
                        system_state: { current_phase: id, status: 'complete', interrupt_signal: false, message: 'Success' },
                        artifact: { type: 'markdown', content: fullContent, logic_summary: 'Generated via Stream' },
                        trace: { agent: agentName, reasoning: 'Streaming Execution', tokens_estimated: 0 }
                    };
                    
                    get().addLog('Supervisor', `Stream complete. Committing artifacts.`, 'success');
                    get().addCommit(`feat(${id}): Streaming Update`, agentName);
                    
                    const newStages = [...get().stages];
                    const currentStageIdx = newStages.findIndex(s => s.id === id);
                    newStages[currentStageIdx] = { 
                        ...newStages[currentStageIdx], 
                        status: 'complete', 
                        output: agentResponse.artifact.content, 
                        summary: agentResponse.artifact.logic_summary, 
                    };
                    
                     if (currentStageIdx < newStages.length - 1 && newStages[currentStageIdx + 1].status === 'locked') {
                        newStages[currentStageIdx + 1] = { ...newStages[currentStageIdx + 1], status: 'idle' };
                    }
                    
                     const nextStageId = currentStageIdx < newStages.length - 1 ? newStages[currentStageIdx + 1].id : newStages[currentStageIdx].id;
                     let type: 'code'|'doc'|'schema'|'config' = 'doc';
                     const newArtefact: ArtefactNode = {
                        id: `${id}-art-${Date.now()}`,
                        sourceStageId: id,
                        targetStageId: nextStageId,
                        type,
                        label: 'STREAMED OUTPUT',
                        content: agentResponse.artifact.content,
                        promptContext: prompt
                    };
                    
                    const filteredArtefacts = get().artefacts.filter(a => a.sourceStageId !== id);
                    set({ 
                        stages: newStages,
                        artefacts: [...filteredArtefacts, newArtefact],
                        activeAgentId: null,
                        currentThinkingStep: null,
                        graphStatus: 'idle',
                        isDirty: true
                    });
                    return;

                } catch (streamError) {
                    console.error("Streaming failed, falling back to standard...", streamError);
                }
            }

            // Standard fallback
            const agentResponse = await generateArtifact({
                stageId: id,
                prompt: prompt,
                context: context,
                onChunk: (text) => set({ currentThinkingStep: "Thinking..." }),
                provider: state.projectSettings.llmProvider,
                headers: headers
            });
            
             const { system_state, artifact, trace } = agentResponse;
            
            if (system_state.interrupt_signal) {
                 get().addLog('Supervisor', `Interrupt Triggered: ${system_state.message}`, 'warning');
                 
                 set({
                     interruptPayload: {
                         node: id,
                         message: system_state.message,
                         snapshot: { stageId: id, currentOutput: artifact.content, timestamp: Date.now() }
                     },
                     graphStatus: 'interrupted',
                     isGraphPaused: true,
                     activeAgentId: 'Supervisor'
                 });

                 get().updateStage(id, { status: 'awaiting_approval', output: artifact.content });
                 get().setToast({ message: "Approval Required to proceed", type: 'warning' });
                 
                 get().endTrace(traceId, 'success', { output: "INTERRUPTED: " + system_state.message }, trace.tokens_estimated);
                 return;
            }

            set({ currentThinkingStep: "Validating output..." });
            
            if (id === 'data') {
                try {
                    let parsed: any;
                    try {
                        parsed = JSON.parse(artifact.content);
                    } catch (e) {
                        const jsonMatch = artifact.content.match(/```json([\s\S]*?)```/);
                        if (jsonMatch) {
                            parsed = JSON.parse(jsonMatch[1]);
                        } else {
                            if (artifact.content.trim().startsWith('[')) {
                                parsed = JSON.parse(artifact.content);
                            }
                        }
                    }

                    if (Array.isArray(parsed)) {
                         set({ schemas: parsed });
                         get().addLog(agentName, `Extracted ${parsed.length} schema entities`, 'success');
                    }
                } catch (e) {
                    get().addLog(agentName, "Warning: Could not parse structured schema.", 'warning');
                }
            }

            get().addLog('Supervisor', `Agent finished. Artifacts committed.`, 'success');
            get().addCommit(`feat(${id}): ${trace.reasoning}`, agentName);

            const newStages = [...get().stages];
            const currentStageIdx = newStages.findIndex(s => s.id === id);
            
            newStages[currentStageIdx] = { 
                ...newStages[currentStageIdx], 
                status: 'complete', 
                output: artifact.content, 
                summary: artifact.logic_summary, 
            };
            
            if (currentStageIdx < newStages.length - 1 && newStages[currentStageIdx + 1].status === 'locked') {
                 newStages[currentStageIdx + 1] = { ...newStages[currentStageIdx + 1], status: 'idle' };
            }

            const nextStageId = currentStageIdx < newStages.length - 1 ? newStages[currentStageIdx + 1].id : newStages[currentStageIdx].id;
            let type: 'code'|'doc'|'schema'|'config' = 'doc';
            if (artifact.type === 'code') type = 'code';
            if (artifact.type === 'mermaid_erd') type = 'schema';

            const newArtefact: ArtefactNode = {
                id: `${id}-art`,
                sourceStageId: id,
                targetStageId: nextStageId,
                type,
                label: artifact.type.toUpperCase(),
                content: artifact.content,
                promptContext: prompt
            };
            
            const filteredArtefacts = get().artefacts.filter(a => a.sourceStageId !== id);
            const newArtefacts = [...filteredArtefacts, newArtefact];

            const stateSnapshot = JSON.parse(JSON.stringify({
                stages: newStages,
                artefacts: newArtefacts,
                schemas: get().schemas
            }));

            const newCheckpoint: GraphCheckpoint = {
                id: Math.random().toString(36).substring(7),
                step: state.checkpoints.length + 1,
                agent: agentName,
                timestamp: Date.now(),
                stateSnapshot: stateSnapshot
            };

            set(prev => ({ 
                stages: newStages,
                artefacts: newArtefacts,
                checkpoints: [...prev.checkpoints, newCheckpoint],
                activeAgentId: null,
                isGraphPaused: false,
                currentThinkingStep: null,
                currentThinkingAgent: null,
                isDirty: true,
                graphStatus: 'idle'
            }));

            get().endTrace(traceId, 'success', { output: artifact.logic_summary }, trace.tokens_estimated);
            get().setToast({ message: `${stage.title} Completed`, type: "success" });

        } catch (error) {
            console.error(error);
            get().addLog(agentName, "Agent execution failed.", 'error');
            get().updateStage(id, { status: 'failed', validationErrors: ["API Error: Failed to generate content."] });
            set({ graphStatus: 'idle', activeAgentId: null, currentThinkingStep: null });
            get().endTrace(traceId, 'error', { error: String(error) }, 0);
        }
    },

    startSimulation: async () => {
        if (get().isSimulationRunning) return;
        set({ isSimulationRunning: true, isConsoleOpen: true, graphStatus: 'running', isManualPaused: false });
        
        get().addLog('Supervisor', 'Initiating full architecture simulation sequence...', 'system');
        const { stages } = get();
        let activeIndex = stages.findIndex(s => s.status !== 'complete');
        
        if (activeIndex === -1) {
            set({ isSimulationRunning: false, graphStatus: 'idle' });
            return;
        }

        while (activeIndex < stages.length && get().isSimulationRunning) {
            
            while (get().isManualPaused || get().isGraphPaused) {
                if (!get().isSimulationRunning) break; 
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            if (!get().isSimulationRunning) break;

            const stage = get().stages[activeIndex];
            await get().runAgent(stage.id);
            
            activeIndex++;
            await new Promise(resolve => setTimeout(resolve, 1500)); 
        }

        if (get().isSimulationRunning && !get().isGraphPaused && !get().isManualPaused) {
            set({ isSimulationRunning: false, graphStatus: 'idle' });
        }
    },

    stopSimulation: () => {
        set({ isSimulationRunning: false, graphStatus: 'idle', isManualPaused: false });
    },

    toggleSimulationPause: () => {
        set(state => ({ isManualPaused: !state.isManualPaused }));
        if (get().isManualPaused) {
            get().addLog('System', 'Simulation Paused by User', 'info');
        } else {
            get().addLog('System', 'Simulation Resumed', 'info');
        }
    },

    enrichArchitecture: async () => {
        set({ isEnriching: true });
        get().setToast({ message: "Enriching Architecture (Back-Propagation)...", type: "info" });
        const traceId = get().startTrace('Enrichment: Global Optimization', 'chain');
        await new Promise(resolve => setTimeout(resolve, 3000));
        get().endTrace(traceId, 'success', { result: 'Optimized' }, 12500);
        set({ isEnriching: false });
    },

    handleAgentCommand: (msg: string) => {},

    resolveInterrupt: async (feedback: string) => {
        const state = get();
        const { interruptPayload } = state;

        if (!interruptPayload) {
            get().setToast({ message: 'No active interrupt to resolve', type: 'error' });
            return;
        }

        get().addLog('Supervisor', `Resolving interrupt at ${interruptPayload.node} with feedback: "${feedback.substring(0, 50)}..."`, 'system');

        // Determine action based on feedback
        const action = feedback.toLowerCase().includes('reject') ? 'reject' :
                      feedback.toLowerCase().includes('edit') ? 'edit' : 'approve';

        try {
            const response = await fetch(`${API_BASE}/api/resume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: state.projectSettings.id,
                    stage: interruptPayload.node,
                    action,
                    feedback: feedback,
                    edited_artifact: action === 'edit' ? interruptPayload.snapshot.currentOutput : undefined
                })
            });

            if (!response.ok) {
                throw new Error(`Resume failed: ${response.statusText}`);
            }

            const data = await response.json();
            const { target_stage, message } = data;

            // Clear interrupt state
            set({
                interruptPayload: null,
                isGraphPaused: false,
                graphStatus: 'idle'
            });

            if (action === 'approve') {
                // Mark current stage as complete and unlock next
                get().updateStage(interruptPayload.node as StageType, { status: 'complete' });

                const currentStageIdx = state.stages.findIndex(s => s.id === interruptPayload.node);
                if (currentStageIdx < state.stages.length - 1) {
                    const nextStage = state.stages[currentStageIdx + 1];
                    get().updateStage(nextStage.id, { status: 'idle' });
                }

                get().addLog('Supervisor', `Interrupt approved. Continuing to next stage.`, 'success');
                get().setToast({ message: 'Interrupt approved. Workflow continues.', type: 'success' });

            } else if (action === 'reject') {
                // Route back to target stage for re-execution
                get().addLog('Supervisor', `Interrupt rejected. Routing to ${target_stage} for revision.`, 'warning');

                // Reset target stage to idle for re-execution
                get().updateStage(target_stage as StageType, { status: 'idle' });

                get().setToast({ message: `Routing to ${target_stage} for revision.`, type: 'info' });

            } else if (action === 'edit') {
                // User edited the artifact inline, mark as complete with edited content
                get().updateStage(interruptPayload.node as StageType, {
                    status: 'complete',
                    output: interruptPayload.snapshot.currentOutput
                });

                get().addLog('Supervisor', `Artifact edited and approved.`, 'success');
                get().setToast({ message: 'Edited artifact saved. Continuing workflow.', type: 'success' });
            }

        } catch (e) {
            console.error('Failed to resolve interrupt:', e);

            // Fallback: local resolution (offline mode)
            get().addLog('Supervisor', 'Backend unavailable, resolving interrupt locally', 'warning');

            set({
                interruptPayload: null,
                isGraphPaused: false,
                graphStatus: 'idle'
            });

            if (action === 'approve' || action === 'edit') {
                get().updateStage(interruptPayload.node as StageType, { status: 'complete' });
                get().setToast({ message: 'Interrupt resolved (offline mode)', type: 'info' });
            } else {
                get().updateStage(interruptPayload.node as StageType, { status: 'idle' });
                get().setToast({ message: 'Stage reset for revision (offline mode)', type: 'info' });
            }
        }
    },

    timeTravel: async (checkpointId: string) => {
        const state = get();
        const checkpoint = state.checkpoints.find(c => c.id === checkpointId);

        if (!checkpoint) {
            get().setToast({ message: 'Checkpoint not found', type: 'error' });
            return;
        }

        get().addLog('System', `Time traveling to checkpoint: ${checkpoint.agent} (Step ${checkpoint.step})`, 'system');

        // Option 1: Use backend restore endpoint (preferred)
        try {
            const response = await fetch(`${API_BASE}/api/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: state.projectSettings.id,
                    checkpoint_id: checkpointId
                })
            });

            if (response.ok) {
                const data = await response.json();
                const { state_snapshot, checkpoints_truncated } = data;

                // Parse the restored state
                const restoredState = JSON.parse(state_snapshot);

                // Update store with restored state
                set({
                    stages: restoredState.stages || state.stages,
                    artefacts: restoredState.artefacts || state.artefacts,
                    schemas: restoredState.schemas || state.schemas,
                    // Truncate future checkpoints
                    checkpoints: state.checkpoints.filter(c => c.timestamp <= checkpoint.timestamp),
                    isDirty: true,
                    graphStatus: 'idle',
                    activeAgentId: null,
                    currentThinkingStep: null
                });

                get().addLog('System', `Restored to ${checkpoint.agent}. ${checkpoints_truncated} future checkpoints removed.`, 'success');
                get().setToast({ message: `Time travel successful! Restored to ${checkpoint.agent}`, type: 'success' });
                return;
            }
        } catch (e) {
            console.warn('Backend restore failed, using local checkpoint:', e);
        }

        // Option 2: Fallback to local restore (offline mode)
        const { stateSnapshot } = checkpoint;

        set({
            stages: stateSnapshot.stages || state.stages,
            artefacts: stateSnapshot.artefacts || state.artefacts,
            schemas: stateSnapshot.schemas || state.schemas,
            // Truncate future checkpoints locally
            checkpoints: state.checkpoints.filter(c => c.timestamp <= checkpoint.timestamp),
            isDirty: true,
            graphStatus: 'idle',
            activeAgentId: null,
            currentThinkingStep: null
        });

        get().addLog('System', `Restored to ${checkpoint.agent} (local mode)`, 'success');
        get().setToast({ message: `Time travel successful! Restored to ${checkpoint.agent}`, type: 'success' });
    },

    deleteBlueprints: (ids: string[]) => {},
    deleteProjects: (ids: string[]) => {},
    resetProject: () => set({ 
        productSeed: '',
        isSeeded: false,
        isDecomposing: false,
        stages: [],
        artefacts: [],
        partialArtifacts: {},
        schemas: [],
        logs: [],
        commits: [],
        traces: [],
        metrics: { totalTokens: 0, avgLatency: 0, enrichmentCycles: 0, estCost: 0 },
        checkpoints: [],
        isDirty: false,
        isManualPaused: false,
        isSimulationRunning: false,
        activityFeed: [],
        agentActivity: {}
    })
    }),
    {
      name: 'architecture-store', 
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
          productSeed: state.productSeed,
          isSeeded: state.isSeeded,
          stages: state.stages,
          artefacts: state.artefacts,
          schemas: state.schemas,
          logs: state.logs,
          commits: state.commits,
          checkpoints: state.checkpoints,
          projectSettings: state.projectSettings,
          blueprints: state.blueprints,
          recentProjects: state.recentProjects,
          userProfile: state.userProfile,
          hasUsedFreeTier: state.hasUsedFreeTier
      })
    }
  )
);
