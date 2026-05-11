# Сервис бронирования переговорных коворкинга (`MeetingHub`)

Клиент-серверное приложение для учебного курса «Проектирование и разработка клиент-серверных приложений»: полный REST API на NestJS, SPA на React/Vite с RBAC и контейнеризацией через Docker Compose.

## Стек

| Слой        | Технологии |
| ----------- | ----------- |
| Клиент      | React 19, React Router 7, Vite 8, Axios |
| Сервер      | NestJS 10, Prisma 6, PostgreSQL |
| Безопасность| JWT (`Authorization: Bearer`), глобальная валидация DTO (`class-validator`) |
| DevOps      | Docker, docker-compose, Nginx как reverse-proxy для SPA |
| QA          | Jest, Supertest-поддержка конфигурируема отдельно, property-based fuzz (`fast-check`) |

## Структура монорепозитория

```
backend/        — NestJS + Prisma, модульное разбиение домена
frontend/       — SPA, прокси в dev режиме
docker-compose.yml
docs/           — аналитика и проектирование (IDEF0, UML, ER, архитектура)
```

## Бизнес-сценарии

1. Анонимный пользователь может зарегистрироваться (роль всегда `USER`, эскалация прав невозможна из API).
2. Пользователь с ролью `USER` управляет только своими бронированиями, не может бронировать в прошлом и не может пересекаться с уже подтверждёнными/ожидающими слотами.
3. Роли `MANAGER`/`ADMIN` видят журнал всех записей и могут подтверждать статусы, а также добавлять/редактировать комнаты.
4. Удалять комнаты может только `ADMIN` (демонстрация строго иерархической матрицы RBAC).

Подробнее о моделях см. ER в `docs/02-diagrams.md`.

## Быстрый старт локально

**Важно:** схема Prisma лежит в `backend/prisma/schema.prisma`. Если вы в корне `ПРКСП КР` и запускаете голый `npx prisma migrate deploy`, Prisma ищет `./prisma/` в текущей папке и выдаёт ошибку. Используйте либо `cd backend`, либо скрипты из корневого `package.json` ниже.

### 0. PostgreSQL (иначе `P1000: Authentication failed`)

Prisma читает `DATABASE_URL` из **`backend/.env`**. Ошибка **P1000** значит: по этому адресу сервер не принял логин/пароль, или Postgres не запущен.

**Рекомендуется для этого проекта** — контейнер PostgreSQL из `docker-compose.yml` (порт на хосте **`55432`**, логин/пароль совпадают с `backend/.env.example`).

Команды **`npm run prisma:migrate`** и **`npm run prisma:seed`** из **корня** репозитория сами выполняют `docker compose up -d db` и ждут готовности БД (`scripts/ensure-postgres.sh`). Нужен установленный **Docker Desktop** (или иной Docker с `docker compose`).

Вручную поднять только БД: `npm run db:up` или  
`COMPOSE_PROJECT_NAME=meetinghub docker compose up -d db` (нужно, если папка проекта с кириллицей/пробелами и Compose ругается на пустое имя проекта).

После `cp backend/.env.example backend/.env` строка `DATABASE_URL` с портом **55432** должна совпадать с compose.

Если вы **не** используете compose, а свой Postgres на `localhost:5432` — отредактируйте `DATABASE_URL` под свои учётные данные и убедитесь, что база `coworking` создана (`CREATE DATABASE coworking;`).

### Вариант A — всё из корня репозитория

```bash
cp backend/.env.example backend/.env   # при необходимости поправьте JWT_SECRET
npm run install:all                    # зависимости backend + frontend
npm run prisma:migrate                 # поднимет Postgres в Docker (если нужно) и выполнит migrate deploy
npm run prisma:seed
npm run backend:dev                    # API :4000 (в другом терминале)
npm run frontend:dev                   # SPA :5173
```

### Вариант B — только каталог `backend/`

Сначала поднимите Postgres (шаг **0**), из корня репозитория: `docker compose up -d db`.

```bash
cd backend
cp .env.example .env               # DATABASE_URL должен совпадать с запущенной БД
npm install
npm run prisma:migrate             # не используйте голый npx prisma из корня
npm run prisma:seed                # аккаунты admin/manager/user + комнаты
npm run start:dev                  # REST слушает :4000
```

### 2. Фронтенд с hot-reload

```bash
cd frontend
npm install
npm run dev                        # SPA :5173, прокси /auth,/users,/rooms,/bookings,/health на :4000
```

Откройте `http://localhost:5173`, выполните вход seed-пользователями или зарегистрируйте нового USER.

Сид-сущности почты и пароли (см. также форму входа):

| Роль | Email | Пароль |
| ---- | ----- | ------ |
| `ADMIN` | `admin@coworking.local` | `Admin123!` |
| `MANAGER` | `manager@coworking.local` | `Manager123!` |
| `USER` | `user@coworking.local` | `User123!` |

## Docker Compose (полный стенд)

```bash
docker compose up --build
```

- SPA + прокси: `http://localhost:8080` (Nginx направляет API-эндойнты к контейнеру `api`).
- Прямой REST (для Postman/Swagger альтернативы): `http://localhost:4000`.

Compose поднимает `postgres`, `api`, `ui`. После успешной миграции автоматически выполняется `prisma db seed`.

## Тестирование (фазы)

Из каталога `backend`:

```bash
npm run test           # модульные + интеграционные точечные заглушки
npm run test:phase     # фаза без fuzz/e2e-файлов
npm run test:fuzz      # property-based fuzz BookingsService
npm run test:cov       # Jest coverage (все метрики 100%, модульные *.module.ts исключены)
```

## Документы и диаграммы

В каталоге `docs/` находятся текстовые артефакты уровня ВКР: анализ предметной области, диаграммы IDEF0/UML/ER, описание клиент-серверной архитектуры и презентационный текст слайдов.

Презентационный текст: `docs/PRESENTATION.md` (структурирован блоками как слайды).

## Публикация в облако

Подойдёт любая связка контейнер + управляемая PostgreSQL:

1. Создайте БД Postgres (Neon / Supabase / RDS / RDS Proxy).
2. Пробросьте переменную `DATABASE_URL` и секретный `JWT_SECRET`.
3. Соберите образы из `./backend/Dockerfile` и `./frontend/Dockerfile`.
4. В runtime обеспечьте `migrate deploy && prisma db seed` (уже включено в `backend/Dockerfile`).
5. Вынесите Nginx конфигурацию (`frontend/nginx.conf`) на ingress балансировщика или Cloudflare Tunnel.

При использовании PaaS (Railway/Fly/Heroku) подключите два сервиса: база данных + приложение Nest, а SPA хостируйте на статическом CDN с прокси к API.

### Поддержка активного GitHub

- Делите работу атомарными коммитами (пример уже сгенерирован в истории: отдельный коммит на модуль домена → тесты → фронтенд → DevOps → документы).
- Регулярно пушите `main`, не указывайте реальные секреты (`JWT_SECRET`) в коде или compose для прод-среды — используйте менеджер секретов.

## Лицензия учебная

Используется исключительно в рамках курсовой/проекта. Коммерческая эксплуатация не предполагается без доработок безопасности (rate limiting, refresh-токены, аудит журналирования запросов и т.д.).
