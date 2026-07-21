# 007 — WAHA Client (HTTP Service)

## Motivation
Abstraction layer for calling WAHA REST API. Handles `sendButtons`, session config, retries, and error logging. All other features depend on this to send messages.

## No public API — internal service only
This is a NestJS service (`WahaClientService`) used by:
- `002-patients` — sends opt-in enrollment message
- `005-reminders` — sends reminder dispatch
- `006-consumption` — sends acknowledgment / usage hint replies
- `008-whatsapp-session` — starts/stops session, gets QR, gets status

## Service interface

### `WahaClientService.sendButtons(chatId, header, body, footer, buttons)`
Calls `POST {WAHA_API_URL}/api/sendButtons` with body:
```json
{
  "session": "default",
  "chatId": "6281234567890@c.us",
  "header": "Pengingat Minum Obat",
  "body": "Halo Budi, saatnya minum obat...",
  "footer": "Balas dengan 'sudah' jika sudah minum",
  "buttons": [
    { "type": "reply", "text": "Sudah minum" },
    { "type": "reply", "text": "Belum" }
  ]
}
```
Returns: WAHA message ID.

### `WahaClientService.sendText(chatId, text)`
Calls `POST {WAHA_API_URL}/api/sendText` for plain text messages (acknowledgments, usage hints). Used when template has no buttons.

### `WahaClientService.getSessionStatus()`
Calls `GET {WAHA_API_URL}/api/sessions/default` — returns session status + linked device info.

### `WahaClientService.startSession()`
Calls `POST {WAHA_API_URL}/api/sessions/default/start`.

### `WahaClientService.stopSession()`
Calls `POST {WAHA_API_URL}/api/sessions/default/stop`.

### `WahaClientService.getQr(format: 'image' | 'base64')`
Calls `GET {WAHA_API_URL}/api/default/auth/qr?format=image` — returns raw PNG buffer (or base64 string).

## Configuration
- `WAHA_API_URL` — env var, defaults to `http://waha:3000` (compose internal).
- `WAHA_API_KEY` — env var, sent as `X-Api-Key` header on every request.
- `WAHA_SESSION_NAME` — env var, defaults to `default`.

All requests use an axios instance pre-configured with:
- `baseURL: WAHA_API_URL`
- `headers: { 'X-Api-Key': WAHA_API_KEY }`
- `timeout: 10000` (10s)

## Retry strategy
- `sendButtons` and `sendText`: 3 attempts via BullMQ (retries handled at the job level in `005-reminders`, not inside the HTTP call).
- `getSessionStatus` / `getQr`: no retry (called by the dashboard — if WAHA is down, the dashboard shows "Tidak dapat terhubung ke WAHA").
- Session lifecycle endpoints (start/stop): no retry (idempotent — admin can retry manually via dashboard).

## Data model
- `OutboundMessage(id, patientId → Patient, kind(OutboundKind), payload Json, wahaMessageId?, status(OutboundStatus) default pending, error?, createdAt)`
- `OutboundKind` enum: `opt_in`, `reminder`, `usage_hint`, `opt_in_confirm`.
- `payload` stores the full WAHA request body for debugging/replay.
- Index: `patientId`, `status`.

## Decisions
- **All WAHA communication goes through this service** — no direct axios call to WAHA from other services.
- **`chatId` format** — always `{waNumber}@c.us` (WAHA's WhatsApp web format). The `WahaClientService` accepts a `waNumber` (digits only) and appends `@c.us` internally.
- **Timeout** — 10s for all WAHA calls. If WAHA doesn't respond in 10s, it's considered down and the job retries.
- **Error handling** — WahaClientService throws typed errors (`WahaConnectionError`, `WahaSendError`, `WahaSessionError`). Callers (reminder dispatcher, webhook handler) catch and decide whether to retry or fail.
- **OutboundMessage logging** — every send attempt writes to `OutboundMessage` (status=pending before send, status=sent on success, status=failed on permanent failure). This doubles as a send audit trail for the dashboard.

## Edge cases
- WAHA returns `401` (bad API key): log critical, don't retry — key is misconfigured.
- WAHA returns `404` (session not found): session not started yet. Return `WahaSessionError`.
- WAHA returns `503` (WhatsApp Web is not ready): retry with backoff.
- WhatsApp rejects the send (blocked, invalid number): WAHA returns error → store in `OutboundMessage.error`, don't retry.
- Multiple concurrent sends to same patient: WAHA has internal rate limiting. Serializing is on the reminder dispatcher side (process one pending reminder per patient per cycle).
