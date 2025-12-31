# Wrangler Configuration & Deployment

This guide covers the `wrangler.toml` configuration for the Triple-Tier environment and the deployment strategy.

## 1. Infrastructure Mapping (wrangler.toml)

```toml
name = "parit-backend"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[vars]
DEFAULT_PROVIDER = "google"

# --- STAGING ---
[env.staging]
vars = { ENVIRONMENT = "staging" }
[[env.staging.d1_databases]]
binding = "DB"
database_name = "parit_staging_db"
database_id = "<STAGING_D1_UUID>"

[[env.staging.r2_buckets]]
binding = "STORAGE"
bucket_name = "parit-staging-artifacts"

# --- PRODUCTION ---
[env.production]
vars = { ENVIRONMENT = "production" }
[[env.production.d1_databases]]
binding = "DB"
database_name = "parit_prod_db"
database_id = "<PROD_D1_UUID>"

[[env.production.r2_buckets]]
binding = "STORAGE"
bucket_name = "parit-prod-artifacts"

# --- DEVELOPMENT (Local) ---
[env.dev]
vars = { ENVIRONMENT = "dev" }
[[env.dev.d1_databases]]
binding = "DB"
database_name = "parit_dev_db"
database_id = "<DEV_D1_UUID>"

[[env.dev.r2_buckets]]
binding = "STORAGE"
bucket_name = "parit-dev-artifacts"
```

## 2. Deployment & Merge Management

We follow a strict **Git-to-Cloudflare** pipeline. Branch merges act as the trigger for environment promotions.

### A. The Deployment Flow

1.  **Dev**: Local iteration using `npx wrangler dev`.
2.  **Staging**: Merging a feature branch into `main` triggers a deploy to the **Staging** environment.
3.  **Production**: Merging `main` into `production` (or a tagged release) triggers the **Live** deploy.

### B. GitHub Action Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare
on:
  push:
    branches: [main, production]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          # Logic: If branch is production, use 'production' env, else use 'staging'
          environment: ${{ github.ref == 'refs/heads/production' && 'production' || 'staging' }}
```

### C. Data Split Strategy

*   **D1 (SQL)**: Stores the "Graph State," user sessions, and LangGraph Checkpoints.
*   **R2 (S3)**: Stores the generated `.md` and `.mermaid` files. This keeps the database lean and allows for direct asset serving.
