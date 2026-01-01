
import { SUPERVISOR_PROMPT } from './systemPrompts';
import { handleStreamRequest } from './stream';
import { ArchitectureState } from '@parti/shared';
import {
  generateUUID,
  now,
  isValidUUID,
  errorResponse,
  successResponse,
  parseRequestBody,
  sanitizeProjectName,
  sanitizeProductSeed,
  requiresInterrupt,
  shouldUseR2
} from './utils';

interface Fetcher {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

// D1 Database Binding Interface
interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta: any;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<D1Result>;
}

// R2 Bucket Binding Interface
interface R2Bucket {
  get(key: string): Promise<any>;
  put(key: string, value: any, options?: any): Promise<any>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  PRD_AGENT: Fetcher;
  DATA_AGENT: Fetcher;
  LOGIC_AGENT: Fetcher;
  AGENT_ROLE: string;
  DB: D1Database;
  STORAGE: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const isStream = request.headers.get('Accept') === 'text/event-stream';
    const target = request.headers.get('X-Target-Agent') || url.searchParams.get('agent');

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Agent-Provider, X-Agent-Type, X-Cloud-Trace-Context, X-Project-Env, Accept, X-Project-ID, X-Google-Key, X-OpenAI-Key",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // --- READ ENDPOINTS (Hydration) ---

    // 1. List Projects
    // GET /api/projects
    if (method === 'GET' && url.pathname === '/api/projects') {
      try {
        const { results } = await env.DB.prepare(
          "SELECT * FROM projects ORDER BY updated_at DESC LIMIT 50"
        ).run();
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
      }
    }

