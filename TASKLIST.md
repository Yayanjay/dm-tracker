# TASKLIST — dm-tracker

## Phase 0: Scaffold
- [x] Monorepo structure + pnpm workspaces
- [x] Docker Compose (postgres, redis, waha, api)
- [x] Prisma schema (full models) + seed
- [x] Shared package (enums, DTOs, template-renderer)
- [x] NestJS API skeleton (response envelope, prisma, auth)
- [x] React+Vite admin skeleton (shadcn/ui, tanstack query)
- [x] `pnpm install` + verify builds

## Phase 1: Feature Docs
- [x] `docs/features/001-auth/DECISIONS.md`
- [x] `docs/features/002-patients/DECISIONS.md`
- [x] `docs/features/003-medications/DECISIONS.md`
- [x] `docs/features/004-templates/DECISIONS.md`
- [x] `docs/features/005-reminders/DECISIONS.md`
- [x] `docs/features/006-consumption/DECISIONS.md`
- [x] `docs/features/007-waha-client/DECISIONS.md`
- [x] `docs/features/008-whatsapp-session/DECISIONS.md`

## Phase 2: Implementation
- [x] `feature/001-auth` — admin login, JWT, guards
- [x] `feature/008-whatsapp-session` — start/stop session, QR proxy, status
- [x] `feature/007-waha-client` — WAHA HTTP client, sendButtons, retry
- [x] `feature/004-templates` — template CRUD + renderer
- [x] `feature/002-patients` — patient CRUD + opt-in auto-queue
- [x] `feature/003-medications` — medication CRUD per patient
- [x] `feature/005-reminders` — Reminder seeder, missed-marker job
- [x] `feature/006-consumption` — WAHA webhook, button+keyword parse

## Phase 3: Admin Dashboard
- [x] `/login` + auth flow
- [x] `/whatsapp` — session pairing UI
- [x] `/patients` — list, create, edit, re-send opt-in
- [x] `/patients/:id/medications` — medication CRUD per patient
- [x] `/templates` — template CRUD with live preview
- [x] `/consumption` — filter + CSV export

## Phase 4: Deploy
- [ ] Cloudflare Tunnel setup runbook
- [ ] WAHA QR pairing (one-time)
- [ ] End-to-end smoke test
