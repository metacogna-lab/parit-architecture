# Parit Architecture - Deployment Guide

## Quick Start

Deploy to production with a single command:

```bash
./scripts/deploy-full.sh production
```

This automated script handles:
1. ✅ Running integration tests
2. ✅ Migrating D1 database
3. ✅ Deploying all 8 workers (parallel)
4. ✅ Verifying deployment

---

## Prerequisites

### 1. Cloudflare Account Setup

```bash
# Install wrangler CLI (if not already installed)
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### 2. Environment Variables

Create a `.env` file with required API keys:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your Gemini API key: https://aistudio.google.com/app/apikey

### 3. Project Configuration

Update `wrangler.toml` files with your Cloudflare account details:

```toml
account_id = "your_cloudflare_account_id"  # From Cloudflare dashboard
```

---

## Deployment Options

### Option 1: Full Automated Deployment (Recommended)

**For Staging:**
```bash
./scripts/deploy-full.sh staging
```

**For Production:**
```bash
./scripts/deploy-full.sh production
```

**Skip Tests (faster):**
```bash
./scripts/deploy-full.sh staging --skip-tests
```

**Sequential Mode (better error visibility):**
```bash
./scripts/deploy-full.sh staging --sequential
```

---

### Option 2: Deploy Workers Only

**Parallel Deployment (2-3x faster):**
```bash
./scripts/deploy-parallel.sh production
```

**Sequential Deployment (safer):**
```bash
./scripts/deploy-all.sh production
```

---

### Option 3: Database Migration Only

**Development:**
```bash
./scripts/migrate-db.sh dev
```

**Staging:**
```bash
./scripts/migrate-db.sh staging
```

**Production (requires manual confirmation):**
```bash
./scripts/migrate-db.sh production
```

**All Environments:**
```bash
./scripts/migrate-db.sh all
```

---

## Deployment Scripts Reference

| Script | Purpose | Execution Time | Best For |
|--------|---------|---------------|----------|
| `deploy-full.sh` | Complete pipeline | 5-10 min | Production releases |
| `deploy-parallel.sh` | Workers only (parallel) | 2-3 min | Quick updates |
| `deploy-all.sh` | Workers only (sequential) | 6-8 min | Debugging |
| `migrate-db.sh` | Database setup | 1-2 min | Schema changes |

---

## Manual Deployment (Step-by-Step)

If you prefer manual control:

### Step 1: Create D1 Databases

```bash
# Development
wrangler d1 create parit_db_dev

# Staging
wrangler d1 create parit_db_staging

# Production
wrangler d1 create parit_db
```

Copy the returned database IDs into respective `wrangler.toml` files.

### Step 2: Create R2 Buckets

```bash
# Development
wrangler r2 bucket create parit-dev-artifacts

# Staging
wrangler r2 bucket create parit-staging-artifacts

# Production
wrangler r2 bucket create parit-prod-artifacts
```

### Step 3: Apply Migrations

```bash
# Development
wrangler d1 execute parit_db_dev --file=./migrations/0001_initial.sql --remote

# Staging
wrangler d1 execute parit_db_staging --file=./migrations/0001_initial.sql --remote

# Production
wrangler d1 execute parit_db --file=./migrations/0001_initial.sql --remote
```

### Step 4: Deploy Each Worker

```bash
# Supervisor (orchestrator)
cd workers/supervisor && wrangler deploy

# Agents
cd workers/prd-agent && wrangler deploy
cd workers/data-agent && wrangler deploy
cd workers/design-agent && wrangler deploy
cd workers/logic-agent && wrangler deploy
cd workers/api-agent && wrangler deploy
cd workers/frontend-agent && wrangler deploy
cd workers/deployment-agent && wrangler deploy
```

---

## Verification

### Check Worker Status

```bash
# List all deployments
wrangler deployments list

# Test supervisor endpoint
curl https://your-supervisor-url.workers.dev
```

Expected response:
```json
{
  "status": "supervisor_active",
  "role": "supervisor",
  "endpoints": [
    "GET /api/projects",
    "GET /api/hydrate/:id",
    "POST /api/projects",
    "POST /api/checkpoints",
    "POST /api/restore",
    "POST /api/resume"
  ]
}
```

### Verify Database

```bash
# Check tables exist
wrangler d1 execute parit_db --command="SELECT name FROM sqlite_master WHERE type='table';" --remote
```

Expected tables:
- `projects`
- `artifacts`
- `checkpoints`
- `execution_traces`
- `project_settings`

### Test Full Workflow

```bash
# Set your API key
export GEMINI_API_KEY="your_key_here"

# Run integration test
bun scripts/test-gemini.ts
```

---

## Rollback

If a deployment fails, rollback to previous version:

```bash
# List recent deployments
wrangler deployments list

# Rollback specific worker
cd workers/supervisor
wrangler rollback --message "Reverting to previous version"
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun x playwright test
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

      - name: Deploy workers
        run: ./scripts/deploy-parallel.sh production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## Troubleshooting

### Error: "Database not found"

```bash
# Create the database first
wrangler d1 create parit_db

# Update wrangler.toml with the database_id
# Then run migration
./scripts/migrate-db.sh production
```

### Error: "Worker deployment failed"

```bash
# Deploy with verbose logging
cd workers/supervisor
wrangler deploy --verbose

# Check for syntax errors
bun run build
```

### Error: "API key not valid"

```bash
# Verify environment variable is set
echo $GEMINI_API_KEY

# Test key directly
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

### Error: "Rate limit exceeded"

Gemini API has rate limits. Solutions:
1. Wait 1 minute and retry
2. Upgrade to paid tier: https://ai.google.dev/pricing
3. Use exponential backoff in production

---

## Production Checklist

Before deploying to production:

- [ ] All E2E tests passing (`bun x playwright test`)
- [ ] Gemini integration test passing (`bun scripts/test-gemini.ts`)
- [ ] Environment variables configured in Cloudflare dashboard
- [ ] Database migrated (`./scripts/migrate-db.sh production`)
- [ ] Workers deployed (`./scripts/deploy-parallel.sh production`)
- [ ] Supervisor endpoint responding
- [ ] Frontend configured with production API URL
- [ ] Monitoring/alerts configured (optional)

---

## Monitoring

### View Worker Logs

```bash
# Tail supervisor logs
wrangler tail supervisor

# View specific worker
wrangler tail prd-agent
```

### Cloudflare Dashboard

Monitor workers at: https://dash.cloudflare.com/workers

Track metrics:
- Request count
- Error rate
- CPU time
- Duration

---

## Costs

Cloudflare Workers free tier:
- 100,000 requests/day
- 10ms CPU time per request
- Unlimited bandwidth

D1 free tier:
- 5 GB storage
- 5 million reads/day
- 100,000 writes/day

R2 free tier:
- 10 GB storage
- 1 million Class A operations
- 10 million Class B operations

**Estimated cost for typical usage:** $0-5/month

---

## Support

- Cloudflare Docs: https://developers.cloudflare.com/workers/
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/
- D1 Database: https://developers.cloudflare.com/d1/
- R2 Storage: https://developers.cloudflare.com/r2/

For project-specific issues, check:
- `IMPLEMENTATION_SUMMARY.md` - Complete feature documentation
- `docs/API_REFERENCE.md` - API endpoint specifications
- `e2e/` - Test suite examples
