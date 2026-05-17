# Railway: API не отвечает (502) — пошаговый план

Если видите **Application failed to respond** на  
`https://meetinghub-api-production.up.railway.app/health` — **сначала чиним API**, потом вход на сайте.

---

## Шаг 0. Проверка (30 секунд)

Откройте в браузере:

`https://meetinghub-api-production.up.railway.app/health`

- **502 / Application failed to respond** → API не запущен (этот документ).
- **JSON `{"status":"ok"...}`** → API жив, проблема во фронте/CORS (см. RAILWAY.md).

---

## Шаг 1. MeetingHub-API — Variables

Удалите переменные с `localhost`.

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | **Reference** → Postgres (не вставляйте вручную localhost) |
| `JWT_SECRET` | Любая длинная строка, **не** `replace-with-long-random-string` |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://meetinghub-web-production.up.railway.app` |

**Не добавляйте** `PORT=4000` — Railway сам задаёт `PORT`.

---

## Шаг 2. MeetingHub-API — Settings

| Раздел | Значение |
|--------|----------|
| Source → Root Directory | `backend` |
| Build → Dockerfile path | `Dockerfile` (не `/backend/Dockerfile`) |
| Build → Builder | Dockerfile **или** Nixpacks (см. ниже) |
| Deploy → Healthcheck Path | `/health` |
| Deploy → Healthcheck Timeout | `600` |
| Networking | Уберите жёсткий порт 4000, если можно — пусть Railway подставит `PORT` |

---

## Шаг 3. Git push + Redeploy

```bash
git add -A
git commit -m "fix: railway debian docker and resilient start"
git push
```

Railway → **MeetingHub-API** → **Redeploy** → включите **Clear build cache**.

---

## Шаг 4. Deploy Logs (обязательно)

Откройте **Deployments** → последний деплой → **Deploy Logs** (не Build).

Должно быть в конце:

```text
[railway-start] Старт HTTP-сервера NestJS...
```

Если видите `FATAL` — скопируйте 30 строк и исправьте по тексту.

---

## Шаг 5. Если Docker снова ломается — Nixpacks

1. API → Settings → Build → **Builder: Nixpacks** (вместо Dockerfile).
2. Root Directory всё ещё `backend`.
3. Redeploy.

В репозитории есть `backend/nixpacks.toml` для этого режима.

---

## Шаг 6. Web (после зелёного /health)

| Переменная | Значение |
|------------|----------|
| `API_PUBLIC_URL` | `https://meetinghub-api-production.up.railway.app` |

Redeploy **MeetingHub-Web**.

На форме входа: `API: https://meetinghub-api-production...`

Вход: `admin@coworking.local` / `Admin123!`

---

## Частые ошибки

1. Код не запушен в GitHub — Railway собирает старую версию.
2. `DATABASE_URL` с `localhost` в Variables API.
3. Dockerfile path `/backend/Dockerfile` при Root `backend`.
4. Смотрите Build Logs, а нужны **Deploy Logs**.
