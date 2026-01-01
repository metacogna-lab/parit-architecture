# Parti Architecture - API Reference

Complete documentation for the Cloudflare Workers backend API.

**Base URL (Development):** `http://localhost:8787`
**Base URL (Production):** `https://parti.metacogna.ai`

All endpoints return JSON responses with CORS enabled.

---

## Response Format

### Success Response
```typescript
{
  "success": true,
  "data": {
    // Response payload
  }
}
```

### Error Response
```typescript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional context
  }
}
```

### Error Codes
- `INVALID_REQUEST` - Missing or invalid parameters (400)
- `NOT_FOUND` - Resource not found (404)
- `DATABASE_ERROR` - D1 database operation failed (500)
- `INTERNAL_ERROR` - Unexpected server error (500)

---

## Endpoints

### 1. List Projects

**Endpoint:** `GET /api/projects`

**Description:** Retrieve a list of all projects ordered by most recently updated.

**Query Parameters:** None

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "E-commerce Platform",
    "product_seed": "Build a cloud-native e-commerce platform",
    "environment": "development",
    "created_at": 1704067200000,
    "updated_at": 1704153600000
  }
]
```

**Example:**
```bash
curl http://localhost:8787/api/projects
```

---

### 2. Create Project

**Endpoint:** `POST /api/projects`

**Description:** Create a new project with server-generated UUID.

**Request Body:**
```typescript
{
  "productSeed": string;      // Required: Product description/idea
  "name"?: string;            // Optional: Project name (default: "Untitled Project")
  "environment"?: string;     // Optional: development|staging|production (default: "development")
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My SaaS App",
    "productSeed": "Build a SaaS analytics dashboard",
    "environment": "development",
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8787/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "productSeed": "Build a SaaS analytics dashboard",
    "name": "Analytics Dashboard"
  }'
```

**Validation:**
- `productSeed` must be non-empty string
- Maximum length: 10,000 characters
- `name` maximum length: 255 characters

---

### 3. Get Project Details (Hydration)

**Endpoint:** `GET /api/hydrate/:projectId`

**Description:** Fetch complete project data including artifacts, checkpoints, and execution traces.

**Path Parameters:**
- `projectId` - UUID of the project

**Response:**
```json
{
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Analytics Dashboard",
    "product_seed": "Build a SaaS analytics dashboard",
    "environment": "development",
    "created_at": 1704067200000,
    "updated_at": 1704153600000
  },
  "history": {
    "logs": [
      {
        "trace_id": "...",
        "agent_id": "prd-agent",
        "status": "success",
        "latency_ms": 2500,
        "tokens_used": 1234,
        "cost_usd": 0.0025,
        "created_at": 1704067300000
      }
    ],
    "artifacts": [
      {
        "id": "...",
        "project_id": "550e8400-e29b-41d4-a716-446655440000",
        "agent_id": "prd-agent",
        "artifact_type": "markdown",
        "content": "# PRD Document...",
        "version": 1,
        "created_at": 1704067300000
      }
    ],
    "checkpoints": [
      {
        "checkpoint_id": "...",
        "project_id": "550e8400-e29b-41d4-a716-446655440000",
        "phase": "prd",
        "state_snapshot": "{...}",
        "agent_id": "prd-agent",
        "is_interrupted": 0,
        "created_at": 1704067300000
      }
    ]
  }
}
```

**Example:**
```bash
curl http://localhost:8787/api/hydrate/550e8400-e29b-41d4-a716-446655440000
```

**Status Codes:**
- `200` - Success
- `404` - Project not found

---

### 4. Get Artifact Content

**Endpoint:** `GET /api/artifacts/content/:key`

**Description:** Retrieve artifact content from R2 storage (for large artifacts).

**Path Parameters:**
- `key` - URL-encoded R2 key

**Response:** Raw artifact content with appropriate Content-Type header

**Example:**
```bash
curl http://localhost:8787/api/artifacts/content/project-123%2Fprd-artifact-v1.md
```

**Status Codes:**
- `200` - Success
- `404` - Artifact not found

---

### 5. Save Checkpoint

**Endpoint:** `POST /api/checkpoints`

**Description:** Save a graph state snapshot for time travel functionality.

**Request Body:**
```typescript
{
  "projectId": string;        // Required: UUID of project
  "phase": string;            // Required: prd|design|data|logic|api|frontend|deployment
  "stateSnapshot": object;    // Required: Complete graph state (will be stringified)
  "agentId"?: string;         // Optional: Agent that triggered checkpoint
  "isInterrupted"?: boolean;  // Optional: true if checkpoint created during HITL
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkpointId": "...",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "phase": "data",
    "createdAt": 1704067400000
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8787/api/checkpoints \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "phase": "data",
    "stateSnapshot": {
      "stages": [...],
      "artifacts": [...]
    },
    "agentId": "data-agent",
    "isInterrupted": true
  }'
