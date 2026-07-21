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
- [ ] `feature/001-auth` — admin login, JWT, guards
- [ ] `feature/008-whatsapp-session` — start/stop session, QR proxy, status
- [ ] `feature/007-waha-client` — WAHA HTTP client, sendButtons, retry
- [ ] `feature/004-templates` — template CRUD + renderer
- [ ] `feature/002-patients` — patient CRUD + opt-in auto-queue
- [ ] `feature/003-medications` — medication CRUD per patient
- [ ] `feature/005-reminders` — Reminder seeder, missed-marker job
- [ ] `feature/006-consumption` — WAHA webhook, button+keyword parse

## Phase 3: Admin Dashboard
- [ ] `/login` + auth flow
- [ ] `/whatsapp` — session pairing UI
- [ ] `/patients` — list, create, edit, re-send opt-in
- [ ] `/patients/:id/medications` — medication CRUD per patient
- [ ] `/templates` — template CRUD with live preview
- [ ] `/consumption` — filter + CSV export

## Phase 4: Deploy
- [ ] Cloudflare Tunnel setup runbook
- [ ] WAHA QR pairing (one-time)
- [ ] End-to-end smoke test
