# Parti Architecture - Deployment Setup Guide

This guide walks through setting up the Cloudflare infrastructure for the Parti Architecture system.

## Prerequisites

1. **Cloudflare Account** - Sign up at https://dash.cloudflare.com
2. **Wrangler CLI** - Already installed (check with `wrangler --version`)
3. **Bun Runtime** - Already installed

## Step 1: Authenticate Wrangler

```bash
wrangler login
```

This will open a browser window for OAuth authentication.

## Step 2: Get Your Account ID

```bash
wrangler whoami
```

Copy your Account ID and update it in `wrangler.toml`:

```toml
account_id = "your-account-id-here"
```

## Step 3: Create D1 Databases

Create three D1 databases for dev, staging, and production:

```bash
# Development database
wrangler d1 create parti-dev

# Staging database
wrangler d1 create parti-staging

# Production database
wrangler d1 create parti-prod
```

Each command will output a `database_id`. **Copy these IDs** - you'll need them in the next step.

Example output:
```
✅ Successfully created DB 'parti-dev'

[[d1_databases]]
binding = "DB"
database_name = "parti-dev"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Step 4: Update wrangler.toml with Database IDs

Update `wrangler.toml` with the database IDs from Step 3:

```toml
# Development (default)
[[d1_databases]]
binding = "DB"
database_name = "parti-dev"
database_id = "your-dev-database-id"

# Staging
[[env.staging.d1_databases]]
binding = "DB"
database_name = "parti-staging"
database_id = "your-staging-database-id"

# Production
[[env.production.d1_databases]]
binding = "DB"
database_name = "parti-prod"
database_id = "your-prod-database-id"
```

## Step 5: Apply Database Migrations

Run the schema migration for each environment:

```bash
# Development
wrangler d1 execute parti-dev --file=./migrations/0001_initial.sql

# Staging
wrangler d1 execute parti-staging --file=./migrations/0001_initial.sql

# Production
wrangler d1 execute parti-prod --file=./migrations/0001_initial.sql
```

Expected output:
```
🌀 Executing on parti-dev (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx):
🚣 Executed 15 commands in 1.234ms
```

## Step 6: Verify Database Schema

Check that tables were created successfully:

```bash
# Development
wrangler d1 execute parti-dev --command="SELECT name FROM sqlite_master WHERE type='table'"

# Expected output:
# ┌────────────────────────┐
# │ name                   │
# ├────────────────────────┤
# │ projects               │
# │ artifacts              │
# │ checkpoints            │
# │ execution_traces       │
# │ project_settings       │
# │ agent_activity         │
# │ schema_metadata        │
# └────────────────────────┘
```

## Step 7: Create R2 Buckets

Create R2 buckets for artifact storage:

```bash
# Development bucket
wrangler r2 bucket create parti-dev-artifacts

# Staging bucket
wrangler r2 bucket create parti-staging-artifacts

# Production bucket
wrangler r2 bucket create parti-prod-artifacts
```

Expected output:
```
✅ Created bucket 'parti-dev-artifacts'
```

## Step 8: Set Up Secrets

Set sensitive environment variables (API keys) as secrets:

```bash
# Set Gemini API key
wrangler secret put GEMINI_API_KEY
# Paste your key when prompted

# Set OpenAI API key (optional)
wrangler secret put OPENAI_API_KEY

# Set Anthropic API key (optional)
wrangler secret put ANTHROPIC_API_KEY

# Set LangSmith API key (optional, for observability)
wrangler secret put LANGSMITH_API_KEY
```

For staging/production, add `--env staging` or `--env production`:

```bash
wrangler secret put GEMINI_API_KEY --env production
```

## Step 9: Deploy Supervisor Worker

Deploy the main supervisor worker to development:

```bash
cd workers/supervisor
wrangler deploy
```

For staging/production:

```bash
wrangler deploy --env staging
wrangler deploy --env production
```

Expected output:
```
✨ Built successfully
✨ Uploaded successfully
✨ Deployed parti-supervisor successfully
  https://parti-supervisor.your-subdomain.workers.dev
```

## Step 10: Deploy Agent Workers

Deploy each specialized agent worker:

```bash
# PRD Agent
cd workers/prd-agent
wrangler deploy

# Data Agent
cd workers/data-agent
wrangler deploy

# After creating missing workers (design, logic, api, frontend, deployment):
cd workers/design-agent
wrangler deploy

cd workers/logic-agent
wrangler deploy

cd workers/api-agent
wrangler deploy

