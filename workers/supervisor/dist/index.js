var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../packages/shared/src/systemPrompts.ts
var RESPONSE_FORMAT_INSTRUCTION = `
CRITICAL: You must respond ONLY in the following valid JSON format. Do not add markdown blocks like \`\`\`json.
{
  "system_state": {
    "current_phase": "<CURRENT_PHASE_NAME>",
    "status": "complete" | "interrupted", 
    "interrupt_signal": boolean, // Set true if human review is strictly needed (e.g. Data/Logic phases)
    "message": "Short status message"
  },
  "artifact": {
    "type": "code" | "markdown" | "mermaid_erd",
    "content": "<The actual content string, properly escaped>",
    "logic_summary": "Short summary of work"
  },
  "trace": {
    "agent": "<Your Agent Name>",
    "reasoning": "Brief explanation of your decisions",
    "tokens_estimated": <estimated_integer>
  }
}
`;
var SUPERVISOR_PROMPT = `You are the Supervisor of a software architecture team.
Your goal is to orchestrate the following workers to build a complete system specification:
1. Logic Worker (defines business rules, user stories)
2. Design Worker (defines UI tokens, component specs)
3. Validator (checks for consistency and errors)

Given a user request or a stage in the pipeline, decide which worker should act next.
If a stage is complete and valid, output "FINISH".
If you need human approval before moving to a critical phase (Data Modeling or API Specs), output "INTERRUPT".
${RESPONSE_FORMAT_INSTRUCTION}
`;
var PRD_WORKER_PROMPT = `You are a Lead Product Manager and Innovation Strategist.
Your goal is to transform a basic product concept into a comprehensive, professional Product Requirements Document (PRD).

### Instructions:
1.  **Analyze & Enrich**: Take the user's input (Product Seed) and expand upon it. Infer implicit needs, standard features for this domain, and potential "delighters".
2.  **Structure**: The 'artifact.content' MUST be valid Markdown using the following structure:
    *   **# [Product Name] - PRD**
    *   **## 1. Executive Summary**: A high-level pitch of the vision, problem solved, and target audience.
    *   **## 2. User Personas**: Define 2-3 distinct personas (Name, Role, Key Goals, Pain Points).
    *   **## 3. Functional Requirements**: Detailed list of features. Group them logically (e.g., Auth, Core Workflow, Settings).
    *   **## 4. Non-Functional Requirements**: Standards for Performance, Security, Scalability, and Accessibility (WCAG).
    *   **## 5. Roadmap (MoSCoW)**:
        *   **Must Have**: Critical path for MVP.
        *   **Should Have**: High priority, not blocking launch.
        *   **Could Have**: Nice to have.
        *   **Won't Have**: Out of scope for V1.

### Response Constraints:
- Use professional, definitive, and clear language.
- Ensure the 'system_state.current_phase' is 'PRD'.
- Ensure the 'artifact.type' is 'markdown'.

${RESPONSE_FORMAT_INSTRUCTION}
`;
var DATA_WORKER_PROMPT = `You are a Database Architect. Ensure 3NF normalization. Group entities by module.
      
CRITICAL: Your artifact.content MUST be a JSON string array of SchemaTable objects matching this structure:
[{
  "name": "TableName",
  "module": "ModuleName",
  "description": "Description",
  "fields": [{ "name": "id", "type": "uuid", "required": true, "isKey": true, "description": "PK" }]
}]

Do not wrap the JSON in markdown code blocks inside the string. Just valid JSON string.

${RESPONSE_FORMAT_INSTRUCTION}`;

// src/systemPrompts.ts
var SUPERVISOR_PROMPT2 = `You are the Supervisor of a software architecture team.
Your goal is to orchestrate the following workers to build a complete system specification:
1. Logic Worker (defines business rules, user stories)
2. Design Worker (defines UI tokens, component specs)
3. Validator (checks for consistency and errors)

Given a user request or a stage in the pipeline, decide which worker should act next.
If a stage is complete and valid, output "FINISH".
If you need human approval before moving to a critical phase (Data Modeling or API Specs), output "INTERRUPT".
${RESPONSE_FORMAT_INSTRUCTION}
`;

// src/context.ts
async function assembleContext(env, projectId) {
  if (!env.DB) {
    console.warn("DB binding not found during context assembly.");
    return "";
  }
  try {
    const project = await env.DB.prepare("SELECT product_seed FROM projects WHERE id = ?").bind(projectId).first();
    if (!project) return "";
    const artifacts = await env.DB.prepare("SELECT agent_id, content FROM artifacts WHERE project_id = ? ORDER BY created_at ASC").bind(projectId).all();
    let context = `Project Goal: ${project.product_seed}

Existing Architecture:
`;
    if (artifacts.results) {
      artifacts.results.forEach((a) => {
        const contentPreview = a.content.length > 500 ? a.content.substring(0, 500) + "..." : a.content;
        context += `[${a.agent_id.toUpperCase()}]: ${contentPreview}
`;
      });
    }
    return context;
  } catch (e) {
    console.error("Context assembly failed", e);
    return "";
  }
}
__name(assembleContext, "assembleContext");

