#!/usr/bin/env bash
# ServiSite — Production setup script
# Run once on a fresh server after cloning the repo.
# Usage: sudo bash infrastructure/scripts/setup.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INFRA_DIR="$REPO_ROOT/infrastructure"

echo "============================================"
echo "  ServiSite — Production Setup"
echo "============================================"

# ── 1. System checks ────────────────────────────
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: '$1' is not installed. Please install it and re-run." >&2
    exit 1
  fi
}

check_command docker
check_command docker compose

echo "✓ Docker and Docker Compose detected"

# ── 2. Environment file ─────────────────────────
if [ ! -f "$INFRA_DIR/.env" ]; then
  if [ -f "$INFRA_DIR/.env.example" ]; then
    cp "$INFRA_DIR/.env.example" "$INFRA_DIR/.env"
    echo ""
    echo "IMPORTANT: .env file created from example."
    echo "Please edit $INFRA_DIR/.env with your actual values before continuing."
    echo ""
    read -r -p "Press ENTER after editing .env to continue, or Ctrl+C to abort..."
  else
    echo "ERROR: .env.example not found. Cannot create .env." >&2
    exit 1
  fi
else
  echo "✓ .env file already exists"
fi

# Source env file (for validation)
set -a
source "$INFRA_DIR/.env"
set +a

# ── 3. Validate required env vars ───────────────
REQUIRED_VARS=(
  "POSTGRES_PASSWORD"
  "JWT_SECRET"
  "AZURE_STORAGE_CONNECTION_STRING"
  "APP_DOMAIN"
)

echo ""
echo "Checking required environment variables..."
missing=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "  MISSING: $var"
    missing=1
  else
    echo "  ✓ $var"
  fi
done

if [ "$missing" -eq 1 ]; then
  echo ""
  echo "ERROR: Missing required environment variables. Please update $INFRA_DIR/.env" >&2
  exit 1
fi

# ── 4. Build images ──────────────────────────────
echo ""
echo "Building Docker images..."
docker compose -f "$INFRA_DIR/docker-compose.yml" build --no-cache

# ── 5. Start infrastructure ──────────────────────
echo ""
echo "Starting services..."
docker compose -f "$INFRA_DIR/docker-compose.yml" up -d postgres

echo "Waiting for PostgreSQL to be healthy..."
timeout 60 bash -c "until docker compose -f \"$INFRA_DIR/docker-compose.yml\" exec -T postgres pg_isready -U \${POSTGRES_USER:-servisite}; do sleep 2; done"
echo "✓ PostgreSQL is ready"

# ── 6. Run DB migrations ─────────────────────────
echo ""
echo "Running Prisma migrations..."
docker compose -f "$INFRA_DIR/docker-compose.yml" run --rm backend \
  npx prisma migrate deploy
echo "✓ Migrations applied"

# ── 7. Seed initial data ─────────────────────────
echo ""
read -r -p "Run seed script to create a demo tenant? [y/N] " seed_choice
if [[ "$seed_choice" =~ ^[Yy]$ ]]; then
  echo "Running seed..."
  docker compose -f "$INFRA_DIR/docker-compose.yml" run --rm backend \
    npx ts-node prisma/seed.ts
  echo "✓ Seed complete"
fi

# ── 8. Start all services ────────────────────────
echo ""
echo "Starting all services..."
docker compose -f "$INFRA_DIR/docker-compose.yml" up -d
echo ""
echo "✓ All services started."

# ── 9. Status ───────────────────────────────────
echo ""
docker compose -f "$INFRA_DIR/docker-compose.yml" ps

echo ""
echo "============================================"
echo "  Setup complete!"
echo "  Frontend:  https://${APP_DOMAIN}"
echo "  API:       https://api.${APP_DOMAIN}"
echo "  Swagger:   https://api.${APP_DOMAIN}/docs"
echo "============================================"