```

**Validation:**
- `projectId` must be valid UUID
- `phase` must be one of: prd, design, data, logic, api, frontend, deployment

---

### 6. Restore from Checkpoint

**Endpoint:** `POST /api/restore`

**Description:** Restore project state from a saved checkpoint (time travel).

**Request Body:**
```typescript
{
  "projectId": string;      // Required: UUID of project
  "checkpointId": string;   // Required: UUID of checkpoint to restore
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "checkpointId": "...",
    "phase": "data",
    "stateSnapshot": {
      "stages": [...],
      "artifacts": [...]
    },
    "restoredAt": 1704067500000
  }
}
```

**Side Effects:**
- Deletes all checkpoints created after the restored checkpoint (truncates future)
- Does NOT delete artifacts or traces

**Example:**
```bash
curl -X POST http://localhost:8787/api/restore \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "checkpointId": "checkpoint-uuid-here"
  }'
```

**Validation:**
- Both `projectId` and `checkpointId` must be valid UUIDs
- Checkpoint must belong to the specified project

**Status Codes:**
- `200` - Success
- `404` - Checkpoint not found

---

### 7. Resume from Interrupt

**Endpoint:** `POST /api/resume`

**Description:** Handle HITL interrupt resolution (approve, reject, or edit artifact).

**Request Body:**
```typescript
{
  "projectId": string;            // Required: UUID of project
  "stage": string;                // Required: Current stage (data|logic|etc.)
  "action": "approve" | "reject" | "edit";  // Required
  "feedback"?: string;            // Required if action = "reject"
  "editedArtifact"?: string;      // Required if action = "edit"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "action": "approve",
    "targetStage": "logic",
    "shouldContinue": true,
    "message": "Approved, continuing workflow"
  }
}
```

**Action Behaviors:**

1. **Approve:**
   - Workflow continues to next stage
   - No routing change
   - Message: "Approved, continuing workflow"

2. **Reject:**
   - Supervisor analyzes feedback and routes intelligently
   - Heuristics:
     - Feedback contains "requirement" or "prd" → re-route to `prd` stage
     - Feedback contains "design" or "ui" → re-route to `design` stage
     - Otherwise → re-execute current stage
   - Message: "Rejected, re-routing to {targetStage} stage"

3. **Edit:**
   - Saves edited artifact to D1
   - Continues workflow with modified artifact
   - Artifact type: `markdown`, version: `1`
   - Message: "Artifact edited, continuing with changes"

**Example (Approve):**
```bash
curl -X POST http://localhost:8787/api/resume \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "stage": "data",
    "action": "approve"
  }'
```

**Example (Reject with feedback):**
```bash
curl -X POST http://localhost:8787/api/resume \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "stage": "logic",
    "action": "reject",
    "feedback": "Missing authentication requirements in PRD"
  }'
```

**Example (Edit artifact):**
```bash
curl -X POST http://localhost:8787/api/resume \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "stage": "data",
    "action": "edit",
    "editedArtifact": "EDITED: ## Database Schema\n..."
  }'
```

**Validation:**
- `projectId` must be valid UUID
- `stage` must be non-empty string
- `action` must be one of: approve, reject, edit
- `feedback` required if action = "reject"
- `editedArtifact` required if action = "edit"

---

## Agent Routing (Direct Proxying)

You can send requests directly to specialized agent workers via headers or query parameters.

**Header Method:**
```bash
curl -X POST http://localhost:8787/api/generate \
  -H "X-Target-Agent: prd" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Query Parameter Method:**
```bash
curl "http://localhost:8787/api/generate?agent=data"
```

**Supported Agents:**
- `prd` - PRD Agent (via PRD_AGENT service binding)
- `data` - Data Modeling Agent (via DATA_AGENT service binding)
- `logic` - Business Logic Agent (via LOGIC_AGENT service binding)
- `design` - Design Token Agent (via DESIGN_AGENT service binding)
- `api` - API Specification Agent (via API_AGENT service binding)
- `frontend` - Frontend Component Agent (via FRONTEND_AGENT service binding)
- `deployment` - Deployment Config Agent (via DEPLOYMENT_AGENT service binding)

---

## Streaming (Server-Sent Events)

**Endpoint:** `POST /api/generate` (with `Accept: text/event-stream` header)

**Description:** Stream agent execution in real-time via Server-Sent Events (SSE).

**Headers:**
- `Accept: text/event-stream` (Required)
- `X-Project-ID: <uuid>` (Optional - for session persistence)

**Event Format:**
```
event: thinking
data: {"type":"thinking","content":"Analyzing user stories...","agent":"prd-agent"}

event: writing
data: {"type":"writing","content":"## PRD Document","agent":"prd-agent"}

event: complete
data: {"type":"complete","artifact":{...},"trace":{...}}
```