// src/utils.ts
function generateUUID() {
  return crypto.randomUUID();
}
__name(generateUUID, "generateUUID");
function now() {
  return Date.now();
}
__name(now, "now");
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
__name(isValidUUID, "isValidUUID");
function errorResponse(code, message, status = 500, details, corsHeaders = {}) {
  const payload = {
    success: false,
    error: { code, message, details }
  };
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
__name(errorResponse, "errorResponse");
function successResponse(data, status = 200, corsHeaders = {}) {
  const payload = {
    success: true,
    data
  };
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
__name(successResponse, "successResponse");
async function parseRequestBody(request) {
  try {
    return await request.json();
  } catch (e) {
    throw new Error("Invalid JSON in request body");
  }
}
__name(parseRequestBody, "parseRequestBody");
function sanitizeProjectName(name) {
  return name.trim().substring(0, 255);
}
__name(sanitizeProjectName, "sanitizeProjectName");
function sanitizeProductSeed(seed) {
  return seed.trim().substring(0, 1e4);
}
__name(sanitizeProductSeed, "sanitizeProductSeed");
function requiresInterrupt(stage) {
  const INTERRUPT_STAGES = ["data", "logic"];
  return INTERRUPT_STAGES.includes(stage);
}
__name(requiresInterrupt, "requiresInterrupt");

// src/stream.ts
async function handleStreamRequest(request, env) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    console.warn("Failed to parse request body for stream context injection");
  }
  const projectId = request.headers.get("X-Project-ID") || body.projectId;
  let injectedContext = "";
  if (projectId) {
    injectedContext = await assembleContext(env, projectId);
  }
  const agentTasks = [];
  if (env.PRD_AGENT) agentTasks.push({ id: "prd", binding: env.PRD_AGENT });
  if (env.DATA_AGENT) agentTasks.push({ id: "data", binding: env.DATA_AGENT });
  if (env.LOGIC_AGENT) agentTasks.push({ id: "logic", binding: env.LOGIC_AGENT });
  const streamPromises = agentTasks.map(async (agent) => {
    try {
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
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            try {
              const json = JSON.parse(line.substring(6));
              let status = "thinking";
              let delta = "";
              if (json.type === "delta") {
                status = "writing";
                delta = json.content || "";
              } else if (json.type === "status") {
                status = "thinking";
                delta = json.message || "";
              } else if (json.type === "complete") {
                status = "complete";
                delta = json.message || "Done";
                if (json.response && requiresInterrupt(agent.id)) {
                  const agentResponse = json.response;
                  if (agentResponse.system_state?.interrupt_signal === true) {
                    const interruptPacket = {
                      timestamp: Date.now(),
                      agentId: agent.id,
                      delta: "\u26A0\uFE0F Human review required",
                      status: "interrupted",
                      interrupt: {
                        stage: agent.id,
                        artifact: agentResponse.artifact,
                        message: agentResponse.system_state.message,
                        reasoning: agentResponse.trace?.reasoning || ""
                      }
                    };
                    const interruptSSE = `data: ${JSON.stringify(interruptPacket)}

`;
                    await writer.write(encoder.encode(interruptSSE));
                    console.log(`[SUPERVISOR] HITL interrupt triggered for ${agent.id}`);
                    continue;
                  }
                }
              } else if (json.type === "error") {
                status = "complete";
                delta = `Error: ${json.chunk || json.message}`;
              }
              const packet = {
                timestamp: Date.now(),
                agentId: agent.id,
                delta,
                status
              };
              const sse = `data: ${JSON.stringify(packet)}

`;
              await writer.write(encoder.encode(sse));
            } catch (e) {
            }
          }
        }
      }
    } catch (e) {
      const errPacket = {
        timestamp: Date.now(),
        agentId: agent.id,
        delta: String(e),
        status: "complete"
      };
      const err = `data: ${JSON.stringify(errPacket)}

`;
      await writer.write(encoder.encode(err));
    }
  });
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
__name(handleStreamRequest, "handleStreamRequest");

