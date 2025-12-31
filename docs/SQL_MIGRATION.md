# Database Migration (0000_init_architecture.sql)

This migration creates the backbone for multi-agent coordination. It tracks checkpoints (for "Time Travel"), artifacts (the specific docs generated), and project-level metadata.

## Schema Definition

Save this as `migrations/0000_init_architecture.sql`.

```sql
-- Migration number: 0000 	 2026-01-01T00:00:00.000Z

-- 1. Projects Table: The Root Container
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  product_seed TEXT NOT NULL,
  environment TEXT CHECK(environment IN ('dev', 'staging', 'production')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Checkpoints: LangGraph Thread State
-- Stores the binary/JSON state of the graph for rollbacks and resumes.
CREATE TABLE IF NOT EXISTS checkpoints (
  checkpoint_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  phase TEXT NOT NULL, -- e.g., 'PRD', 'DATA'
  state_snapshot TEXT NOT NULL, -- Stringified JSON or Base64
  is_interrupted BOOLEAN DEFAULT FALSE,
  interrupt_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 3. Artifacts: Technical Outputs
-- The organized list for the Data Dictionary and PRDs.
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_id TEXT NOT NULL, -- e.g., 'data-architect'
  artifact_type TEXT NOT NULL, -- 'mermaid_erd', 'json_schema', 'markdown_prd'
  content TEXT NOT NULL,
  metadata TEXT, -- JSON for organized list grouping (module, entity)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 4. Traces: LangSmith Linkage
CREATE TABLE IF NOT EXISTS execution_traces (
  trace_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  status TEXT,
  latency_ms INTEGER,
  langsmith_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_artifacts_project ON artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_thread ON checkpoints(thread_id);
```

## implementation & Migration Workflow

To apply these changes across your three environments, use the following CLI pattern.

### A. Initializing the Migrations

Run this to create the migration files in your directory:

```bash
# Create the local migration entry
npx wrangler d1 migrations create DB init_architecture
```

### B. Executing the Shift (Staging & Prod)

```bash
# Apply to Local (Dev)
npx wrangler d1 migrations apply DB --local

# Apply to Staging
npx wrangler d1 migrations apply DB --remote --env staging

# Apply to Production
npx wrangler d1 migrations apply DB --remote --env production
```