**Example:**
```javascript
const eventSource = new EventSource(
  'http://localhost:8787/api/generate',
  {
    headers: {
      'X-Project-ID': projectId
    }
  }
);

eventSource.addEventListener('thinking', (event) => {
  const data = JSON.parse(event.data);
  console.log('Agent thinking:', data.content);
});

eventSource.addEventListener('complete', (event) => {
  const data = JSON.parse(event.data);
  console.log('Agent finished:', data.artifact);
  eventSource.close();
});
```

---

## CORS Configuration

All endpoints support CORS with the following headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Agent-Provider, X-Agent-Type,
                              X-Cloud-Trace-Context, X-Project-Env, Accept,
                              X-Project-ID, X-Google-Key, X-OpenAI-Key
```

Preflight requests (`OPTIONS`) are automatically handled.

---

## Rate Limiting

**Development:** No rate limits
**Production:** 100 requests/minute per IP (subject to change)

Exceeded limits return:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

---

## Example Workflows

### Complete Project Creation Flow

```bash
# 1. Create project
PROJECT_RESPONSE=$(curl -s -X POST http://localhost:8787/api/projects \
  -H "Content-Type: application/json" \
  -d '{"productSeed":"Build a task management app","name":"TaskMaster"}')

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.data.projectId')

# 2. Save checkpoint before execution
curl -X POST http://localhost:8787/api/checkpoints \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\":\"$PROJECT_ID\",
    \"phase\":\"prd\",
    \"stateSnapshot\":{\"stages\":[],\"artifacts\":[]},
    \"agentId\":\"system\"
  }"

# 3. Execute PRD stage (would call agent worker)
# ... agent execution happens here ...

# 4. If interrupted, handle with resume
curl -X POST http://localhost:8787/api/resume \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\":\"$PROJECT_ID\",
    \"stage\":\"data\",
    \"action\":\"approve\"
  }"

# 5. Fetch complete project state
curl "http://localhost:8787/api/hydrate/$PROJECT_ID"
```

### Time Travel Workflow

```bash
# 1. List checkpoints from hydration
CHECKPOINTS=$(curl -s "http://localhost:8787/api/hydrate/$PROJECT_ID" | \
  jq -r '.history.checkpoints')

# 2. Get first checkpoint ID
CHECKPOINT_ID=$(echo $CHECKPOINTS | jq -r '.[0].checkpoint_id')

# 3. Restore to that checkpoint
curl -X POST http://localhost:8787/api/restore \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\":\"$PROJECT_ID\",
    \"checkpointId\":\"$CHECKPOINT_ID\"
  }"
```

---

## Testing Endpoints

For local development, the supervisor exposes a root endpoint that returns available routes:

```bash
curl http://localhost:8787/
```

Response:
```json
{
  "status": "supervisor_active",
  "role": "supervisor",
  "instruction_preview": "You are the Supervisor of a software architect...",
  "endpoints": [
    "GET /api/projects",
    "GET /api/hydrate/:id",
    "GET /api/artifacts/content/:key",
    "POST /api/projects",
    "POST /api/checkpoints",
    "POST /api/restore",
    "POST /api/resume",
    "POST /api/generate (streaming)"
  ]
}
```

---

## Database Schema Reference

See `/migrations/0001_initial.sql` for complete schema.

**Key Tables:**
- `projects` - Project metadata
- `artifacts` - Agent-generated outputs
- `checkpoints` - Graph state snapshots
- `execution_traces` - Observability data (tokens, latency, cost)
- `project_settings` - Per-project configuration
- `agent_activity` - Real-time activity log
- `schema_metadata` - Migration tracking

---

## Troubleshooting

### Error: "No such table: projects"
**Cause:** D1 migrations not applied

**Fix:**
```bash
wrangler d1 execute parti-dev --file=./migrations/0001_initial.sql
```

### Error: "Binding DB not found"
**Cause:** `wrangler.toml` missing database_id

**Fix:** Run `wrangler d1 create parti-dev` and update `wrangler.toml` with the ID

### Error: "Invalid UUID"
**Cause:** Malformed project ID or checkpoint ID

**Fix:** Ensure UUIDs match format: `xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx`

### Error: "Project Not Found" (404)
**Cause:** Project doesn't exist in database or wrong environment

**Fix:** Verify project exists: `wrangler d1 execute parti-dev --command="SELECT * FROM projects"`

---

## Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [R2 Storage Docs](https://developers.cloudflare.com/r2/)
- [Deployment Setup Guide](/DEPLOYMENT_SETUP.md)
- [Frontend Integration Guide](/docs/FRONTEND_INTEGRATION.md) _(coming soon)_