// src/index.ts
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const isStream = request.headers.get("Accept") === "text/event-stream";
    const target = request.headers.get("X-Target-Agent") || url.searchParams.get("agent");
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Agent-Provider, X-Agent-Type, X-Cloud-Trace-Context, X-Project-Env, Accept, X-Project-ID, X-Google-Key, X-OpenAI-Key"
    };
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (method === "GET" && url.pathname === "/api/projects") {
      try {
        const { results } = await env.DB.prepare(
          "SELECT * FROM projects ORDER BY updated_at DESC LIMIT 50"
        ).run();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
      }
    }
    if (method === "GET" && url.pathname.startsWith("/api/hydrate/")) {
      const projectId = url.pathname.split("/").pop();
      if (!projectId) return new Response("Missing Project ID", { status: 400, headers: corsHeaders });
      try {
        const [projectRes, logsRes, artifactsRes, checkpointsRes] = await Promise.all([
          env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(projectId).first(),
          env.DB.prepare("SELECT * FROM execution_traces WHERE project_id = ? ORDER BY created_at DESC LIMIT 100").bind(projectId).run(),
          env.DB.prepare("SELECT * FROM artifacts WHERE project_id = ? ORDER BY created_at DESC").bind(projectId).run(),
          env.DB.prepare("SELECT * FROM checkpoints WHERE project_id = ? ORDER BY created_at DESC LIMIT 20").bind(projectId).run()
        ]);
        if (!projectRes) {
          return new Response("Project Not Found", { status: 404, headers: corsHeaders });
        }
        const responsePayload = {
          project: projectRes,
          history: {
            logs: logsRes.results || [],
            artifacts: artifactsRes.results || [],
            checkpoints: checkpointsRes.results || []
          }
        };
        return new Response(JSON.stringify(responsePayload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
      }
    }
    if (method === "GET" && url.pathname.startsWith("/api/artifacts/content/")) {
      const key = decodeURIComponent(url.pathname.replace("/api/artifacts/content/", ""));
      try {
        const object = await env.STORAGE.get(key);
        if (!object) return new Response("Artifact Not Found", { status: 404, headers: corsHeaders });
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(object.body, { headers });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
      }
    }
    if (method === "POST" && url.pathname === "/api/projects") {
      try {
        const body = await parseRequestBody(request);
        if (!body.productSeed || body.productSeed.trim().length === 0) {
          return errorResponse("INVALID_REQUEST", "Product seed is required", 400, null, corsHeaders);
        }
        const projectId = generateUUID();
        const timestamp = now();
        const projectName = body.name ? sanitizeProjectName(body.name) : "Untitled Project";
        const productSeed = sanitizeProductSeed(body.productSeed);
        const environment = body.environment || "development";
        const result = await env.DB.prepare(`
          INSERT INTO projects (id, name, product_seed, environment, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(projectId, projectName, productSeed, environment, timestamp, timestamp).run();
        if (!result.success) {
          return errorResponse("DATABASE_ERROR", "Failed to create project", 500, result.error, corsHeaders);
        }
        return successResponse({
          projectId,
          name: projectName,
          productSeed,
          environment,
          createdAt: timestamp,
          updatedAt: timestamp
        }, 201, corsHeaders);
      } catch (e) {
        return errorResponse("INTERNAL_ERROR", e.message || "Failed to create project", 500, null, corsHeaders);
      }
    }
    if (method === "POST" && url.pathname === "/api/checkpoints") {
      try {
        const body = await parseRequestBody(request);
        if (!body.projectId || !isValidUUID(body.projectId)) {
          return errorResponse("INVALID_REQUEST", "Valid project ID is required", 400, null, corsHeaders);
        }
        if (!body.phase) {
          return errorResponse("INVALID_REQUEST", "Phase is required", 400, null, corsHeaders);
        }
        const checkpointId = generateUUID();
        const timestamp = now();
        const stateJson = JSON.stringify(body.stateSnapshot);
        const result = await env.DB.prepare(`
          INSERT INTO checkpoints (checkpoint_id, project_id, phase, state_snapshot, agent_id, is_interrupted, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          checkpointId,
          body.projectId,
          body.phase,
          stateJson,
          body.agentId || null,
          body.isInterrupted ? 1 : 0,
          timestamp
        ).run();
        if (!result.success) {
          return errorResponse("DATABASE_ERROR", "Failed to save checkpoint", 500, result.error, corsHeaders);
        }
        return successResponse({
          checkpointId,
          projectId: body.projectId,
          phase: body.phase,
          createdAt: timestamp
        }, 201, corsHeaders);
      } catch (e) {
        return errorResponse("INTERNAL_ERROR", e.message || "Failed to save checkpoint", 500, null, corsHeaders);
      }
    }
    if (method === "POST" && url.pathname === "/api/restore") {
      try {
        const body = await parseRequestBody(request);
        if (!body.projectId || !isValidUUID(body.projectId)) {
          return errorResponse("INVALID_REQUEST", "Valid project ID is required", 400, null, corsHeaders);
        }
        if (!body.checkpointId || !isValidUUID(body.checkpointId)) {
          return errorResponse("INVALID_REQUEST", "Valid checkpoint ID is required", 400, null, corsHeaders);
        }
        const checkpoint = await env.DB.prepare(`
          SELECT * FROM checkpoints WHERE checkpoint_id = ? AND project_id = ?
        `).bind(body.checkpointId, body.projectId).first();
        if (!checkpoint) {
          return errorResponse("NOT_FOUND", "Checkpoint not found", 404, null, corsHeaders);
        }
        let stateSnapshot;
        try {
          stateSnapshot = JSON.parse(checkpoint.state_snapshot);
        } catch (e) {
          return errorResponse("INTERNAL_ERROR", "Invalid checkpoint data", 500, null, corsHeaders);
        }
        await env.DB.prepare(`
          DELETE FROM checkpoints
          WHERE project_id = ? AND created_at > ?
        `).bind(body.projectId, checkpoint.created_at).run();
        return successResponse({
          projectId: body.projectId,
          checkpointId: body.checkpointId,
          phase: checkpoint.phase,
          stateSnapshot,
          restoredAt: now()
        }, 200, corsHeaders);
      } catch (e) {
        return errorResponse("INTERNAL_ERROR", e.message || "Failed to restore checkpoint", 500, null, corsHeaders);
      }
    }
    if (method === "POST" && url.pathname === "/api/resume") {
      try {
        const body = await parseRequestBody(request);
        if (!body.projectId || !isValidUUID(body.projectId)) {
          return errorResponse("INVALID_REQUEST", "Valid project ID is required", 400, null, corsHeaders);
        }
        if (!body.stage) {
          return errorResponse("INVALID_REQUEST", "Stage is required", 400, null, corsHeaders);
        }
        if (!["approve", "reject", "edit"].includes(body.action)) {
          return errorResponse("INVALID_REQUEST", "Action must be approve, reject, or edit", 400, null, corsHeaders);
        }
        let targetStage = body.stage;
        let shouldContinue = true;
        if (body.action === "approve") {
          shouldContinue = true;
        } else if (body.action === "reject") {
          const feedback = body.feedback || "";
          if (feedback.toLowerCase().includes("requirement") || feedback.toLowerCase().includes("prd")) {
            targetStage = "prd";
          } else if (feedback.toLowerCase().includes("design") || feedback.toLowerCase().includes("ui")) {
            targetStage = "design";
          } else {
            targetStage = body.stage;
          }
          shouldContinue = true;
        } else if (body.action === "edit") {
          if (!body.editedArtifact) {
            return errorResponse("INVALID_REQUEST", "Edited artifact is required for edit action", 400, null, corsHeaders);
          }
          const artifactId = generateUUID();
          const timestamp = now();
          await env.DB.prepare(`
            INSERT INTO artifacts (id, project_id, agent_id, artifact_type, content, version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            artifactId,
            body.projectId,
            `${body.stage}-agent`,
            "markdown",
            body.editedArtifact,
            1,
            timestamp
          ).run();
          shouldContinue = true;
        }
        return successResponse({
          projectId: body.projectId,
          action: body.action,
          targetStage,
          shouldContinue,
          message: body.action === "approve" ? "Approved, continuing workflow" : body.action === "reject" ? `Rejected, re-routing to ${targetStage} stage` : "Artifact edited, continuing with changes"
        }, 200, corsHeaders);
      } catch (e) {
        return errorResponse("INTERNAL_ERROR", e.message || "Failed to resume workflow", 500, null, corsHeaders);
      }
    }
    if (isStream && (!target || target === "graph")) {
      const projectId = request.headers.get("X-Project-ID");
      if (projectId) {
        ctx.waitUntil(env.DB.prepare(`
                INSERT OR IGNORE INTO projects (id, name, product_seed, environment)
                VALUES (?, 'New Project', 'Auto-generated session', 'dev')
            `).bind(projectId).run().catch((err) => console.error("Failed to persist session", err)));
      }
      return handleStreamRequest(request, env);
    }
    if (target === "prd") {
      return env.PRD_AGENT.fetch(request);
    }
    if (target === "data") {
      return env.DATA_AGENT.fetch(request);
    }
    if (target === "logic") {
      return env.LOGIC_AGENT.fetch(request);
    }
    return new Response(JSON.stringify({
      status: "supervisor_active",
      role: env.AGENT_ROLE || "supervisor",
      instruction_preview: SUPERVISOR_PROMPT2.substring(0, 50) + "...",
      endpoints: [
        "GET /api/projects",
        "GET /api/hydrate/:id",
        "GET /api/artifacts/content/:key",
        "POST /api/projects",
        "POST /api/checkpoints",
        "POST /api/restore",
        "POST /api/resume",
        "POST /api/generate (streaming)"
      ]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
