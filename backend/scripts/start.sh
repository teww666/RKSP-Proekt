#!/bin/sh
# Старт API на Railway: миграции с повторами, затем Nest на $PORT.
set -eu

log() { printf '[start] %s\n' "$*"; }

if [ -z "${DATABASE_URL:-}" ]; then
  log 'ОШИБКА: переменная DATABASE_URL не задана.'
  log 'Railway → сервис MeetingHub-API → Variables → New Variable →'
  log '  Reference → Postgres → DATABASE_URL (или DATABASE_PRIVATE_URL)'
  exit 1
fi

# Публичный хост Railway Postgres часто требует SSL
case "$DATABASE_URL" in
  *sslmode=*|*postgres.railway.internal*|*railway.internal*) ;;
  *)
    if printf '%s' "$DATABASE_URL" | grep -q 'rlwy.net\|railway.app'; then
      if printf '%s' "$DATABASE_URL" | grep -q '?'; then
        export DATABASE_URL="${DATABASE_URL}&sslmode=require"
      else
        export DATABASE_URL="${DATABASE_URL}?sslmode=require"
      fi
      log 'Добавлен sslmode=require к DATABASE_URL для публичного хоста Railway'
    fi
    ;;
esac

log "PORT=${PORT:-4000}"
log 'Применяю миграции Prisma...'

attempt=1
while [ "$attempt" -le 15 ]; do
  if npx prisma migrate deploy; then
    log 'Миграции применены.'
    break
  fi
  log "migrate deploy попытка ${attempt}/15 не удалась, жду 4 с..."
  attempt=$((attempt + 1))
  sleep 4
  if [ "$attempt" -gt 15 ]; then
    log 'ОШИБКА: не удалось выполнить prisma migrate deploy. Проверьте DATABASE_URL и что Postgres Online.'
    exit 1
  fi
done

if [ "${RUN_SEED:-true}" = 'true' ]; then
  log 'Сид демо-данных (ошибки игнорируются)...'
  npx prisma db seed || log 'seed пропущен или уже выполнен'
fi

log 'Запуск NestJS...'
exec node dist/main.js
