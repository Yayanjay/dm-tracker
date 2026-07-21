# 002 — Patients

## Motivation
Admin creates and manages DM patients. Each patient is identified by WhatsApp number (unique). Patient must consent (opt-in) before receiving reminders. Opt-in flow is automatic on creation; re-send available on dashboard.

## API contract

### `POST /api/v1/patients/list` (paginated, POST per API convention)
Request:
```json
{
  "page": 1,
  "size": 10,
  "search": { "key": ["name", "waNumber"], "value": "budi" },
  "sort": [{ "key": "createdAt", "direction": "DESC" }]
}
```
Whitelisted `search.key`: `name`, `waNumber`. Whitelisted `sort.key`: `name`, `waNumber`, `createdAt`, `consentStatus`.

### `POST /api/v1/patients`
Request:
```json
{
  "name": "Budi Santoso",
  "waNumber": "6281234567890",
  "phone": "021123456",
  "dob": "1980-05-15"
}
```
Response `201` — patient object with `consentStatus: "pending"`.
Side-effect: enqueues opt-in message via QueueService. Creates `OutboundMessage(kind=opt_in)`.

Errors:
- `409` — waNumber already registered.
- `400` — waNumber format invalid (must start with country code, digits only).

### `GET /api/v1/patients/:id`
Returns full patient with nested `medications` (active only).

### `PATCH /api/v1/patients/:id`
Update `name`, `phone`, `dob`. `waNumber` and `consentStatus` are NOT updatable (immutable identity + consent is event-driven).

### `POST /api/v1/patients/:id/resend-optin`
Re-sends opt-in message if `consentStatus` is `pending` or `opted_out`. No-op if already `opted_in`. Returns error if patient not found.

## Data model
- `Patient(id, name, waNumber unique, phone?, dob?, consentStatus(ConsentStatus) default pending, consentAt?, active default true, createdAt, createdById → Admin)`
- Indexes: `consentStatus`, `active`.

## Decisions
- **waNumber is immutable identity** — no update allowed. If patient changes number, admin creates new patient record (old one marked `active=false`).
- **waNumber format** — digits only, must start with country code (e.g. `6281234567890`). Validate on create. Strip any `+`, `-`, spaces before storing.
- **Opt-in auto-trigger on create** — `POST /patients` returns immediately (201) and the opt-in message is sent asynchronously via BullMQ. If WAHA is down, the message retries; admin can also re-send manually from dashboard.
- **Consent is gating for all reminders** — `Reminder` rows are only seeded for patients with `consentStatus == opted_in`. Changing from `opted_in` to `opted_out` stops future seeder pickups but preserves existing `Reminder` rows.
- **Re-send opt-in** — just enqueues the same `enrollment` template message. Does not change consent status (patient must reply). Deduplication: don't send if already `opted_in` and the `already_opted_in` template is sent instead.
- **Soft-delete** — mark `active=false` instead of hard delete. Query helpers always filter `active=true` by default.

## Edge cases
- Duplicate waNumber: `409` on create.
- Patient has no medications yet → allowed. Opt-in can happen before medication assignment.
- Re-send opt-in when WAHA is down: job queues, retries via BullMQ backoff.
- Patient opts in but never gets reminders: check `consentStatus` + `Medication.active` + `Reminder` generation. The `already_opted_in` template replays on re-send.
