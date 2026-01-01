#!/bin/bash

###############################################################################
# Deploy All Cloudflare Workers
#
# Usage:
#   ./scripts/deploy-all.sh [environment]
#
# Arguments:
#   environment - Optional: staging | production (default: production)
#
# Examples:
#   ./scripts/deploy-all.sh              # Deploy to production
#   ./scripts/deploy-all.sh staging      # Deploy to staging
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV=${1:-production}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKERS_DIR="$ROOT_DIR/workers"

# Worker list in deployment order
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
echo -e "${BLUE}   Parti Architecture - Deploy All Workers${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "Environment: ${YELLOW}$ENV${NC}"
echo -e "Workers to deploy: ${GREEN}${#WORKERS[@]}${NC}"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Error: wrangler CLI not found${NC}"
    echo -e "Install with: ${YELLOW}npm install -g wrangler${NC}"
    exit 1
fi

# Verify wrangler authentication
echo -e "${BLUE}🔐 Verifying Cloudflare authentication...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with Cloudflare${NC}"
    echo -e "Run: ${YELLOW}wrangler login${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated${NC}\n"

# Deploy each worker
DEPLOYED=0
FAILED=0

for WORKER in "${WORKERS[@]}"; do
    WORKER_DIR="$WORKERS_DIR/$WORKER"

    if [ ! -d "$WORKER_DIR" ]; then
        echo -e "${RED}❌ Worker directory not found: $WORKER_DIR${NC}"
        ((FAILED++))
        continue
    fi

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📦 Deploying: $WORKER${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    cd "$WORKER_DIR"

    # Build before deploy (if package.json has build script)
    if [ -f "package.json" ] && grep -q '"build"' package.json; then
        echo -e "${YELLOW}🔨 Building $WORKER...${NC}"
        if bun run build; then
            echo -e "${GREEN}✅ Build successful${NC}"
        else
            echo -e "${RED}❌ Build failed for $WORKER${NC}"
            ((FAILED++))
            continue
        fi
    fi

    # Deploy with environment flag
    echo -e "${YELLOW}🚀 Deploying to $ENV...${NC}"
    if [ "$ENV" = "staging" ]; then
        if wrangler deploy --env staging; then
            echo -e "${GREEN}✅ $WORKER deployed successfully${NC}\n"
            ((DEPLOYED++))
        else
            echo -e "${RED}❌ Deployment failed for $WORKER${NC}\n"
            ((FAILED++))
        fi
    else
        if wrangler deploy; then
            echo -e "${GREEN}✅ $WORKER deployed successfully${NC}\n"
            ((DEPLOYED++))
        else
            echo -e "${RED}❌ Deployment failed for $WORKER${NC}\n"
            ((FAILED++))
        fi
    fi
done

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Deployment Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "Total workers: ${BLUE}${#WORKERS[@]}${NC}"
echo -e "Successfully deployed: ${GREEN}$DEPLOYED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All workers deployed successfully!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some deployments failed. Check errors above.${NC}"
    exit 1
fi
