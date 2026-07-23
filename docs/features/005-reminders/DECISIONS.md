# 005 — Reminders

## Motivation
The core feature: generate `Reminder` rows for opted-in patients, dispatch them via WAHA at scheduled times, and detect missed doses. Reminders only exist for patients who have consented (`opted_in`) and have active medications with `scheduleTimes`.

## No public API (internal only)
Reminders are generated and dispatched internally by BullMQ cron jobs. No CRUD endpoints for admins to manually create/delete reminders in MVP. The consumption log viewer (Phase 3 dashboard) reads `Reminder` statuses.

## Reminder lifecycle
```
pending → sent → confirmed  (patient took/skipped)
                → missed     (next dose fired, no consumption)
       → failed (WAHA send failed after max retries)
```

## BullMQ jobs

### 1. `reminder-seeder` — runs every 5 minutes
- Query all patients where `consentStatus == opted_in AND active == true`.
- For each patient, query active `Medication` rows.
- For each medication, for each `scheduleTime`, compute the next scheduled `DateTime` in UTC.
- Generate `Reminder(patientId, medicationId, scheduledAt=computed UTC, status=pending)` for the upcoming 24-hour window if it doesn't already exist (idempotent — `ON CONFLICT` on `(medicationId, scheduledAt)` or check before insert).
- One-time: when a patient newly opts in, the seeder catches them on the next cycle and backfills the current day's upcoming reminders (not past ones).

### 2. `reminder-dispatcher` — runs every 1 minute
- Query `Reminder` where `status=pending AND scheduledAt <= now()`.
- For each: render `TemplateMessage(key=reminder)` with patient + medication variables.
- Call `WahaService.sendButtons(chatId, header, body, footer, buttons)` (see `007-waha-client`).
- On success: mark `Reminder.status=sent`, set `sentAt=now()`, store `wahaMessageId`.
- On failure: increment retry counter; after 3 retries → `status=failed`. Create `OutboundMessage(status=failed, error=...)`.
- Retry: exponential backoff (1m, 5m, 15m) via BullMQ `attempts` + `backoff`.

### 3. `missed-marker` — runs every 1 minute
Per AGENTS.md missed rule:
- For each `Reminder` with `status=sent`:
  - Find the chronologically-next `Reminder` for the same `medicationId` (ordered by `scheduledAt ASC`).
  - If that next reminder's `scheduledAt <= now()` AND this `Reminder` has zero `ConsumptionLog` rows:
    - Mark this `Reminder.status = missed`.
    - Create `ConsumptionLog(patientId, medicationId, reminderId, status=missed, source=system_missed)`.
- If no next reminder exists (last dose of the day / once-daily med): do nothing — the next day's reminder will be the trigger.
- Edge: for patients with BDD (once-daily) med at `08:00`, the marker checks `scheduledAt <= now()` of the *next day's* 08:00 reminder. So the current day's 08:00 reminder gets marked missed when the next day's 08:00 reminder fires → ~24h window.

## Data model
- `Reminder(id, patientId → Patient, medicationId → Medication, scheduledAt DateTime, status(ReminderStatus) default pending, sentAt DateTime?, wahaMessageId String?)`
- Indexes: `(patientId, scheduledAt, status)`, `(medicationId, scheduledAt)`, `status`.
- `scheduledAt` is always UTC.

## Decisions
- **Timezone conversion** — reminder seeder takes `scheduleTimes` (a `HH:mm` WIB string), combines with current date, converts WIB → UTC using `Asia/Jakarta` timezone. Formula: `WIB = UTC+7`.
- **Idempotent seeder** — checks for existing `Reminder` with same `(medicationId, scheduledAt)` before inserting. If already exists (any status), skip.
- **Seeder window** — generates reminders for the upcoming 24 hours only. Not more (avoids flooding the queue on first run).
- **No manual remind (scheduler only)** — the cron `reminder-dispatcher` is the only automated sender. Admins do NOT create/edit/delete `Reminder` rows directly.
- **Manual "send now" (admin action)** — `POST /api/v1/reminders/send-now` with `{ patientMedicationId }` triggers an immediate one-off send. Gated by `ENABLE_MANUAL_REMINDER === "true"` (env). Rules:
  - Patient must be `consentStatus: opted_in`, else `400 Pasien belum opted_in`.
  - `reminder` template must exist, else `400`.
  - Sends via `WahaClientService.sendText` immediately (not queued).
  - On success: creates an `OutboundMessage(kind=reminder, status=sent)` **and** a `Reminder(status=sent, scheduledAt=now, manual=true)`. The patient's reply flows through the normal consumption webhook (reminder → `confirmed` + linked `ConsumptionLog`), so manual sends can be used to test the full response lifecycle.
  - On WAHA failure: creates `OutboundMessage(status=failed)`, returns `500`.
  - Does NOT reuse the scheduled `dispatchReminders()` path (which only sends pre-existing `pending` rows).
- **Manual reminders excluded from missed logic (test-only)** — `Reminder.manual=true` rows are for testing patient responses. The missed-marker treats them as fully decoupled: they are NEVER marked `missed` (an unanswered manual reminder stays `sent`), and they NEVER act as the "next-dose" trigger that marks a scheduled dose `missed`. Missed-marking applies only to scheduler-generated (`manual=false`) reminders.
- **Failed reminders** — stored as `status=failed` with error. No automatic re-enqueue (admin may notice in dashboard and contact patient manually). But outbound retry handles transient WAHA errors.

## Edge cases
- Patient opts in at 14:00 but has 08:00 schedule — no retroactive reminders for today's 08:00. Next reminder is tomorrow 08:00.
- WAHA down for 30 minutes — all pending reminders accumulate as `pending`. Dispatcher catches them when WAHA comes back (scheduledAt already passed). All fire at once (rate-limited? defer to post-MVP).
- Medication changed while reminder is `sent`: old reminder stays `sent`. New schedule generates new reminders on next seeder cycle. The `sent` reminder can still be confirmed by the patient (they're responding about the past dose).
- DST — Jakarta has no DST. Not a concern.
