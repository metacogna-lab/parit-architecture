import { SUPERVISOR_MODEL_ID, LOGIC_WORKER_MODEL_ID, DESIGN_WORKER_MODEL_ID, VALIDATOR_WORKER_MODEL_ID } from './constants';
import { SUPERVISOR_PROMPT, LOGIC_WORKER_PROMPT, DESIGN_WORKER_PROMPT, VALIDATOR_WORKER_PROMPT } from './systemPrompts';
import { StageType } from './types';

// --- Graph State Definition ---
export interface AgentState {
    messages: string[];
    next: string | null;
    currentStage: StageType | null;
    artifacts: Record<string, any>;
    interrupted: boolean;
}

// --- Signals ---
export type GraphSignal = { type: 'CONTINUE' } | { type: 'INTERRUPT', reason: string } | { type: 'FINISH' };

// --- Mock LLM Call (Simulating LangChain Model) ---
async function callMockLLM(modelId: string, systemPrompt: string, userContext: string): Promise<string> {
    // In a real implementation, this calls chatModel.invoke()
    // Simulating processing delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
    
    // Simulate simple reasoning based on role
    if (systemPrompt.includes("Supervisor")) {
        // Simple logic to route based on randomness or context simulation
        return "CONTINUE"; 
    }
    return `[${modelId}] Processed: ${userContext.substring(0, 30)}...`;
}

// --- Nodes ---

export class ArchitectureGraph {
    state: AgentState;
    history: AgentState[];
    
    constructor(initialState?: Partial<AgentState>) {
        this.state = {
            messages: [],
            next: 'Supervisor',
            currentStage: null,
            artifacts: {},
            interrupted: false,
            ...initialState
        };
        this.history = []; // Simple in-memory checkpointing
    }

    // Checkpoint current state
    saveCheckpoint() {
        this.history.push(JSON.parse(JSON.stringify(this.state)));
    }

    // Rollback
    restoreCheckpoint(index: number) {
        if (index >= 0 && index < this.history.length) {
            this.state = JSON.parse(JSON.stringify(this.history[index]));
            // Truncate future history (Time Travel)
            this.history = this.history.slice(0, index + 1);
            return true;
        }
        return false;
    }

    // Node: Supervisor
    async supervisorNode(input: string, currentStage: StageType): Promise<GraphSignal> {
        this.saveCheckpoint();
        
        console.log(`[Graph] Supervisor analyzing: ${input}`);

        // Logic to check interrupts (Phase 4: Event-Driven Interrupts)
        if (this.shouldInterrupt(currentStage)) {
            return { type: 'INTERRUPT', reason: `Supervisor requires approval for ${currentStage} logic.` };
        }

        return { type: 'CONTINUE' }; 
    }

    // Node: Worker (Generic wrapper for Logic/Design/etc based on current stage)
    async workerNode(stage: StageType, input: string) {
        let modelId = LOGIC_WORKER_MODEL_ID;
        let systemPrompt = LOGIC_WORKER_PROMPT;

        if (stage === 'design') { modelId = DESIGN_WORKER_MODEL_ID; systemPrompt = DESIGN_WORKER_PROMPT; }
        if (stage === 'deployment') { modelId = VALIDATOR_WORKER_MODEL_ID; systemPrompt = VALIDATOR_WORKER_PROMPT; }

        const result = await callMockLLM(modelId, systemPrompt, input);
        
        this.state.messages.push(result);
        this.state.artifacts[stage] = result;
        
        return result;
    }

    // Logic to check interrupts
    shouldInterrupt(stage: StageType): boolean {
        // Interrupt before 'data' and 'logic' for HITL
        if (['data', 'logic'].includes(stage)) {
            return true;
        }
        return false;
    }
}