    // 2. Master Hydration Endpoint
    // GET /api/hydrate/:projectId
    if (method === 'GET' && url.pathname.startsWith('/api/hydrate/')) {
      const projectId = url.pathname.split('/').pop();
      if (!projectId) return new Response("Missing Project ID", { status: 400, headers: corsHeaders });

      try {
        // Parallel Fetching for Performance
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

        return new Response(JSON.stringify(responsePayload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
      }
    }
    
    // 3. Artifact Content Proxy (R2)
    // GET /api/artifacts/:key
    if (method === 'GET' && url.pathname.startsWith('/api/artifacts/content/')) {
        // URL Decode the key passed in the path
        const key = decodeURIComponent(url.pathname.replace('/api/artifacts/content/', ''));
        try {
            const object = await env.STORAGE.get(key);
            if (!object) return new Response("Artifact Not Found", { status: 404, headers: corsHeaders });

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set('etag', object.httpEtag);
            headers.set('Access-Control-Allow-Origin', '*');

            return new Response(object.body, { headers });
        } catch (e) {
            return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
        }
    }

    // --- WRITE ENDPOINTS (Inference) ---

    // 4. Create New Project (Server-Generated UUID)
    // POST /api/projects
    if (method === 'POST' && url.pathname === '/api/projects') {
      try {
        const body = await parseRequestBody<{
          productSeed: string;
          name?: string;
          environment?: string;
        }>(request);

        // Validation
        if (!body.productSeed || body.productSeed.trim().length === 0) {
          return errorResponse('INVALID_REQUEST', 'Product seed is required', 400, null, corsHeaders);
        }

        // Generate server-side UUID
        const projectId = generateUUID();
        const timestamp = now();
        const projectName = body.name ? sanitizeProjectName(body.name) : 'Untitled Project';
        const productSeed = sanitizeProductSeed(body.productSeed);
        const environment = body.environment || 'development';

        // Insert into D1
        const result = await env.DB.prepare(`
          INSERT INTO projects (id, name, product_seed, environment, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(projectId, projectName, productSeed, environment, timestamp, timestamp).run();

        if (!result.success) {
          return errorResponse('DATABASE_ERROR', 'Failed to create project', 500, result.error, corsHeaders);
        }

        // Return project data
        return successResponse({
          projectId,
          name: projectName,
          productSeed,
          environment,
          createdAt: timestamp,
          updatedAt: timestamp
        }, 201, corsHeaders);

      } catch (e: any) {
        return errorResponse('INTERNAL_ERROR', e.message || 'Failed to create project', 500, null, corsHeaders);
      }
    }

    // 5. Save Checkpoint (Time Travel)
    // POST /api/checkpoints
    if (method === 'POST' && url.pathname === '/api/checkpoints') {
      try {
        const body = await parseRequestBody<{
          projectId: string;
          phase: string;
          stateSnapshot: any; // Will be stringified
          agentId?: string;
          isInterrupted?: boolean;
        }>(request);

        // Validation
        if (!body.projectId || !isValidUUID(body.projectId)) {
          return errorResponse('INVALID_REQUEST', 'Valid project ID is required', 400, null, corsHeaders);
        }

        if (!body.phase) {
          return errorResponse('INVALID_REQUEST', 'Phase is required', 400, null, corsHeaders);
        }

        const checkpointId = generateUUID();
        const timestamp = now();
        const stateJson = JSON.stringify(body.stateSnapshot);

        // Insert checkpoint
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
          return errorResponse('DATABASE_ERROR', 'Failed to save checkpoint', 500, result.error, corsHeaders);
        }

        return successResponse({
          checkpointId,
          projectId: body.projectId,
          phase: body.phase,
          createdAt: timestamp
        }, 201, corsHeaders);

      } catch (e: any) {
        return errorResponse('INTERNAL_ERROR', e.message || 'Failed to save checkpoint', 500, null, corsHeaders);
      }
    }

    // 6. Restore from Checkpoint (Time Travel)
    // POST /api/restore
    if (method === 'POST' && url.pathname === '/api/restore') {
      try {
        const body = await parseRequestBody<{
          projectId: string;
          checkpointId: string;
        }>(request);

        // Validation
        if (!body.projectId || !isValidUUID(body.projectId)) {
          return errorResponse('INVALID_REQUEST', 'Valid project ID is required', 400, null, corsHeaders);
        }

        if (!body.checkpointId || !isValidUUID(body.checkpointId)) {
          return errorResponse('INVALID_REQUEST', 'Valid checkpoint ID is required', 400, null, corsHeaders);
        }

        // Fetch checkpoint
        const checkpoint = await env.DB.prepare(`
          SELECT * FROM checkpoints WHERE checkpoint_id = ? AND project_id = ?
        `).bind(body.checkpointId, body.projectId).first();

        if (!checkpoint) {
          return errorResponse('NOT_FOUND', 'Checkpoint not found', 404, null, corsHeaders);
        }

        // Parse state snapshot
        let stateSnapshot;
        try {
          stateSnapshot = JSON.parse(checkpoint.state_snapshot as string);
        } catch (e) {
          return errorResponse('INTERNAL_ERROR', 'Invalid checkpoint data', 500, null, corsHeaders);
        }

        // Delete future checkpoints (time travel truncates future)
        await env.DB.prepare(`
          DELETE FROM checkpoints
          WHERE project_id = ? AND created_at > ?
        `).bind(body.projectId, checkpoint.created_at).run();

        // Return restored state
        return successResponse({
          projectId: body.projectId,
          checkpointId: body.checkpointId,
          phase: checkpoint.phase,
          stateSnapshot,
          restoredAt: now()
        }, 200, corsHeaders);

      } catch (e: any) {
        return errorResponse('INTERNAL_ERROR', e.message || 'Failed to restore checkpoint', 500, null, corsHeaders);
      }
    }

    // 7. Resume from HITL Interrupt
    // POST /api/resume
    if (method === 'POST' && url.pathname === '/api/resume') {
      try {
        const body = await parseRequestBody<{
          projectId: string;
          stage: string;
          action: 'approve' | 'reject' | 'edit';
          feedback?: string;
          editedArtifact?: string;
        }>(request);

        // Validation
        if (!body.projectId || !isValidUUID(body.projectId)) {
          return errorResponse('INVALID_REQUEST', 'Valid project ID is required', 400, null, corsHeaders);
        }

        if (!body.stage) {
          return errorResponse('INVALID_REQUEST', 'Stage is required', 400, null, corsHeaders);
        }

        if (!['approve', 'reject', 'edit'].includes(body.action)) {
          return errorResponse('INVALID_REQUEST', 'Action must be approve, reject, or edit', 400, null, corsHeaders);
        }

        // Handle different actions
        let targetStage = body.stage;
        let shouldContinue = true;

        if (body.action === 'approve') {
          // Continue to next stage
          shouldContinue = true;
        } else if (body.action === 'reject') {
          // Supervisor routing logic based on feedback
          // For now, simple heuristic: re-execute current stage
          // In production, this would analyze feedback and route intelligently
          const feedback = body.feedback || '';

          // Simple routing heuristic
          if (feedback.toLowerCase().includes('requirement') || feedback.toLowerCase().includes('prd')) {
            targetStage = 'prd';
          } else if (feedback.toLowerCase().includes('design') || feedback.toLowerCase().includes('ui')) {
            targetStage = 'design';
          } else {
            // Re-execute current stage
            targetStage = body.stage;
          }

          shouldContinue = true;
        } else if (body.action === 'edit') {
          // User provided edited artifact, use it and continue
          if (!body.editedArtifact) {
            return errorResponse('INVALID_REQUEST', 'Edited artifact is required for edit action', 400, null, corsHeaders);
          }

          // Save edited artifact to D1
          const artifactId = generateUUID();
          const timestamp = now();

          await env.DB.prepare(`
            INSERT INTO artifacts (id, project_id, agent_id, artifact_type, content, version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            artifactId,
            body.projectId,
            `${body.stage}-agent`,
            'markdown',
            body.editedArtifact,
            1,
            timestamp
          ).run();

          shouldContinue = true;
        }

        // Return routing decision
        return successResponse({
          projectId: body.projectId,
          action: body.action,
          targetStage,
          shouldContinue,
          message: body.action === 'approve'
            ? 'Approved, continuing workflow'
            : body.action === 'reject'
              ? `Rejected, re-routing to ${targetStage} stage`
              : 'Artifact edited, continuing with changes'
        }, 200, corsHeaders);

      } catch (e: any) {
        return errorResponse('INTERNAL_ERROR', e.message || 'Failed to resume workflow', 500, null, corsHeaders);
      }
    }

    // 8. Handle Parallel Streaming Requests via the new Controller
    if (isStream && (!target || target === 'graph')) {
        // Session Persistence: Ensure Project ID exists in D1
        const projectId = request.headers.get('X-Project-ID');
        if (projectId) {
            // We use INSERT OR IGNORE to lazily create the project record if it's the first time we see this ID
            // Ideally this happens on a dedicated create route, but for robust prototypes, this is safe.
            ctx.waitUntil(env.DB.prepare(`
                INSERT OR IGNORE INTO projects (id, name, product_seed, environment)
                VALUES (?, 'New Project', 'Auto-generated session', 'dev')
            `).bind(projectId).run().catch(err => console.error("Failed to persist session", err)));
        }

        return handleStreamRequest(request, env);
    }

    // 5. Direct Proxy to Agents
    if (target === 'prd') {
      return env.PRD_AGENT.fetch(request);
    }
    
    if (target === 'data') {
      return env.DATA_AGENT.fetch(request);
    }
    
    if (target === 'logic') {
      return env.LOGIC_AGENT.fetch(request);
    }

    return new Response(JSON.stringify({
      status: 'supervisor_active',
      role: env.AGENT_ROLE || 'supervisor',
      instruction_preview: SUPERVISOR_PROMPT.substring(0, 50) + "...",
      endpoints: [
        'GET /api/projects',
        'GET /api/hydrate/:id',
        'GET /api/artifacts/content/:key',
        'POST /api/projects',
        'POST /api/checkpoints',
        'POST /api/restore',
        'POST /api/resume',
        'POST /api/generate (streaming)'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
