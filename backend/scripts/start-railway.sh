#!/bin/sh
# Надёжный старт для Railway: не падаем навсегда из-за seed, есть fallback db push.
set -e

log() { printf '[railway-start] %s\n' "$*"; }

if [ ! -f dist/main.js ]; then
  log 'FATAL: dist/main.js отсутствует — проверьте Root Directory=backend и Dockerfile=Dockerfile'
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  log 'FATAL: нет DATABASE_URL. API → Variables → Reference → Postgres → DATABASE_URL'
  exit 1
fi

# Нормализация URL для Prisma
normalize_db_url() {
  url="$1"
  case "$url" in
    *\?*) ;;
    *) url="${url}?schema=public" ;;
  esac
  case "$url" in
    *schema=*) ;;
    *) url="${url}&schema=public" ;;
  esac
  printf '%s' "$url"
}

export DATABASE_URL="$(normalize_db_url "$DATABASE_URL")"

if [ -z "${JWT_SECRET:-}" ] || [ "${JWT_SECRET}" = "replace-with-long-random-string" ]; then
  export JWT_SECRET="railway-runtime-$(printf '%s' "$DATABASE_URL" | cksum | awk '{print $1}')"
  log 'JWT_SECRET не задан — использован временный (замените в Variables на свой!)'
fi

export PORT="${PORT:-4000}"
log "PORT=$PORT NODE_ENV=${NODE_ENV:-production}"

log 'Синхронизация схемы БД...'
if npx prisma migrate deploy; then
  log 'migrate deploy OK'
else
  log 'migrate deploy не удался — пробую prisma db push'
  if ! npx prisma db push --accept-data-loss; then
    log 'WARN: схема БД не синхронизирована, API стартует — /health OK, логин может не работать'
  else
    log 'db push OK'
  fi
fi

if [ "${RUN_SEED:-true}" = "true" ]; then
  log 'Заполнение демо-данных (seed)...'
  npx prisma db seed || log 'WARN: seed не выполнен (см. Deploy Logs)'
fi

log 'Старт HTTP-сервера NestJS...'
exec node dist/main.js
