#!/bin/bash

###############################################################################
# D1 Database Migration Script
#
# Usage:
#   ./scripts/migrate-db.sh [environment]
#
# Arguments:
#   environment - Optional: dev | staging | production | all (default: dev)
#
# Examples:
#   ./scripts/migrate-db.sh              # Migrate dev database
#   ./scripts/migrate-db.sh staging      # Migrate staging database
#   ./scripts/migrate-db.sh all          # Migrate all environments
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENV=${1:-dev}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/migrations"

# Database names from wrangler.toml
DB_DEV="parti_db_dev"
DB_STAGING="parti_db_staging"
DB_PROD="parti_db"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Parti Architecture - D1 Database Migration${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "Target environment: ${YELLOW}$ENV${NC}\n"

# Check wrangler
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ wrangler CLI not found${NC}"
    exit 1
fi

# Verify authentication
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with Cloudflare${NC}"
    exit 1
fi

# Check migrations directory
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}❌ Migrations directory not found: $MIGRATIONS_DIR${NC}"
    exit 1
fi

# Get all migration files
MIGRATION_FILES=($(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort))

if [ ${#MIGRATION_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No migration files found in $MIGRATIONS_DIR${NC}"
    exit 0
fi

echo -e "${BLUE}Found ${#MIGRATION_FILES[@]} migration file(s)${NC}\n"

# Function to apply migrations to a database
migrate_database() {
    local DB_NAME=$1
    local ENV_NAME=$2

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 Migrating: $DB_NAME ($ENV_NAME)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Check if database exists
    echo -e "${YELLOW}Checking if database exists...${NC}"
    if ! wrangler d1 list | grep -q "$DB_NAME"; then
        echo -e "${YELLOW}⚠️  Database '$DB_NAME' not found. Creating...${NC}"
        wrangler d1 create "$DB_NAME"
        echo -e "${GREEN}✅ Database created${NC}"
    else
        echo -e "${GREEN}✅ Database exists${NC}"
    fi

    # Apply each migration
    for MIGRATION_FILE in "${MIGRATION_FILES[@]}"; do
        MIGRATION_NAME=$(basename "$MIGRATION_FILE")
        echo -e "${YELLOW}📝 Applying: $MIGRATION_NAME${NC}"

        if wrangler d1 execute "$DB_NAME" --file="$MIGRATION_FILE" --remote; then
            echo -e "${GREEN}✅ Migration applied successfully${NC}"
        else
            echo -e "${RED}❌ Migration failed${NC}"
            return 1
        fi
    done

    # Verify tables created
    echo -e "${YELLOW}🔍 Verifying tables...${NC}"
    TABLES=$(wrangler d1 execute "$DB_NAME" --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" --remote 2>/dev/null || echo "")

    if [ -n "$TABLES" ]; then
        echo -e "${GREEN}✅ Tables created:${NC}"
        echo "$TABLES" | grep -v "^name$" | sed 's/^/  - /'
    else
        echo -e "${YELLOW}⚠️  Could not verify tables (this is normal for some Cloudflare plans)${NC}"
    fi

    echo -e "${GREEN}✅ Migration complete for $DB_NAME${NC}\n"
}

# Migrate based on environment
case "$ENV" in
    dev)
        migrate_database "$DB_DEV" "Development"
        ;;
    staging)
        migrate_database "$DB_STAGING" "Staging"
        ;;
    production|prod)
        echo -e "${RED}⚠️  WARNING: You are about to migrate the PRODUCTION database!${NC}"
        echo -e "${YELLOW}This action cannot be undone.${NC}"
        read -p "Type 'MIGRATE PRODUCTION' to continue: " CONFIRM
        if [ "$CONFIRM" = "MIGRATE PRODUCTION" ]; then
            migrate_database "$DB_PROD" "Production"
        else
            echo -e "${RED}❌ Migration cancelled${NC}"
            exit 1
        fi
        ;;
    all)
        echo -e "${YELLOW}Migrating ALL environments...${NC}\n"
        migrate_database "$DB_DEV" "Development"
        migrate_database "$DB_STAGING" "Staging"

        echo -e "${RED}⚠️  Production migration requires explicit confirmation${NC}"
        read -p "Migrate production? Type 'YES' to continue: " CONFIRM
        if [ "$CONFIRM" = "YES" ]; then
            migrate_database "$DB_PROD" "Production"
        else
            echo -e "${YELLOW}⏭️  Skipping production${NC}"
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid environment: $ENV${NC}"
        echo -e "Valid options: dev, staging, production, all"
        exit 1
        ;;
esac

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Database migration complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
