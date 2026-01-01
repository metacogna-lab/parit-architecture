
# Parti Architecture: Production Deployment Guide

This guide details the deployment of the Parti backend to Cloudflare's Edge using D1 (SQL Database) and R2 (Object Storage).

## 1. Prerequisites

- **Node.js** v18+
- **Cloudflare Account**
- **Wrangler CLI** installed (`npm install -g wrangler`)

## 2. Environment Setup

Parti uses a tiered environment strategy defined in `wrangler.toml`:
1. **Development (Dev)**: Local execution / Preview.
2. **Staging**: `staging.parti.sh` - For integration testing.
3. **Production**: `parti.sh` - Live user traffic.

### A. Authenticate Wrangler
```bash
wrangler login
```

### B. Create D1 Databases
You need to create 3 separate databases and update `wrangler.toml` with the IDs.

```bash
# 1. Create Dev DB
wrangler d1 create parti_dev
# Copy the "database_id" output to 'd1_databases' in wrangler.toml

# 2. Create Staging DB
wrangler d1 create parti_staging
# Copy "database_id" to [env.staging.d1_databases]

# 3. Create Prod DB
wrangler d1 create parti_prod
# Copy "database_id" to [env.production.d1_databases]
```

### C. Create R2 Buckets
Create buckets for artifact storage.

```bash
wrangler r2 bucket create parti-dev-artifacts
wrangler r2 bucket create parti-staging-artifacts
wrangler r2 bucket create parti-prod-artifacts
```
*Note: Ensure the bucket names match exactly what is in `wrangler.toml`.*

## 3. Database Migration

Initialize the schema for all environments.

```bash
# Local/Dev
wrangler d1 execute parti_dev --local --file=./migrations/0001_initial.sql

# Staging
wrangler d1 execute parti_staging --file=./migrations/0001_initial.sql

# Production
wrangler d1 execute parti_prod --file=./migrations/0001_initial.sql
```

## 4. Frontend Configuration

The React frontend needs to know where the backend lives.

1. Create a `.env.production` file:
```env
VITE_API_BASE_URL=https://api.parti.sh
VITE_ENVIRONMENT=production
```

2. Update `store.ts` default settings or allow user to toggle `providerPreference` to 'cloudflare'.

## 5. Deployment

### Staging Deployment
```bash
wrangler deploy --env staging
```
Test the worker at `https://parti-backend-staging.<your-subdomain>.workers.dev` (or your custom domain).

### Production Deployment
```bash
wrangler deploy --env production
```

## 6. Observability & LangSmith

To link LangSmith traces with Cloudflare logs:
1. Ensure `LANGCHAIN_API_KEY` is set in your Cloudflare secrets.
   ```bash
   wrangler secret put LANGCHAIN_API_KEY
   ```
2. The frontend passes `X-Cloud-Trace-Context`. The Worker logs this ID to `system_logs` (D1), allowing you to join Frontend Actions -> Worker Execution -> LangSmith Trace.
