#!/bin/bash
# Helper script to set up the database when Prisma migration commands fail
# This applies migrations directly via psql inside the Docker container

set -e

echo "Setting up database..."

# Check if PostgreSQL container is running
if ! docker ps | grep -q halo-postgres; then
    echo "Starting PostgreSQL container..."
    docker-compose -f infra/docker-compose.yml up -d postgres
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Wait for PostgreSQL to be ready
until docker exec halo-postgres pg_isready -U halo > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 1
done

echo "Applying migrations..."

# Apply migration SQL directly
docker exec -i halo-postgres psql -U halo -d halo < apps/web/prisma/migrations/20251108044332_init/migration.sql

# Create migration tracking table if it doesn't exist
docker exec -i halo-postgres psql -U halo -d halo << 'EOF'
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMP,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMP,
    started_at TIMESTAMP NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);
EOF

echo "Seeding database..."

# Seed the database
docker exec -i halo-postgres psql -U halo -d halo << 'EOF'
-- Create test user
INSERT INTO "User" (id, email, name, "createdAt")
VALUES ('test-user-id', 'test@halo.com', 'Test User', NOW())
ON CONFLICT (email) DO NOTHING;

-- Create profile for test user
INSERT INTO "Profile" (id, "userId", age, gender, "heightCm", "weightKg", units, "primaryGoal", "weeklyWorkouts", "dietPrefs", allergies, "budgetWeekly", "timePrefs", "createdAt", "updatedAt")
SELECT 
  'test-profile-id',
  'test-user-id',
  30,
  'Other',
  175,
  70.0,
  'metric',
  'General fitness',
  3,
  ARRAY['Vegetarian']::TEXT[],
  ARRAY[]::TEXT[],
  100,
  ARRAY['morning', 'evening']::TEXT[],
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Profile" WHERE "userId" = 'test-user-id');

-- Create integration for test user
INSERT INTO "Integration" (id, "userId", "gcalConnected", "myrecConnected", "createdAt", "updatedAt")
SELECT 
  'test-integration-id',
  'test-user-id',
  false,
  false,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Integration" WHERE "userId" = 'test-user-id');

-- Create sample class slots
INSERT INTO "ClassSlot" (id, title, start, "end", location, "spotsOpen", provider, "createdAt")
SELECT 
  'class-' || i::text,
  'Sample Class ' || i,
  NOW() + (i || ' days')::INTERVAL + (9 + i * 2 || ' hours')::INTERVAL,
  NOW() + (i || ' days')::INTERVAL + (10 + i * 2 || ' hours')::INTERVAL,
  'Downtown Studio',
  10 + i,
  'myrec',
  NOW()
FROM generate_series(0, 4) i
WHERE NOT EXISTS (SELECT 1 FROM "ClassSlot" WHERE id = 'class-' || i::text);
EOF

echo "✅ Database setup complete!"
echo ""
echo "The database is ready. You can now start the app with:"
echo "  pnpm dev"

