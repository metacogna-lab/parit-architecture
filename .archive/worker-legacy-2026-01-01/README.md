# Legacy Worker Directory - Archived 2026-01-01

## Why This Was Archived

This directory contained obsolete legacy code from an earlier iteration of the Parit Architecture project. It has been safely archived and removed from the active codebase.

## What Was Here

- **index.ts**: Old Gemini provider implementation (before shared package refactor)
- **storage.ts**: R2 storage utilities (now in `packages/shared/`)
- **wrangler.toml**: Misconfigured file pointing to `workers/supervisor/src/index.ts`

## Current Structure

All active worker code is now properly organized in the `/workers` directory:

```
workers/
├── supervisor/          # Main orchestrator
├── prd-agent/          # Product Requirements Document agent
├── data-agent/         # Database architecture agent
├── design-agent/       # Design system agent
├── logic-agent/        # Business logic agent
├── api-agent/          # API specification agent
├── frontend-agent/     # Frontend architecture agent
└── deployment-agent/   # DevOps & deployment agent
```

## Shared Code

Reusable utilities (including Gemini integration) are now in:
- `/packages/shared/src/gemini.ts` - Gemini API utilities
- `/packages/shared/src/systemPrompts.ts` - Agent prompts
- `/packages/shared/src/index.ts` - Shared types and interfaces

## Can This Be Deleted?

Yes. This archive exists only for historical reference. The code has been superseded by the proper worker architecture.

## Recovery

If you need to restore this for any reason:
```bash
cp -r .archive/worker-legacy-2026-01-01 worker/
```

(Not recommended - use the modern `/workers` structure instead)
