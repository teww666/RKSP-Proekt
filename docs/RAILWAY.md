# Деплой MeetingHub на Railway

## Health check (API)

| Поле в Railway | Значение |
| -------------- | -------- |
| **Path** | `/health` |
| **Method** | `GET` |
| **Ожидаемый ответ** | `200`, тело: `{"status":"ok","service":"coworking-booking-api"}` |

Полный URL для проверки в браузере:

```text
https://<ваш-домен-api>.up.railway.app/health
```

Префикса `/api` нет — эндпоинт объявлен как `@Controller('health')` в NestJS.

---

## Архитектура на Railway (3 сервиса)

1. **Postgres** — плагин Railway PostgreSQL (у вас уже есть).
2. **MeetingHub-API** — корень репозитория: **`backend`**, Dockerfile.
3. **MeetingHub-Web** — корень: **`frontend`**, Dockerfile; API вызывается по публичному URL.

---

## Сервис 1: Postgres

1. В проекте Railway уже добавлен **Postgres**.
2. Откройте сервис Postgres → **Connect** / **Variables** — скопируйте **`DATABASE_URL`** (или `DATABASE_PRIVATE_URL` для связи внутри проекта).

---

## Сервис 2: MeetingHub-API

### Settings → Source

| Параметр | Значение |
| -------- | -------- |
| **Root Directory** | `backend` |
| **Builder** | Dockerfile |
| **Dockerfile path** | `Dockerfile` |

### Settings → Networking

- Сгенерируйте **публичный домен** (Generate Domain).
- **Healthcheck Path:** `/health`
- **Healthcheck Port:** оставьте порт, который задаёт Railway через `$PORT` (по умолчанию подхватится).

### Variables (обязательно)

| Переменная | Значение |
| ---------- | -------- |
| `DATABASE_URL` | Вставьте из Postgres (`${{Postgres.DATABASE_URL}}` в Railway или скопируйте вручную) |
| `JWT_SECRET` | Длинная случайная строка (не оставляйте demo) |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | URL фронта через запятую, например `https://meetinghub-web-production.up.railway.app` |

`PORT` Railway подставит сам — **не задавайте** `PORT=4000` вручную.

### Типичные причины Build failed

- **Root Directory** не `backend` (сборка идёт из корня монорепо).
- Нет связи **Postgres → API** (нет `DATABASE_URL` на этапе **Deploy**).
- Старый образ без `python3 make g++` для **bcrypt** — в актуальном `backend/Dockerfile` это исправлено.

### После деплоя

Проверьте: `https://<api-domain>/health` → JSON со `status: ok`.

---

## Сервис 3: MeetingHub-Web

### Settings → Source

| Параметр | Значение |
| -------- | -------- |
| **Root Directory** | `frontend` |
| **Builder** | Dockerfile |
| **Dockerfile path** | `Dockerfile` |

### Variables

| Переменная | Когда | Значение |
| ---------- | ----- | -------- |
| `VITE_API_URL` | **Build** (важно!) | `https://<ваш-api-domain>.up.railway.app` без слэша в конце |

В Railway: **Variables** → у `VITE_API_URL` включите **Available at Build Time** / **Build-time variable**.

`API_UPSTREAM` для Railway **не нужен** — браузер ходит напрямую на API по `VITE_API_URL`.

### Почему был Crash

1. Nginx слушал порт **80**, а Railway ждёт процесс на **`$PORT`** — исправлено в `docker-entrypoint.sh`.
2. Прокси на хост **`api:4000`** работает только в docker-compose, не между сервисами Railway.

### После деплоя

1. Обновите **`CORS_ORIGIN`** на API, добавив точный URL фронта.
2. Redeploy API, если меняли CORS.

---

## Порядок действий (чеклист)

1. Запушьте в GitHub последний код (с исправлениями Dockerfile / Railway).
2. **Postgres** — Online.
3. **API** — Root `backend`, переменные, Health `/health`, Deploy → проверить `/health`.
4. Скопировать публичный URL API.
5. **Web** — Root `frontend`, `VITE_API_URL` = URL API (build-time), Deploy.
6. Скопировать URL Web → в API `CORS_ORIGIN` → Redeploy API.
7. Открыть сайт, войти: `user@coworking.local` / `User123!` (после первого seed).

---

## Альтернатива без Docker на фронте

Root `frontend`, Builder **Nixpacks**:

- **Build Command:** `npm ci && npm run build`
- **Start Command:** `npx serve -s dist -p $PORT`
- **Build variable:** `VITE_API_URL=https://...`

API по-прежнему лучше через **Dockerfile** в `backend`.
