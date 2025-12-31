#!/bin/bash

# ============================================================================
# Parit Architecture - Set Cloudflare Secrets
# ============================================================================
# This script sets the GEMINI_API_KEY secret for all agent workers
#
# Usage:
#   ./scripts/set-secrets.sh
#
# Requirements:
#   - Wrangler CLI authenticated (run: wrangler login)
#   - GEMINI_API_KEY environment variable set
#   OR
#   - Script will prompt for key if not set
# ============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKERS_DIR="$PROJECT_ROOT/workers"

# Agent workers that need GEMINI_API_KEY
AGENT_WORKERS=(
  "prd-agent"
  "data-agent"
  "design-agent"
  "logic-agent"
  "api-agent"
  "frontend-agent"
  "deployment-agent"
)

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Parit Architecture - Set Cloudflare Secrets${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${YELLOW}GEMINI_API_KEY not found in environment${NC}"
    echo -e "${YELLOW}Please enter your Gemini API key:${NC}"
    read -s GEMINI_API_KEY
    echo ""

    if [ -z "$GEMINI_API_KEY" ]; then
        echo -e "${RED}❌ No API key provided. Exiting.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ GEMINI_API_KEY found${NC}"
echo ""

# Confirm before setting secrets
echo -e "${YELLOW}This will set GEMINI_API_KEY for ${#AGENT_WORKERS[@]} workers:${NC}"
for WORKER in "${AGENT_WORKERS[@]}"; do
    echo -e "  - $WORKER"
done
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Setting secrets...${NC}"
echo ""

SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_WORKERS=()

for WORKER in "${AGENT_WORKERS[@]}"; do
    WORKER_PATH="$WORKERS_DIR/$WORKER"

    if [ ! -d "$WORKER_PATH" ]; then
        echo -e "${RED}❌ Worker directory not found: $WORKER${NC}"
        ((FAILED_COUNT++))
        FAILED_WORKERS+=("$WORKER")
        continue
    fi

    cd "$WORKER_PATH"

    echo -e "${BLUE}Setting secret for $WORKER...${NC}"

    # Use wrangler secret put (accepts input from stdin)
    if echo "$GEMINI_API_KEY" | wrangler secret put GEMINI_API_KEY > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Secret set for $WORKER${NC}"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}❌ Failed to set secret for $WORKER${NC}"
        ((FAILED_COUNT++))
        FAILED_WORKERS+=("$WORKER")
    fi

    echo ""
done

# Summary
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}✅ Successful: $SUCCESS_COUNT workers${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}❌ Failed: $FAILED_COUNT workers${NC}"
    echo -e "${RED}   Failed workers:${NC}"
    for WORKER in "${FAILED_WORKERS[@]}"; do
        echo -e "${RED}   - $WORKER${NC}"
    done
else
    echo -e "${GREEN}All secrets set successfully!${NC}"
fi
echo ""

# Next steps
if [ $SUCCESS_COUNT -gt 0 ]; then
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Deploy workers: ${GREEN}./scripts/deploy-parallel.sh${NC}"
    echo -e "  2. Test deployment: ${GREEN}curl https://parit-supervisor.{your-subdomain}.workers.dev${NC}"
    echo ""
fi

exit 0