cd workers/frontend-agent
wrangler deploy

cd workers/deployment-agent
wrangler deploy
```

## Step 11: Test Local Development

Test the setup locally using Wrangler's dev mode:

```bash
# Terminal 1: Start supervisor in dev mode
cd workers/supervisor
wrangler dev --local --persist

# Terminal 2: Start frontend
cd ../..
bun run dev
```

Open http://localhost:3000 and verify:
- [ ] Frontend loads successfully
- [ ] Can create a new project
- [ ] Project persists to D1 database
- [ ] No console errors

## Step 12: Verify D1 Data

After creating a test project, verify data was written:

```bash
# Check projects table
wrangler d1 execute parti-dev --command="SELECT * FROM projects LIMIT 5"

# Check artifacts table
wrangler d1 execute parti-dev --command="SELECT id, project_id, agent_id, artifact_type, created_at FROM artifacts LIMIT 5"

# Check checkpoints table
wrangler d1 execute parti-dev --command="SELECT checkpoint_id, project_id, phase, created_at FROM checkpoints LIMIT 5"
```

## Troubleshooting

### Error: "No such table: projects"

**Cause:** Migration not applied or failed silently.

**Fix:**
```bash
# Re-apply migration
wrangler d1 execute parti-dev --file=./migrations/0001_initial.sql

# Verify
wrangler d1 execute parti-dev --command="SELECT * FROM schema_metadata"
```

### Error: "Binding DB not found"

**Cause:** `database_id` not set in `wrangler.toml`.

**Fix:** Ensure you've updated `wrangler.toml` with the correct database IDs from Step 4.

### Error: "R2 bucket not found"

**Cause:** Bucket name mismatch or bucket not created.

**Fix:**
```bash
# List existing buckets
wrangler r2 bucket list

# Create if missing
wrangler r2 bucket create parti-dev-artifacts
```

### Error: "Service binding PRD_AGENT failed"

**Cause:** Agent worker not deployed yet.

**Fix:** Deploy the missing agent worker (see Step 10).

## Environment-Specific Deployment

### Development (Local)

```bash
# Uses local D1 database and R2 (persisted)
wrangler dev --local --persist
```

### Staging

```bash
# Deploy to staging
wrangler deploy --env staging

# Set staging secrets
wrangler secret put GEMINI_API_KEY --env staging
```

### Production

```bash
# Deploy to production
wrangler deploy --env production

# Set production secrets (IMPORTANT: Use production keys)
wrangler secret put GEMINI_API_KEY --env production
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put ANTHROPIC_API_KEY --env production
```

## Database Migrations (Future)

When adding new migrations:

1. Create new file: `/migrations/0002_add_feature.sql`
2. Apply to all environments:
   ```bash
   wrangler d1 execute parti-dev --file=./migrations/0002_add_feature.sql
   wrangler d1 execute parti-staging --file=./migrations/0002_add_feature.sql
   wrangler d1 execute parti-prod --file=./migrations/0002_add_feature.sql
   ```
3. Update `schema_metadata` table:
   ```sql
   INSERT INTO schema_metadata (version, applied_at, description)
   VALUES ('0002_add_feature', strftime('%s', 'now') * 1000, 'Description of changes');
   ```

## Rollback (Emergency)

To rollback a migration:

1. Create rollback script: `/migrations/0002_rollback.sql`
2. Apply:
   ```bash
   wrangler d1 execute parti-prod --file=./migrations/0002_rollback.sql
   ```
3. Update schema metadata to mark rollback

## Next Steps

After completing this setup:

- [ ] Test creating a project through the UI
- [ ] Verify all 7 agent workers are deployed
- [ ] Run E2E tests: `bun playwright test`
- [ ] Monitor D1 usage in Cloudflare dashboard
- [ ] Set up monitoring alerts for D1 storage limits
- [ ] Configure custom domain (optional)

## Cost Estimation

**D1 Database:**
- First 5 GB storage: FREE
- First 5M reads/day: FREE
- First 100K writes/day: FREE

**R2 Storage:**
- First 10 GB storage/month: FREE
- First 1M Class A operations: FREE
- Egress: FREE

**Workers:**
- First 100K requests/day: FREE
- First 400K GB-s compute: FREE

Estimate: **$0-5/month** for low-moderate usage (100 projects/day).

## Support

For issues:
- Cloudflare Docs: https://developers.cloudflare.com/d1/
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/
- Project Issues: /Users/nullzero/Metacogna/parti-architecture/README.md
