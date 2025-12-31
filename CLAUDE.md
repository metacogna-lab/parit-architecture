# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Parit Architecture** is an AI-powered software architecture design system that uses multi-agent collaboration to generate production-ready specifications from product ideas. The system orchestrates specialized AI agents through a directed graph workflow to produce PRDs, data models, API specs, frontend designs, and deployment configurations.

**Architecture Style:** Hybrid monorepo with browser-based React frontend and Cloudflare Workers backend (supervisor + specialized agents)

**Stack:**
- Frontend: React 18 + TypeScript + Vite + Zustand (state) + Framer Motion (animations)
- Backend: Cloudflare Workers (TypeScript) + D1 (SQLite) + R2 (object storage)
- AI: Google Gemini AI (@google/genai) with structured JSON output
- Package Manager: **Bun** (required - NOT npm/pnpm/yarn)
- Testing: Vitest + Bun test runner

## CRITICAL: Planning-First Workflow

**MANDATORY PROTOCOL FOR ALL TOOL OPERATIONS:**

Before executing ANY tool (Read, Write, Edit, Bash, Grep, Glob, WebSearch, etc.), you MUST follow this workflow:

1. **Plan First:** Use `EnterPlanMode` to enter planning mode
2. **Document Plan:** Research and write detailed implementation plan
3. **Present Plan:** Use `ExitPlanMode` to signal plan completion
4. **Wait for Approval:** Explicit user approval required before execution
5. **Execute Only After Approval:** Proceed with planned actions

**Zero Exceptions Policy:**
- Applies to EVERY individual user request involving tools
- Complexity level irrelevant (simple or complex)
- Tool type irrelevant (file operations, searches, web requests)
- User urgency does not override this requirement

**Approval Scope:**
- Approval does NOT carry over between user instructions
- Each new user message requiring tools = new planning cycle required
- Previous approvals are INVALID for new requests
- Reset and plan for each individual user instruction

**Enforcement:**
- Workflow Order: Plan → User Approval → Execute
- **NEVER:** Execute → Plan or Execute without Plan
- Violation: Executing ANY tool without planning/approval for current request

**When Planning is Required:**
- Implementation tasks (code changes, file creation/modification)
- Multi-step operations (refactoring, feature additions)
- Research with follow-up actions (analysis → code changes)

**When Planning May Be Skipped:**
- Pure informational queries (no file changes intended)
- Single-file reads for context only
- User explicitly requests immediate execution

## Development Commands

**Prerequisites:** Bun runtime (NOT Node.js)

### Local Development

```bash
# Install dependencies (root + all workspaces)
bun install

# Run frontend dev server (Vite on port 3000)
bun run dev

# Run tests (Vitest)
bun test

# Run specific test file
bun test agentGraph.test.ts

# Run tests in watch mode
bun test --watch

# Build for production
bun run build
```

### Workspace Development

This is a Bun workspace monorepo with the following structure:
- `workers/supervisor/` - Orchestration worker (routes to specialized agents)
- `workers/prd-agent/` - PRD generation worker
- `workers/data-agent/` - Data modeling worker
- `packages/shared/` - Shared types and utilities
- `packages/ui-configs/` - UI configuration

```bash
# Run all workers in dev mode (parallel)
bun --filter '*' dev

# Deploy all workers to staging
bun run deploy:staging

# Deploy all workers to production
bun run deploy:prod

# Clean all dependencies
bun run clean
```

### Cloudflare Workers Development

Each worker can be developed independently:

```bash
# Run specific worker locally (uses Wrangler)
cd workers/supervisor && bun run dev
cd workers/prd-agent && bun run dev
cd workers/data-agent && bun run dev

# Deploy specific worker
cd workers/supervisor && bun run deploy:staging
cd workers/supervisor && bun run deploy:prod
```

## Architecture Overview

### Multi-Agent Graph System

The core innovation is a **state machine with checkpoint/restore** that coordinates 7 specialized agents:

1. **PRD Agent** - Translates product seeds into structured requirements (user stories, functional specs)
2. **Design Agent** - Generates design tokens (colors, spacing, typography, vibe)
3. **Data Agent** - Creates normalized database schemas (entities, relations, Zod types)
4. **Logic Agent** - Defines business rules and validation logic
5. **API Agent** - Produces RESTful or GraphQL API specifications
6. **Frontend Agent** - Generates component hierarchies and UI specs
7. **Deployment Agent** - Creates infrastructure configs (Docker, K8s, Cloudflare)

**Supervisor Pattern:** A meta-agent (`workers/supervisor/`) orchestrates the workflow, routing requests to specialized workers and managing interrupts for human-in-the-loop (HITL) approval at critical stages (`data`, `logic`).

### State Management

**Frontend State:** Zustand store (`store.ts`) with localStorage persistence
- **Graph State:** Current stage, processing status, interrupts
- **Artifacts:** Generated outputs from each agent (code, schemas, docs)
- **Observability:** Logs, traces (LangSmith integration), activity feed
- **Checkpoints:** Time-travel snapshots for rollback

**Backend State:** Cloudflare D1 (SQLite) for persistence
- `projects` - Project metadata
- `artifacts` - Agent outputs (stored in R2 with metadata in D1)
- `checkpoints` - Graph state snapshots
- `traces` - LangSmith trace URLs and latency metrics

### Data Flow

```
User Input → Supervisor Worker → Specialized Agent Worker → Gemini AI → Structured JSON → Frontend Store → UI Update
                                                                                             ↓
                                                                                    D1 Database (checkpoint)
                                                                                             ↓
                                                                                    R2 Storage (artifacts)
```

**Critical Pattern:** All agent responses MUST conform to `AgentResponse` interface with strict JSON schema validation (enforced via Gemini's `responseMimeType: "application/json"` and schema constraints).

## Key Files and Modules

### Frontend Core

- `index.tsx` - Main React app entry point with agent graph visualization
- `Layout.tsx` - Paper-style UI shell (header, sidebar, viewport)
- `store.ts` - Zustand state management (745+ lines - contains all business logic)
- `agentGraph.ts` - Graph execution engine with checkpoint/restore
- `api.ts` - Gemini AI client with structured output schemas
- `types.ts` - TypeScript interfaces for all domain entities (276 lines)
- `systemPrompts.ts` - Agent system prompts and response format instructions

### UI Components

- `PaperComponents.tsx` - Complete UI component library (2,184 lines)
  - `PaperCard`, `PaperButton`, `PaperBadge` - Core primitives
  - `PaperStepLoader` - Multi-stage progress indicator
  - `PaperInterruptOverlay` - HITL approval modal
  - `PaperThinkingOverlay` - Agent reasoning visualization
  - `PaperObservabilityDashboard` - Trace/metrics viewer
  - `PaperDataDictionary` - Schema browser

### Backend Workers (Cloudflare)

- `workers/supervisor/src/index.ts` - Main orchestrator
  - Routes to specialized agents via service bindings
  - Manages streaming responses
  - Handles D1/R2 persistence
- `workers/supervisor/src/stream.ts` - Server-sent events for real-time updates
- `workers/supervisor/src/graph.ts` - Backend graph state machine
- `workers/prd-agent/src/index.ts` - PRD generation logic
- `workers/data-agent/src/index.ts` - Data modeling logic

### Configuration

- `wrangler.toml` - Cloudflare Workers config (defines D1/R2 bindings, env tiers)
- `package.json` - Workspace root with Bun scripts
- `bunfig.toml` - Bun configuration (currently empty)
- `vite.config.ts` - Frontend build config (injects `GEMINI_API_KEY` at build time)
- `tsconfig.json` - TypeScript compiler options

## Environment Variables

**Required:**
- `GEMINI_API_KEY` - Google AI Studio API key (used in frontend via Vite define)
- Set in `.env.local` for local development
- Set in Cloudflare Workers secrets for production: `wrangler secret put GEMINI_API_KEY`

**Optional (for LangSmith observability):**
- `LANGCHAIN_TRACING_V2=true`
- `LANGCHAIN_PROJECT=pratejra-architecture-v1`
- `LANGCHAIN_API_KEY=<your-key>`

**Multi-Provider Support (future):**
- `OPENAI_API_KEY` - For GPT-5/GPT-5-mini tiers
- `ANTHROPIC_API_KEY` - For Claude 3 Opus/Sonnet tiers

## Critical Architectural Patterns

### 1. Agent Response Contract

ALL agent outputs must conform to this JSON schema:

```typescript
{
  system_state: {
    current_phase: "prd" | "design" | "data" | "logic" | "api" | "frontend" | "deployment",
    status: "complete" | "interrupted",
    interrupt_signal: boolean,  // true triggers HITL approval
    message: string
  },
  artifact: {
    type: "code" | "markdown" | "mermaid_erd",
    content: string,           // Actual generated output
    logic_summary: string
  },
  trace: {
    agent: string,
    reasoning: string,         // Chain-of-thought
    tokens_estimated: number
  }
}
```

This is enforced in `api.ts` via `AGENT_RESPONSE_SCHEMA` and Gemini's `responseSchema` parameter.

### 2. Human-in-the-Loop Interrupts

Stages `['data', 'logic']` (defined in `constants.ts::INTERRUPT_STAGES`) automatically trigger approval overlays before proceeding. The supervisor checks `interrupt_signal: true` and pauses execution.

**User Actions:**
- **Approve** → Resume from checkpoint
- **Reject** → Provide feedback → Supervisor re-routes to corrective agent
- **Edit** → Modify artifact inline → Supervisor incorporates changes

### 3. Checkpoint/Restore (Time Travel)

The `ArchitectureGraph` class maintains an in-memory history of state snapshots:

```typescript
graph.saveCheckpoint();           // Before each node execution
graph.restoreCheckpoint(index);   // Rollback to specific point
```

In production, checkpoints are persisted to D1 (`checkpoints` table) with JSON-stringified graph state.

### 4. Streaming Responses

The supervisor worker uses server-sent events (SSE) to stream agent thinking steps to the frontend:

```typescript
// Backend (workers/supervisor/src/stream.ts)
encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: delta })}\n\n`)

