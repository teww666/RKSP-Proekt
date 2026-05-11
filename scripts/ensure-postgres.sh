#!/usr/bin/env sh
# Поднимает сервис db из docker-compose и ждёт готовности PostgreSQL (порт на хосте 55432).
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Совпадает с полем name в docker-compose.yml — обход ошибки «project name must not be empty»
# при путях вроде .../ПРКСП КР/ (кириллица, пробел).
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-meetinghub}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ensure-postgres: Docker не найден. Установите Docker Desktop и повторите, либо" >&2
  echo "запустите свой PostgreSQL и настройте DATABASE_URL в backend/.env" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1 && ! docker-compose version >/dev/null 2>&1; then
  echo "ensure-postgres: нужна команда «docker compose» (или docker-compose)." >&2
  exit 1
fi

DC="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  DC="docker-compose"
fi

echo "ensure-postgres: поднимаю контейнер db..."
$DC up -d db

echo "ensure-postgres: жду готовности Postgres..."
i=0
while [ "$i" -lt 90 ]; do
  if $DC exec -T db pg_isready -U postgres >/dev/null 2>&1; then
    echo "ensure-postgres: база доступна на localhost:55432"
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done

echo "ensure-postgres: таймаут ожидания Postgres. Смотрите логи: $DC logs db" >&2
exit 1
