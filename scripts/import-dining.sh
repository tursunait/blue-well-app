#!/bin/bash

# Script to import Duke Dining data
# Usage: ./scripts/import-dining.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🍽️  Duke Dining Data Import${NC}\n"

# Check if .env.local exists
ENV_FILE="apps/web/.env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: $ENV_FILE not found${NC}"
    exit 1
fi

# Get ADMIN_TOKEN from .env.local
ADMIN_TOKEN=$(grep "^ADMIN_TOKEN=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "your-admin-token-here" ]; then
    echo -e "${YELLOW}⚠️  ADMIN_TOKEN not set or is placeholder${NC}"
    echo "Generating a new token..."
    NEW_TOKEN=$(openssl rand -base64 32)
    sed -i.bak "s|^ADMIN_TOKEN=.*|ADMIN_TOKEN=$NEW_TOKEN|" "$ENV_FILE"
    ADMIN_TOKEN=$NEW_TOKEN
    echo -e "${GREEN}✅ Generated new ADMIN_TOKEN${NC}"
    echo -e "${YELLOW}⚠️  Please restart your dev server for the token to take effect${NC}\n"
fi

# Check if data file exists
DATA_FILE="data/Data.csv"
if [ ! -f "$DATA_FILE" ]; then
    echo -e "${RED}❌ Error: $DATA_FILE not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found data file: $DATA_FILE${NC}"

# Get the port (default 3000, but might be 3001, 3002, etc.)
PORT=${PORT:-3000}
if ! curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    # Try common ports
    for p in 3001 3002 3000; do
        if curl -s "http://localhost:$p" > /dev/null 2>&1; then
            PORT=$p
            break
        fi
    done
fi

echo -e "${GREEN}✅ Using port: $PORT${NC}\n"

# Import the data
echo "Importing Duke Dining data..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:$PORT/api/admin/duke-dining/import" \
  -H "ADMIN_TOKEN: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rebuildEmbeddings": true}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Import successful!${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Import failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
    exit 1
fi

echo -e "\n${GREEN}✅ Done! You can now generate meal plans.${NC}"

