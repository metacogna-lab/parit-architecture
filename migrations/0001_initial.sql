-- Parti Architecture D1 Database Schema
-- Version: 0001_initial
-- Created: 2026-01-01
-- Description: Initial schema for multi-agent architecture system with project tracking,
--              artifact storage, checkpoint/restore, and execution observability

-- ============================================================================
-- Projects Table
-- ============================================================================
-- Stores project metadata including the product seed and environment configuration
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,                    -- UUID v4 generated server-side
  name TEXT NOT NULL,                     -- Human-readable project name
  product_seed TEXT NOT NULL,             -- Original product idea/description from user
  environment TEXT DEFAULT 'development', -- Environment: development, staging, production
  created_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  updated_at INTEGER NOT NULL             -- Unix timestamp (milliseconds)
);

-- Index for faster queries by creation date
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);

-- ============================================================================
-- Artifacts Table
-- ============================================================================
-- Stores agent-generated outputs with support for inline storage (small) and R2 (large)
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,                    -- UUID v4 for artifact ID
  project_id TEXT NOT NULL,               -- Foreign key to projects.id
  agent_id TEXT NOT NULL,                 -- Agent that generated this (prd-agent, data-agent, etc.)
  artifact_type TEXT NOT NULL,            -- Type: code, markdown, mermaid_erd, json, etc.
  content TEXT,                           -- Inline storage for small artifacts (<100KB)
  r2_key TEXT,                            -- R2 bucket key for large artifacts (>=100KB)
  version INTEGER DEFAULT 1,              -- Version number for artifact iterations
  metadata TEXT,                          -- JSON metadata: { size, hash, mime_type, etc. }
  created_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_artifacts_project ON artifacts(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifacts_agent ON artifacts(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(artifact_type);

-- ============================================================================
-- Checkpoints Table
-- ============================================================================
-- Stores graph state snapshots for time travel / checkpoint restore functionality
CREATE TABLE IF NOT EXISTS checkpoints (
  checkpoint_id TEXT PRIMARY KEY,         -- UUID v4 for checkpoint ID
  project_id TEXT NOT NULL,               -- Foreign key to projects.id
  thread_id TEXT,                         -- Optional thread ID for multi-threaded execution
  phase TEXT NOT NULL,                    -- Stage: prd, design, data, logic, api, frontend, deployment
  state_snapshot TEXT NOT NULL,           -- JSON stringified graph state (all stages, artifacts, status)
  agent_id TEXT,                          -- Agent that triggered checkpoint creation
  is_interrupted INTEGER DEFAULT 0,       -- 1 if checkpoint created during HITL interrupt, 0 otherwise
  created_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for time travel queries
CREATE INDEX IF NOT EXISTS idx_checkpoints_project ON checkpoints(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoints_phase ON checkpoints(phase);
CREATE INDEX IF NOT EXISTS idx_checkpoints_interrupted ON checkpoints(is_interrupted);

-- ============================================================================
-- Execution Traces Table
-- ============================================================================
-- Stores observability data for each agent execution (tokens, latency, costs, LangSmith URLs)
CREATE TABLE IF NOT EXISTS execution_traces (
  trace_id TEXT PRIMARY KEY,              -- UUID v4 for trace ID
  project_id TEXT NOT NULL,               -- Foreign key to projects.id
  agent_id TEXT NOT NULL,                 -- Agent that executed (prd-agent, data-agent, etc.)
  stage TEXT NOT NULL,                    -- Stage: prd, design, data, logic, api, frontend, deployment
  status TEXT NOT NULL,                   -- Status: success, error, timeout, interrupted
  latency_ms INTEGER,                     -- Execution time in milliseconds
  tokens_used INTEGER,                    -- Total tokens consumed (prompt + completion)
  cost_usd REAL,                          -- Estimated cost in USD
  model_used TEXT,                        -- Model ID: gemini-2.5-pro, gpt-5, etc.
  provider TEXT,                          -- Provider: google, openai, anthropic
  langsmith_url TEXT,                     -- LangSmith trace URL for debugging
  error_message TEXT,                     -- Error details if status = error
  created_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Indexes for observability queries
CREATE INDEX IF NOT EXISTS idx_traces_project ON execution_traces(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_agent ON execution_traces(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_status ON execution_traces(status);
CREATE INDEX IF NOT EXISTS idx_traces_model ON execution_traces(model_used);

-- ============================================================================
-- Project Settings Table
-- ============================================================================
-- Stores per-project configuration: API keys, model selection, agent tier mappings
CREATE TABLE IF NOT EXISTS project_settings (
  id TEXT PRIMARY KEY,                    -- UUID v4 for settings ID
  project_id TEXT NOT NULL UNIQUE,        -- Foreign key to projects.id (one setting per project)
  llm_provider TEXT DEFAULT 'google',     -- Default LLM provider: google, openai, anthropic
  llm_model TEXT DEFAULT 'gemini-2.5-flash', -- Default model ID
  gemini_api_key TEXT,                    -- Google Gemini API key (encrypted in production)
  openai_api_key TEXT,                    -- OpenAI API key (encrypted in production)
  anthropic_api_key TEXT,                 -- Anthropic API key (encrypted in production)
  agent_tiers TEXT,                       -- JSON array of AgentTierConfig (tier-specific model overrides)
  custom_instructions TEXT,               -- User-provided custom instructions for all agents
  provider_preference TEXT DEFAULT 'local', -- Execution mode: local (browser), cloudflare (workers)
  updated_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Index for fast settings lookup
CREATE INDEX IF NOT EXISTS idx_settings_project ON project_settings(project_id);

-- ============================================================================
-- Agent Activity Log Table (Optional - for real-time activity feed)
-- ============================================================================
-- Stores real-time agent activity deltas for streaming to frontend
CREATE TABLE IF NOT EXISTS agent_activity (
  id TEXT PRIMARY KEY,                    -- UUID v4 for activity entry
  project_id TEXT NOT NULL,               -- Foreign key to projects.id
  agent_id TEXT NOT NULL,                 -- Agent generating activity
  stage TEXT NOT NULL,                    -- Current stage
  activity_type TEXT NOT NULL,            -- Type: thinking, writing, validating, complete
  delta TEXT NOT NULL,                    -- Activity delta/message
  timestamp INTEGER NOT NULL,             -- Unix timestamp (milliseconds)
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Index for activity feed queries (recent first)
CREATE INDEX IF NOT EXISTS idx_activity_project ON agent_activity(project_id, timestamp DESC);

-- ============================================================================
-- Schema Metadata
-- ============================================================================
-- Tracks schema version for migration management
CREATE TABLE IF NOT EXISTS schema_metadata (
  version TEXT PRIMARY KEY,               -- Schema version: 0001_initial, 0002_add_xyz, etc.
  applied_at INTEGER NOT NULL,            -- Unix timestamp when migration was applied
  description TEXT                        -- Migration description
);

-- Insert initial version
INSERT INTO schema_metadata (version, applied_at, description)
VALUES (
  '0001_initial',
  strftime('%s', 'now') * 1000,
  'Initial schema: projects, artifacts, checkpoints, traces, settings, activity'
);

-- ============================================================================
-- Database Triggers (Optional - Auto-update timestamps)
-- ============================================================================

-- Trigger: Auto-update projects.updated_at on modification
CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
  UPDATE projects
  SET updated_at = strftime('%s', 'now') * 1000
  WHERE id = NEW.id;
END;

-- Trigger: Auto-update project_settings.updated_at on modification
CREATE TRIGGER IF NOT EXISTS update_settings_timestamp
AFTER UPDATE ON project_settings
FOR EACH ROW
BEGIN
  UPDATE project_settings
  SET updated_at = strftime('%s', 'now') * 1000
  WHERE id = NEW.id;
END;

-- ============================================================================
-- Views (Optional - Convenience queries)
-- ============================================================================

-- View: Project summary with artifact and checkpoint counts
CREATE VIEW IF NOT EXISTS project_summary AS
SELECT
  p.id,
  p.name,
  p.product_seed,
  p.environment,
  p.created_at,
  p.updated_at,
  COUNT(DISTINCT a.id) as artifact_count,
  COUNT(DISTINCT c.checkpoint_id) as checkpoint_count,
  COUNT(DISTINCT t.trace_id) as trace_count
FROM projects p
LEFT JOIN artifacts a ON p.id = a.project_id
LEFT JOIN checkpoints c ON p.id = c.project_id
LEFT JOIN execution_traces t ON p.id = t.project_id
GROUP BY p.id;

-- View: Recent activity across all projects
CREATE VIEW IF NOT EXISTS recent_activity AS
SELECT
  aa.id,
  aa.project_id,
  p.name as project_name,
  aa.agent_id,
  aa.stage,
  aa.activity_type,
  aa.delta,
  aa.timestamp
FROM agent_activity aa
JOIN projects p ON aa.project_id = p.id
ORDER BY aa.timestamp DESC
LIMIT 100;

-- View: Execution cost analytics by agent
CREATE VIEW IF NOT EXISTS cost_analytics AS
SELECT
  agent_id,
  model_used,
  provider,
  COUNT(*) as execution_count,
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as total_cost_usd,
  AVG(latency_ms) as avg_latency_ms,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
FROM execution_traces
GROUP BY agent_id, model_used, provider
ORDER BY total_cost_usd DESC;

-- ============================================================================
-- End of Schema
-- ============================================================================
