# 003 — Medications

## Motivation
Admin assigns medications + dosing schedules per patient. Schedule times drive reminder generation. A patient can have multiple active medications (e.g., metformin + glibenclamide).

## API contract

### `POST /api/v1/medications/list` (paginated, POST per API convention)
Request:
```json
{
  "page": 1,
  "size": 10,
  "search": { "key": ["name"], "value": "metformin" },
  "sort": [{ "key": "createdAt", "direction": "DESC" }]
}
```
Whitelisted `search.key`: `name`. Whitelisted `sort.key`: `name`, `dosage`, `createdAt`.

### `POST /api/v1/medications`
Request:
```json
{
  "patientId": "...",
  "name": "Metformin",
  "dosage": "500mg",
  "unit": "tablet",
  "scheduleTimes": ["08:00", "20:00"]
}
```
Response `201` — medication object. Side-effect (async): if patient is `opted_in`, the reminder seeder picks this up on its next cron cycle and generates `Reminder` rows for the upcoming schedule window. The medication creation itself does NOT immediately generate reminders — the seeder cron handles that.

Errors:
- `400` — scheduleTimes empty, invalid time format (must be `HH:mm`), or duplicate times.
- `404` — patientId not found.

### `PATCH /api/v1/medications/:id`
Update `name`, `dosage`, `unit`, `scheduleTimes`, `active`.
Changing `scheduleTimes` deletes all `pending` `Reminder` rows for this medication and marks them `cancelled` (or introduces a `cancelled` status… actually simpler: **delete** them — the seeder will re-generate). Existing `sent`/`confirmed`/`missed` reminders are preserved.
Changing `active` from `false` → `true` triggers re-generation in the next seeder cycle. Changing `active=true→false` deletes all `pending` reminders.

### `GET /api/v1/medications/:id`
Returns medication object.

## Data model
- `Medication(id, patientId → Patient, name, dosage, unit, scheduleTimes String[], active default true, createdAt)`
- `scheduleTimes` is stored as a JSON string array (e.g. `["08:00","20:00"]`). Validated at create/update.
- Index: `patientId`.

## Decisions
- **Schedule format** — `HH:mm` in Asia/Jakarta. The reminder seeder converts these to UTC timestamps every day via `luxon` (or manual WIB→UTC conversion). Example: schedule time `08:00 WIB` on July 22 → stored as `2026-07-22T01:00:00Z`.
- **No per-day-of-week scheduling yet** — all schedule times fire every day. Day-of-week (e.g. Mon/Wed/Fri) deferred to post-MVP.
- **No medication stock tracking** — not in MVP scope.
- **Reminder generation is NOT triggered by medication create/update** — it's handled by the reminder seeder cron (see `005-reminders`). This avoids duplicate job enqueues and keeps state consistent.
- **Validate on create only** — when medication is created, validate that the patient exists and the schedule times format is `HH:mm`. No duplicate validation on existing schedule times within the same medication.

## Edge cases
- Empty `scheduleTimes`: `400` — "Minimal satu jadwal diperlukan."
- Patient inactive: still allow medication management (admin might want to update before re-activating).
- Multiple meds with overlapping times: allowed. Each med reminder fires independently.
- Changing schedule while reminders are `sent`: old pending reminders deleted; new ones will generate in the next seeder cycle.
