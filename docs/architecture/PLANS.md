# Plans

- Build a modular monolith: one NestJS API service and one PostgreSQL database.
- Start with API, config, database connection, migrations, auth, and template messages foundations.
- Use feature-based NestJS modules so each domain owns its controller, service, repository, DTOs.
- Implement Core MVP domains incrementally: auth, patients, medications, reminders, consumption, templates, waha-webhook.
- BullMQ workers run inside the API process for MVP.

# Proposed Runtime Flow

- NestJS receives HTTP request or WAHA webhook.
- Auth guard validates JWT for admin endpoints.
- Webhook guard validates WAHA session for `/webhooks/waha`.
- Controller parses and validates request DTOs.
- Service applies business rules.
- Repository queries PostgreSQL via Prisma.
- Reminders dispatched via BullMQ cron, sent via WAHA `sendButtons`.

# Proposed Package Shape

```text
apps/api/src/
  app.module.ts
  auth/
  admin/
  patients/
  medications/
  reminders/
  consumption/
  templates/
  waha-webhook/
  waha-client/
  queue/
packages/prisma/
  schema.prisma
  migrations/
packages/shared/
  dto/
  enums/
  template-renderer/
```

# Stack Direction

- HTTP framework: NestJS.
- ORM: Prisma.
- Queue: BullMQ with Redis.
- Auth: JWT (1h access + 7d refresh in httpOnly cookie).
- WhatsApp: WAHA `devlikeapro/waha` Docker image.
- Admin dashboard: React + Vite + TanStack Query + shadcn/ui.