// Frontend (store.ts)
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'thinking') updateActivityFeed(data);
}
```

### 5. Dual Execution Modes

**Browser Mode (Default):** Frontend calls Gemini AI directly via `@google/genai` (in `api.ts`)
- Faster iteration
- No Cloudflare deployment needed
- Limited to Gemini models

**Worker Mode (Production):** Frontend calls `/api/supervisor` which routes to Cloudflare Workers
- Multi-provider support (OpenAI, Anthropic, Gemini)
- D1/R2 persistence
- Better observability via LangSmith

Toggle via `providerPreference: 'local' | 'cloudflare'` in `ProjectSettings`.

## Testing Strategy

Tests use **Vitest** (NOT Jest) with Bun as the runtime.

**Test Files:**
- `agentGraph.test.ts` - Graph state machine logic (checkpoints, time travel)
- `store.test.ts` - Zustand store mutations (outcome-based testing)

**Running Tests:**
```bash
# All tests
bun test

# Specific file
bun test agentGraph.test.ts

# Watch mode
bun test --watch
```

**Key Test Patterns:**
- **Outcome-based:** Verify final state, not implementation details
- **Mock localStorage:** Zustand persistence layer is mocked in tests
- **No actual LLM calls:** Tests use mock responses (see `agentGraph.ts::callMockLLM`)

## Deployment

### Local Development

```bash
# 1. Install dependencies
bun install

# 2. Set API key in .env.local
echo "GEMINI_API_KEY=your_actual_key" > .env.local

# 3. Run dev server
bun run dev

# 4. Open browser
open http://localhost:3000
```

### Cloudflare Production Deployment

**Prerequisites:**
- Cloudflare account
- Wrangler CLI authenticated (`wrangler login`)

**Setup D1 Databases:**
```bash
# Create databases for each environment
wrangler d1 create parit_dev
wrangler d1 create parit_staging
wrangler d1 create parit_prod

