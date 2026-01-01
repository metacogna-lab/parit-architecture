#!/bin/bash

###############################################################################
# Deploy All Cloudflare Workers in Parallel
#
# ⚡ FAST MODE: Deploys all workers simultaneously (2-3x faster)
#
# Usage:
#   ./scripts/deploy-parallel.sh [environment]
#
# Arguments:
#   environment - Optional: staging | production (default: production)
#
# Note: Deploys all workers in parallel. Check output carefully for errors.
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENV=${1:-production}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKERS_DIR="$ROOT_DIR/workers"

WORKERS=(
  "supervisor"
  "prd-agent"
  "data-agent"
  "design-agent"
  "logic-agent"
  "api-agent"
  "frontend-agent"
  "deployment-agent"
)

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   ⚡ Parallel Deployment Mode${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "Environment: ${YELLOW}$ENV${NC}"
echo -e "Workers: ${GREEN}${#WORKERS[@]}${NC}"
echo -e "${YELLOW}⚠️  All workers will deploy simultaneously${NC}\n"

# Check wrangler
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ wrangler CLI not found${NC}"
    exit 1
fi

# Deploy function
deploy_worker() {
    local WORKER=$1
    local WORKER_DIR="$WORKERS_DIR/$WORKER"
    local LOG_FILE="/tmp/parti-deploy-$WORKER.log"

    if [ ! -d "$WORKER_DIR" ]; then
        echo -e "${RED}❌ $WORKER: Directory not found${NC}" | tee "$LOG_FILE"
        return 1
    fi

    cd "$WORKER_DIR"

    {
        echo "Deploying $WORKER..."

        # Build if needed
        if [ -f "package.json" ] && grep -q '"build"' package.json; then
            echo "Building $WORKER..."
            bun run build || { echo "Build failed"; exit 1; }
        fi

        # Deploy
        if [ "$ENV" = "staging" ]; then
            wrangler deploy --env staging || { echo "Deploy failed"; exit 1; }
        else
            wrangler deploy || { echo "Deploy failed"; exit 1; }
        fi

        echo "✅ $WORKER deployed successfully"
    } > "$LOG_FILE" 2>&1

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $WORKER${NC}"
        return 0
    else
        echo -e "${RED}❌ $WORKER${NC}"
        cat "$LOG_FILE"
        return 1
    fi
}

export -f deploy_worker
export WORKERS_DIR ENV

# Deploy all workers in parallel
echo -e "${BLUE}🚀 Starting parallel deployments...${NC}\n"

PIDS=()
for WORKER in "${WORKERS[@]}"; do
    deploy_worker "$WORKER" &
    PIDS+=($!)
done

# Wait for all deployments
DEPLOYED=0
FAILED=0

for i in "${!PIDS[@]}"; do
    if wait "${PIDS[$i]}"; then
        ((DEPLOYED++))
    else
        ((FAILED++))
    fi
done

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Deployment Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "Total: ${BLUE}${#WORKERS[@]}${NC}"
echo -e "Success: ${GREEN}$DEPLOYED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All workers deployed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  $FAILED worker(s) failed${NC}"
    echo -e "Check logs in /tmp/parti-deploy-*.log"
    exit 1
fi
