## IDEF0: контекст и декомпозиция процесса

> Примечание: чистые IDEF0-листы обычно оформляются в узкоспециализированном ПО (`Camunda Modeler extensions`, BPWin). Здесь зафиксирована логическая структура в виде текстовых уровней + мнемоническая диаграмма `Mermaid`.

### Контур A-0 («Управлять ресурсами переговорных»)

| Контуры | Артефакты |
| -------- | --------- |
| **Входы** | Запрос клиента SPA, авторизационные данные JWT, параметры времени |
| **Управление** | Правила безопасности RBAC, схема БД Postgres, SLA бизнес-домена |
| **Механизмы** | NestJS API, фронтенд React/Vite, Prisma ORM, Docker |
| **Выходы** | Персистентное состояние бронирований, подтверждённые временные интервалы, аудируемые HTTP-ответы |

```mermaid
flowchart LR
  subgraph INPUTS["Входы"]
    SPA[Клиент SPA]
    JWT[JWT Bearer]
    TIME[(Временная сетка)]
  end

  subgraph CONTROL["Управление"]
    RBAC[Roles & Policies]
    SLA[Conflict rules]
    PRISMA[Constraints Prisma/SQL]
  end

  subgraph MECH["Механизмы"]
    API[Nest Controller/Service Layer]
    ORM[(Prisma + Postgres)]
  end

  subgraph OUTPUT["Выходы"]
    ROOMS[(Справочник комнат)]
    BOOKINGS[(Журнал бронирований)]
    AUDIT[HTTP журнал]
  end

  SPA --> API
  JWT --> API
  TIME --> API
  RBAC --> API
  SLA --> API
  PRISMA --> ORM
  API --> ORM
  API --> ROOMS
  API --> BOOKINGS
  API --> AUDIT
```

### Декомпозиция A1 («Оформление брони» → «Конфликт-чек», «Подтверждение статусов»)

1. **Приём интервала** — валидация DTO (`class-validator`) + авторизационный фильтр.
2. **Проверка пересечений** — поиск активных конфликтующих бронирований того же ресурса.
3. **Создание/обновление** — сохранение в транзакции Prisma без ручного SQL.
4. **Модификации статуса** — ограниченные методами PATCH и подтверждением только для управляющих ролей.

## UML: прецеденты (Use Case)

```mermaid
flowchart TB
  actorGuest((Гость))
  actorUser((USER))
  actorMan((MANAGER))
  actorAdm((ADMIN))

  subgraph System[MeetingHub]
    ucRegister[Зарегистрироваться]
    ucLogin[Авторизоваться JWT]
    ucBook[Создать бронь]
    ucCancel[Отменить бронь]
    ucViewRooms[Просмотр комнат]
    ucMaintain[Управление комнатами]
    ucConfirm[Подтвердить статус]
    ucDeleteRoom[Удалить комнату]
  end

  actorGuest --> ucRegister & ucLogin
  actorUser --> ucBook & ucCancel & ucViewRooms & ucLogin & ucRegister
  actorMan --> ucMaintain & ucConfirm & ucViewRooms & ucCancel & ucBook & ucLogin
  actorAdm --> ucDeleteRoom & ucMaintain & ucConfirm & ucViewRooms & ucCancel & ucBook & ucLogin
```

### Диаграмма последовательности POST `/bookings`

```mermaid
sequenceDiagram
  participant SPA as SPA (React)
  participant API as AuthGuard + Roles
  participant SRV as BookingService
  participant DB as Prisma/PostgreSQL

  SPA->>API: Bearer JWT + DTO времени
  API->>API: JwtStrategy.validate против БД
  API->>SRV: create(dto,user)
  SRV->>SRV: assertValidInterval
  SRV->>DB: найти активные конфликты
  DB-->>SRV: null / конфликт
  alt нет конфликта
    SRV->>DB: prisma.booking.create
    DB-->>SPA: 201 + объект
  else конфликт
    SPA-->>SRV: 409 Conflict JSON
  end
```

### Диаграмма состояний `Booking`

```mermaid
stateDiagram-v2
  [*] --> PENDING : POST /bookings
  PENDING --> CONFIRMED : MANAGER PATCH /confirm
  PENDING --> CANCELLED : DELETE /cancel
  CONFIRMED --> CANCELLED : DELETE MANAGER или владельцем USER
```

## ER (логическая схема БД)

```mermaid
erDiagram
  USERS ||--o{ BOOKINGS : creates
  ROOMS ||--o{ BOOKINGS : hosts

  USERS {
    uuid id PK
    string email UK
    string passwordHash
    string fullName
    enum role "ADMIN/MANAGER/USER"
    datetime createdAt
  }

  ROOMS {
    uuid id PK
    string name
    int capacity
    string description
    string location
    bool isActive
    datetime createdAt
  }

  BOOKINGS {
    uuid id PK
    uuid userId FK
    uuid roomId FK
    datetime startAt
    datetime endAt
    enum status
    datetime createdAt
  }
```

## Архитектура приложения и развёртывание

```mermaid
flowchart TB
    subgraph CLIENT["Браузер"]
      SPA_INDEX[SPA (React+Vite сборка)]
      AXIOS[axios over HTTPS/local]
      SPA_INDEX --> AXIOS
    end

    subgraph EDGE["Ingress / nginx :80"]
      PROXY_reverse[Reverse-proxy]
    end

    subgraph API_CLUSTER["NestJS контейнер :4000"]
      MODULE_AUTH[AuthModule]
      MODULE_ROOMS[Roles + RoomsModule]
      MODULE_BOOK[BookingsModule]
      HEALTH[HealthModule]
    end

    subgraph DATA["PostgreSQL :5432"]
      PG[(Coworking DB)]
    end

    AXIOS -->|JSON over HTTP| PROXY_reverse
    PROXY_reverse --> SPA_INDEX
    PROXY_reverse -->|префиксы /rooms...| MODULE_AUTH & MODULE_ROOMS & MODULE_BOOK & HEALTH
    MODULE_AUTH & MODULE_ROOMS & MODULE_BOOK --> PG
```

### Физический стек Compose

Три процесса: `ui` (`nginx`), `api` (`node dist`), `db` (`postgres`). Nginx смешивает статические активы SPA и пробросает JSON к API-сервису внутренней Docker-сети.

Такое разделение демонстрирует «адаптированную» архитектуру: не абстрактный C4 контейнерный рисунок, а схема с реальными маршрутами и технологическими границами проекта.
