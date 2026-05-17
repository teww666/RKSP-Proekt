#!/bin/sh
# Старт API на Railway: миграции с повторами, затем Nest на $PORT.
set -eu

log() { printf '[start] %s\n' "$*"; }

if [ ! -f dist/main.js ]; then
  log 'ОШИБКА: dist/main.js не найден — образ собран с неверным Docker context.'
  log 'Railway → MeetingHub-API → Settings → Root Directory = backend, Dockerfile = Dockerfile'
  log 'ИЛИ Dockerfile path = docker/Dockerfile.api (из корня репозитория).'
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  log 'ОШИБКА: переменная DATABASE_URL не задана.'
  log 'Railway → сервис MeetingHub-API → Variables → New Variable →'
  log '  Reference → Postgres → DATABASE_URL (или DATABASE_PRIVATE_URL)'
  exit 1
fi

# Railway Postgres: schema + SSL при необходимости
case "$DATABASE_URL" in
  *\?*) ;;
  *) export DATABASE_URL="${DATABASE_URL}?schema=public" ;;
esac
case "$DATABASE_URL" in
  *schema=*) ;;
  *) export DATABASE_URL="${DATABASE_URL}&schema=public" ;;
esac
case "$DATABASE_URL" in
  *sslmode=*|*postgres.railway.internal*|*railway.internal*) ;;
  *)
    if printf '%s' "$DATABASE_URL" | grep -q 'rlwy.net\|railway.app'; then
      export DATABASE_URL="${DATABASE_URL}&sslmode=require"
      log 'Добавлен sslmode=require к DATABASE_URL'
    fi
    ;;
esac

if [ "${JWT_SECRET:-}" = "replace-with-long-random-string" ] || [ -z "${JWT_SECRET:-}" ]; then
  log 'ПРЕДУПРЕЖДЕНИЕ: задайте надёжный JWT_SECRET в Variables (не значение из .env.example)'
fi

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
  set +e
  npx prisma db seed
  seed_code=$?
  set -e
  if [ "$seed_code" -ne 0 ]; then
    log "seed завершился с кодом $seed_code (аккаунты могут отсутствовать)"
  fi
fi

log 'Запуск NestJS...'
exec node dist/main.js
