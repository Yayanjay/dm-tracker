# 006 — Consumption (WAHA Webhook + Parsing)

## Motivation
Patient reports medication consumption via WhatsApp — either by tapping a reply button on the reminder message or by sending free text. The system parses the reply, creates a `ConsumptionLog`, and updates the corresponding `Reminder`.

## API contract

### `POST /webhooks/waha` (public, no admin auth — validated by WAHA session)
This is registered on WAHA as the `message` webhook. The endpoint receives **two event types**:

#### Event type 1: `message` (incoming patient reply)
```json
{
  "event": "message",
  "session": "default",
  "payload": {
    "id": "waha-msg-123",
    "from": "6281234567890@c.us",
    "type": "button",
    "button": { "text": "Sudah minum" },
    "timestamp": 1721548800
  }
}
```
Or `type: "text"`:
```json
{
  "event": "message",
  "payload": {
    "from": "6281234567890@c.us",
    "type": "text",
    "body": "sudah"
  }
}
```

Processing:
1. Extract `waNumber` from `from` (strip `@c.us`).
2. Look up `Patient` by `waNumber`. If not found → `404`, no reply.
3. If `Patient.consentStatus != opted_in` → reply with `TemplateMessage(enrollment)` to guide opt-in, stop.
4. Find the most recent `Reminder` for this patient with `status=sent`, ordered by `scheduledAt DESC` (the one they're most likely replying to).
5. Parse the consumption:
   - **Button reply**: `button.text == "Sudah minum"` → `taken`. `"Belum"` → `skipped`.
   - **Free text**: case-insensitive regex match:
     - `sudah|selesai|udah|minum` → `taken`
     - `belum|lewati|skip` → `skipped`
     - else → reply with `TemplateMessage(usage_hint)`, no ConsumptionLog created.
6. If `taken` or `skipped`:
   - Create `ConsumptionLog(patientId, medicationId=reminder.medicationId, reminderId, status, source=button|free_text, rawText=freeText?)`
   - Mark `Reminder.status = confirmed`.
   - Reply with acknowledgment: "Tercatat. Terima kasih." (or a template-based message in post-MVP).
7. If no `sent` reminder found (patient replies late, or all reminders already confirmed):
   - Create `ConsumptionLog` without `reminderId` — log it as status based on parse.
   - Reply: "Tercatat. Tidak ada pengingat aktif saat ini."

#### Event type 2: `session.status` (WAHA session state change)
```json
{
  "event": "session.status",
  "session": "default",
  "payload": { "status": "WORKING" }
}
```
Processing:
- Store latest session status in Redis key `waha:session:status` (string value: `STOPPED|STARTING|SCAN_QR_CODE|WORKING|FAILED`).
- If `status == WORKING`, also fetch and cache the connected phone number from WAHA API if available → Redis `waha:session:number`.
- See `008-whatsapp-session` for the dashboard-side consumer of this status.

### `POST /api/v1/consumption/list` (admin, paginated)
Request: standard pagination body. Additional filters handled via `search` mechanism or separate query params. Whitelisted `search.key`: `patientName`, `medicationName`. Whitelisted `sort.key`: `reportedAt`, `status`.

CSV export: `POST /api/v1/consumption/export` with same filter body, returns `text/csv` with headers: `Tanggal, Nama Pasien, WA Number, Nama Obat, Status, Sumber`.

## Data model
- `ConsumptionLog(id, patientId → Patient, medicationId → Medication, reminderId? → Reminder, status(ConsumptionStatus), source(ConsumptionSource), rawText?, reportedAt default now())`
- Indexes: `patientId`, `medicationId`, `reminderId`.

## Decisions
- **Keyword parsing is case-insensitive, exact word match** — no fuzzy, no stemmer, no AI. Simple regex `/sudah|selesai|udah|minum/i`.
- **Patient can reply to any message, not just the reminder** — if they send "sudah" out of context, it creates a `ConsumptionLog` tied to the most recent `sent` reminder (heuristic). If none found, log without reminderId.
- **One ConsumptionLog per reply** — even if patient replies twice to the same reminder, we create a second log (don't deduplicate — traceability over perfection).
- **No threaded reply support** — WAHA's `message.type` doesn't include reply-to metadata in the MVP setup.
- **Webhook is NOT validated by JWT** — it's public. Security relies on: (a) WAHA sends to the tunnel URL which is authenticated by Cloudflare Zero Trust (optional), (b) the webhook only processes `from` numbers that exist in the DB. No auth header check on webhook itself.
- **Acknowledgment message** — simple static text for MVP. Template-based acknowledgments deferred.
- **Consumption list endpoint uses POST** — per API conventions. Admin dashboard filters by `patientId` or `search.value` across patient name + medication name.

## Edge cases
- Patient sends gibberish: parse fails → reply `usage_hint` template.
- Patient sends "sudah" at 3am (no active reminder): still logs consumption (no reminderId), replies acknowledgment.
- WAHA webhook fires twice for same message: duplicate `ConsumptionLog` created (acceptable — lower complexity than dedup).
- Patient has 2 active meds, replies "sudah": only the most recent `sent` Reminder is confirmed. The other stays `sent` until next reply or missed marker.
- Webhook payload is malformed: `400` + log error, no reply to patient.
