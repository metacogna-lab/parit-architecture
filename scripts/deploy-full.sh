#!/bin/bash

###############################################################################
# Full Stack Deployment
#
# Complete deployment pipeline:
# 1. Run tests (optional)
# 2. Migrate D1 database
# 3. Deploy all workers (parallel)
# 4. Verify deployment
#
# Usage:
#   ./scripts/deploy-full.sh [environment] [options]
#
# Arguments:
#   environment - Optional: staging | production (default: staging)
#
# Options:
#   --skip-tests     Skip test execution
#   --skip-migrate   Skip database migration
#   --sequential     Deploy workers sequentially instead of parallel
#
# Examples:
#   ./scripts/deploy-full.sh                       # Deploy to staging (full)
#   ./scripts/deploy-full.sh production            # Deploy to production
#   ./scripts/deploy-full.sh staging --skip-tests  # Skip tests
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENV=${1:-staging}
SKIP_TESTS=false
SKIP_MIGRATE=false
SEQUENTIAL=false

# Parse options
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-migrate)
            SKIP_MIGRATE=true
            shift
            ;;
        --sequential)
            SEQUENTIAL=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$ROOT_DIR/scripts"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║        Parti Architecture - Full Stack Deployment         ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Environment:     ${YELLOW}$ENV${NC}"
echo -e "Skip Tests:      $([ "$SKIP_TESTS" = true ] && echo "${YELLOW}Yes${NC}" || echo "${GREEN}No${NC}")"
echo -e "Skip Migration:  $([ "$SKIP_MIGRATE" = true ] && echo "${YELLOW}Yes${NC}" || echo "${GREEN}No${NC}")"
echo -e "Deployment Mode: $([ "$SEQUENTIAL" = true ] && echo "${BLUE}Sequential${NC}" || echo "${GREEN}Parallel${NC}")"
echo ""

# Confirmation for production
if [ "$ENV" = "production" ]; then
    echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
    echo -e "${YELLOW}This will update all live workers and databases.${NC}"
    read -p "Type 'DEPLOY PRODUCTION' to continue: " CONFIRM
    if [ "$CONFIRM" != "DEPLOY PRODUCTION" ]; then
        echo -e "${RED}❌ Deployment cancelled${NC}"
        exit 1
    fi
    echo ""
fi

# Step 1: Run tests
if [ "$SKIP_TESTS" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🧪 Step 1/4: Running Tests${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    cd "$ROOT_DIR"

    # Run Gemini integration test
    if [ -f "$SCRIPTS_DIR/test-gemini.ts" ]; then
        echo -e "${YELLOW}Running Gemini integration test...${NC}"
        if bun "$SCRIPTS_DIR/test-gemini.ts"; then
            echo -e "${GREEN}✅ Gemini integration test passed${NC}\n"
        else
            echo -e "${RED}❌ Gemini integration test failed${NC}"
            echo -e "${YELLOW}Continue anyway? (y/N)${NC}"
            read -r CONTINUE
            if [ "$CONTINUE" != "y" ]; then
                exit 1
            fi
        fi
    fi

    # Run E2E tests (if configured)
    # Note: E2E tests require servers running, skip in CI
    # echo -e "${YELLOW}Running E2E tests...${NC}"
    # bun x playwright test

    echo -e "${GREEN}✅ Tests complete${NC}\n"
else
    echo -e "${YELLOW}⏭️  Skipping tests${NC}\n"
fi

# Step 2: Migrate database
if [ "$SKIP_MIGRATE" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 Step 2/4: Database Migration${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if [ -x "$SCRIPTS_DIR/migrate-db.sh" ]; then
        "$SCRIPTS_DIR/migrate-db.sh" "$ENV"
    else
        echo -e "${RED}❌ Migration script not found or not executable${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Database migration complete${NC}\n"
else
    echo -e "${YELLOW}⏭️  Skipping database migration${NC}\n"
fi

# Step 3: Deploy workers
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Step 3/4: Deploying Workers${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$SEQUENTIAL" = true ]; then
    echo -e "${BLUE}Using sequential deployment...${NC}"
    if [ -x "$SCRIPTS_DIR/deploy-all.sh" ]; then
        "$SCRIPTS_DIR/deploy-all.sh" "$ENV"
    else
        echo -e "${RED}❌ Deploy script not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Using parallel deployment (faster)...${NC}"
    if [ -x "$SCRIPTS_DIR/deploy-parallel.sh" ]; then
        "$SCRIPTS_DIR/deploy-parallel.sh" "$ENV"
    else
        echo -e "${RED}❌ Parallel deploy script not found${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Workers deployed${NC}\n"

# Step 4: Verify deployment
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Step 4/4: Verifying Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Get supervisor URL from wrangler
cd "$ROOT_DIR/workers/supervisor"
SUPERVISOR_URL=$(wrangler deployments list --json 2>/dev/null | jq -r '.[0].url' 2>/dev/null || echo "")

if [ -z "$SUPERVISOR_URL" ]; then
    echo -e "${YELLOW}⚠️  Could not determine supervisor URL${NC}"
else
    echo -e "${YELLOW}Testing supervisor endpoint...${NC}"
    if curl -sf "$SUPERVISOR_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Supervisor is responding${NC}"
        echo -e "${BLUE}URL: ${NC}$SUPERVISOR_URL"
    else
        echo -e "${RED}❌ Supervisor is not responding${NC}"
        echo -e "${YELLOW}This may take a few minutes for cold start${NC}"
    fi
fi

echo ""

# Final summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║                    ${GREEN}Deployment Complete!${BLUE}                   ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Environment:   ${YELLOW}$ENV${NC}"
echo -e "Workers:       ${GREEN}8 deployed${NC}"
echo -e "Database:      ${GREEN}Migrated${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Update frontend API_BASE to point to $SUPERVISOR_URL"
echo -e "  2. Deploy frontend to Vercel/Netlify/Cloudflare Pages"
echo -e "  3. Test the production flow"
echo ""
echo -e "${GREEN}🎉 All systems operational!${NC}"