# Update wrangler.toml with database IDs
```

**Setup R2 Buckets:**
```bash
wrangler r2 bucket create parit-dev-artifacts
wrangler r2 bucket create parit-staging-artifacts
wrangler r2 bucket create parit-prod-artifacts
```

**Deploy Workers:**
```bash
# Deploy all workers to staging
bun run deploy:staging

# Deploy all workers to production
bun run deploy:prod
```

**Set Secrets:**
```bash
wrangler secret put GEMINI_API_KEY --env production
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put ANTHROPIC_API_KEY --env production
```

See `docs/DEPLOYMENT_GUIDE_PROD.md` for complete deployment instructions.

## Code Constraints

### Bun-First Development

**ALWAYS use Bun APIs** instead of Node.js equivalents:
- `Bun.serve()` for HTTP servers (NOT Express)
- `bun:sqlite` for SQLite (NOT better-sqlite3)
- `Bun.file()` for file I/O (NOT fs.readFile/writeFile)
- `Bun.$` for shell commands (NOT execa)
- Bun auto-loads `.env` files (NO dotenv package needed)

**Package Management:**
- Use `bun install` (NOT npm/yarn/pnpm install)
- Use `bun run <script>` (NOT npm run)
- Use `bun test` (NOT jest/vitest CLI directly)

### TypeScript Strictness

- Strict mode enabled (`tsconfig.json`)
- All agent responses MUST be validated with Zod schemas
- No `any` types except in legacy code (prefer `unknown` with type guards)
- Use discriminated unions for `StageType`, `ProcessingStatus`, etc.

### Frontend Patterns

- **State mutations:** Use Zustand actions (e.g., `updateStageStatus`, `addLog`)
- **Side effects:** Keep in store actions, NOT in components
- **UI components:** All in `PaperComponents.tsx` (DO NOT create separate files)
- **Animations:** Use Framer Motion with `AnimatePresence` for conditionals

### Worker Patterns

- **Service bindings:** Workers communicate via Cloudflare service bindings (NOT HTTP)
- **Error handling:** All worker endpoints return JSON with `{ success: boolean, error?: string }`
- **Streaming:** Use `ReadableStream` for SSE responses
- **D1 queries:** Use prepared statements with `.bind()` for parameterization

## Known Implementation Gaps

See `implementation_gaps.json` for tracked issues:

- **GAP-001:** Semantic validation of agent outputs (e.g., Gherkin vs PRD consistency)
- **GAP-002:** Frontend code preview (Sandpack integration needed)
- **GAP-003:** Mock LLM providers in workers (need actual OpenAI/Anthropic REST calls)

## Observability

**LangSmith Integration:**
- Traces logged to LangSmith via environment variables (see `env_file.md`)
- Trace URLs stored in D1 `traces` table
- View traces in `PaperObservabilityDashboard` component

**Metrics Tracked:**
- Token usage per agent
- Latency per stage
- Cost estimation (tokens × model pricing)
- Enrichment cycles (iterations before convergence)

## UI/UX Philosophy

**Paper-Inspired Design:**
- Cream (`#f8f6f3`) backgrounds
- Charcoal (`#1a1a1a`) text
- Subtle shadows and embossed buttons
- Monospace fonts for code/technical content
- Serifs for headings (Playfair Display aesthetic)

**Interaction Patterns:**
- **Idle → Processing → Complete** state transitions with visual feedback
- **Thinking overlays** show agent reasoning in real-time
- **Interrupt modals** block UI until user approves/rejects
- **Toast notifications** for system events (non-blocking)
- **Command bar** for power-user shortcuts

## Migration Notes

**From npm/Node.js to Bun:**
If you see `npm` or `node` commands in documentation or scripts, replace with Bun equivalents:
- `npm install` → `bun install`
- `npm run dev` → `bun run dev`
- `node index.ts` → `bun index.ts`
- `ts-node file.ts` → `bun file.ts`

**Vite Note:**
Vite is still used for frontend bundling (via `bun run dev`), but production deployments can use Bun's native HTML imports with `Bun.serve()` (see root CLAUDE.md for pattern).
