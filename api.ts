
import { GoogleGenAI, Type } from "@google/genai";
import { StageType, AgentResponse, LLMProvider } from "./types";
import { SUPERVISOR_PROMPT, SUPERVISOR_ROUTER_PROMPT, LOGIC_WORKER_PROMPT, DESIGN_WORKER_PROMPT, VALIDATOR_WORKER_PROMPT, PRD_WORKER_PROMPT, RESPONSE_FORMAT_INSTRUCTION } from "./systemPrompts";

// Initialize the client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Model Selection Strategy
const MODELS = {
  FAST: 'gemini-3-flash-preview', 
  REASONING: 'gemini-3-pro-preview',
  IMAGE: 'gemini-2.5-flash-image',
};

// Strict Schema Definition for AgentResponse
const AGENT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    system_state: {
      type: Type.OBJECT,
      properties: {
        current_phase: { type: Type.STRING, description: "The current architectural phase (e.g., PRD, DATA, LOGIC)." },
        status: { type: Type.STRING, description: "Current status: 'complete' or 'interrupted'." },
        interrupt_signal: { type: Type.BOOLEAN, description: "True if human intervention/review is required." },
        message: { type: Type.STRING, description: "Short status message for the user." }
      },
      required: ["current_phase", "status", "interrupt_signal", "message"]
    },
    artifact: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, description: "Type of content: 'code', 'markdown', or 'mermaid_erd'." },
        content: { type: Type.STRING, description: "The actual generated content." },
        logic_summary: { type: Type.STRING, description: "Brief summary of the architectural decisions made." }
      },
      required: ["type", "content", "logic_summary"]
    },
    trace: {
      type: Type.OBJECT,
      properties: {
        agent: { type: Type.STRING, description: "Name of the acting agent." },
        reasoning: { type: Type.STRING, description: "Chain of thought explanation." },
        tokens_estimated: { type: Type.NUMBER, description: "Estimated token usage." }
      },
      required: ["agent", "reasoning", "tokens_estimated"]
    }
  },
  required: ["system_state", "artifact", "trace"]
};

interface GenerationOptions {
  stageId: StageType;
  prompt: string;
  context?: string;
  onChunk?: (text: string) => void;
  // New config props for multi-env support
  provider?: LLMProvider; 
  headers?: Record<string, string>;
}

/**
 * Generates content for a specific architectural stage.
 * Enforces strict JSON output compliant with AgentResponse interface.
 */
export const generateArtifact = async ({ stageId, prompt, context, onChunk, provider, headers }: GenerationOptions): Promise<AgentResponse> => {
  // 1. Select System Prompt & Model based on Stage
  let systemInstruction = SUPERVISOR_PROMPT;
  let model = MODELS.FAST;

  // Use Reasoning models for complex tasks
  if (['data', 'logic', 'api'].includes(stageId)) {
      model = MODELS.REASONING;
  }

  switch (stageId) {
    case 'prd':
      systemInstruction = PRD_WORKER_PROMPT;
      break;
    case 'design':
      systemInstruction = DESIGN_WORKER_PROMPT;
      break;
    case 'data':
      systemInstruction = `You are a Database Architect. Ensure 3NF normalization. Group entities by module.
      
      CRITICAL: Your artifact.content MUST be a JSON string array of SchemaTable objects matching this structure:
      [{
        "name": "TableName",
        "module": "ModuleName",
        "description": "Description",
        "fields": [{ "name": "id", "type": "uuid", "required": true, "isKey": true, "description": "PK" }]
      }]
      
      Do not wrap the JSON in markdown code blocks inside the string. Just valid JSON string.
      
      \n${RESPONSE_FORMAT_INSTRUCTION}`;
      break;
    case 'logic':
      systemInstruction = LOGIC_WORKER_PROMPT;
      break;
    case 'api':
      systemInstruction = `You are an API Architect. Define REST/GraphQL endpoints using OpenAPI format.\n${RESPONSE_FORMAT_INSTRUCTION}`;
      break;
    case 'frontend':
      systemInstruction = `You are a Frontend Architect. Outline the component tree and state management.\n${RESPONSE_FORMAT_INSTRUCTION}`;
      break;
    case 'deployment':
      systemInstruction = `You are a DevOps Engineer. Define CI/CD pipelines and Infrastructure as Code.\n${RESPONSE_FORMAT_INSTRUCTION}`;
      break;
  }

  // 2. Prepare content
  const fullPrompt = `Task Context:\n${context || "None"}\n\nUser Instruction:\n${prompt}`;

  // Log for tracing awareness
  if (headers && headers['X-Cloud-Trace-Context']) {
    console.debug(`[Tracing] Context: ${headers['X-Cloud-Trace-Context']}`);
  }

  try {
    // 3. Execution with Schema Enforcement
    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: AGENT_RESPONSE_SCHEMA,
        temperature: 0.2
      }
    });

    const text = response.text || "{}";
    
    // 4. Parse & Validation
    try {
        const parsed = JSON.parse(text);
        return parsed as AgentResponse;
    } catch (e) {
        console.error("JSON Parse Error:", e, text);
        // Fallback for malformed JSON
        return {
            system_state: {
                current_phase: stageId.toUpperCase(),
                status: "complete",
                interrupt_signal: false,
                message: "Recovered from malformed output"
            },
            artifact: {
                type: "markdown",
                content: text, 
                logic_summary: "Raw output preserved due to parsing error."
            },
            trace: {
                agent: "System_Recovery",
                reasoning: "JSON parsing failed, returning raw output.",
                tokens_estimated: 0
            }
        };
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error(`Agent failed to generate artifact for ${stageId}`);
  }
};
