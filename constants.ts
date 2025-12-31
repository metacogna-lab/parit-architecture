// --- Model Configuration ---
export const SUPERVISOR_MODEL_ID = 'gpt-5'; // Large model for orchestration
export const DESIGN_WORKER_MODEL_ID = 'gpt-5'; // Large model for visual reasoning
export const LOGIC_WORKER_MODEL_ID = 'gpt-5-nano'; // Small model for rapid logic validation
export const VALIDATOR_WORKER_MODEL_ID = 'gpt-5-nano'; // Small model for regression checking

// --- Graph Configuration ---
export const GRAPH_RECURSION_LIMIT = 25;
export const INTERRUPT_STAGES = ['data', 'logic']; // Stages that require HITL approval before proceeding

// --- Environment Simulation ---
// In a real app, these would come from process.env via Vite/Webpack
export const ENV = {
    LANGCHAIN_TRACING_V2: 'true',
    LANGCHAIN_PROJECT: 'pratejra-architecture-v1',
    LANGCHAIN_ENDPOINT: 'https://api.smith.langchain.com'
};
