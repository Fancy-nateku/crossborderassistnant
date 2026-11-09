#!/usr/bin/env bash
# One-shot local setup: Postgres container, env files, migrations, seed.
set -euo pipefail
cd "$(dirname "$0")/.."

NAME=crossborder-postgres
DB="postgresql://crossborder:crossborder_local@localhost:5433/crossborder"

if ! docker inspect "$NAME" >/dev/null 2>&1; then
  docker run -d --name "$NAME" --restart unless-stopped \
    -e POSTGRES_USER=crossborder -e POSTGRES_PASSWORD=crossborder_local -e POSTGRES_DB=crossborder \
    -p 127.0.0.1:5433:5432 postgres:16-alpine
else
  docker start "$NAME" >/dev/null
fi
until docker exec "$NAME" pg_isready -U crossborder >/dev/null 2>&1; do sleep 1; done

[ -f backend/.env ] || printf 'DATABASE_URL=%s\nPORT=4000\nALLOWED_ORIGINS=http://localhost:3000\nNODE_ENV=development\n' "$DB" > backend/.env
[ -f .env ] || printf 'BACKEND_API_URL=http://localhost:4000\nDATABASE_URL=%s\n' "$DB" > .env

npm install
DATABASE_URL="$DB" npx prisma migrate deploy --schema prisma/schema.prisma
DATABASE_URL="$DB" ALLOW_REFERENCE_SEED=true npm run seed:references
echo "Ready. Run: npm run dev   and   npm run dev:backend"
