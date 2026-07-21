# 008 — WhatsApp Session (QR Pairing)

## Motivation
The admin needs a way to pair the system's WhatsApp number (the sender) from within the admin dashboard, without exposing WAHA's own UI. This feature wraps WAHA's session APIs behind JWT-protected endpoints in the NestJS API.

## API contract (all behind JwtAuthGuard)

### `POST /api/v1/whatsapp/session/start`
Proxies to WAHA `POST /api/sessions/{session}/start` (creates session if not exists).
Response `200`:
```json
{
  "code": 200,
  "message": "Session started",
  "data": null
}
```
Side-effect: WAHA transitions from `STOPPED` → `STARTING` → `SCAN_QR_CODE`. The `session.status` webhook catches these transitions and updates Redis.

### `POST /api/v1/whatsapp/session/stop`
Proxies to WAHA `POST /api/sessions/{session}/stop`.
Response `200`.

### `GET /api/v1/whatsapp/session/status`
Reads from Redis `waha:session:status` (set by `006-consumption` webhook handler on `session.status` events).
Response `200`:
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "status": "SCAN_QR_CODE",
    "number": null
  }
}
```
When `WORKING`:
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "status": "WORKING",
    "number": "6281234567890"
  }
}
```

### `GET /api/v1/whatsapp/session/qr`
Proxies to WAHA `GET /api/{session}/auth/qr?format=image`. Returns `image/png` with `Content-Type: image/png`.
Dashboard renders: `<img src="/api/v1/whatsapp/session/qr?t={Date.now()}">` (cache-bust query param to force refresh on QRhange).

If WAHA returns 404 (QR not available — session not in SCAN_QR_CODE): return `404` with message "QR code belum tersedia. Silakan mulai session terlebih dahulu."

## Dashboard behavior (`/whatsapp` page)
On mount:
1. Fetch `GET /api/v1/whatsapp/session/status`.
2. Poll every 3 seconds while status is `STARTING` or `SCAN_QR_CODE`.
3. Stop polling when status is `WORKING` or `FAILED` or page unmounts.
4. When status == `SCAN_QR_CODE`: show `<img>` pointing to QR endpoint, with a "Refresh QR" button.
5. When status == `WORKING`: show connected number + green badge + "Stop Session" button.
6. When status == `STOPPED`: show "Start Session" button + instruction text.
7. When status == `FAILED`: red badge, "Restart Session" button.

QR auto-refresh: the `<img>` refreshes via a timer every 25s (between WAHA QR expiry windows — first QR 60s, subsequent 20s, max 6). Manual refresh button available.

## Data flow
```
Admin clicks "Start" → POST /whatsapp/session/start → WAHA starts → WAHA fires session.status webhook
→ POST /webhooks/waha (event: session.status) → store in Redis waha:session:status
→ Dashboard polls GET /whatsapp/session/status → reads Redis → renders UI
```

## Decisions
- **Fixed session name `"default"`** — single sender number for the puskesmas. `WAHA_SESSION_NAME=default` in env.
- **QR as PNG proxy, not base64** — `GET /qr` returns `image/png`. Dashboard uses `<img src>`. This is the simplest integration; no JSON wrapping, no encoding overhead.
- **Status stored in Redis, not DB** — session status is ephemeral runtime state. No need for a `WahaSession` table. If Redis restarts, the status repopulates when next `session.status` event fires (WAHA continues working even if Redis is down — the dashboard just shows "Unknown" temporarily).
- **Polling, not SSE/WebSocket** — session pairing is a rare operation (first-time setup + occasional re-pair), not a real-time dashboard. Polling every 3s is acceptable. No extra SSE server complexity.
- **No multi-session for MVP** — single `default` session. If multiple admins need separate sender numbers, that's post-MVP.
- **QR expires after 60s (first) / 20s (subsequent) / max 6** — per WAHA docs. Dashboard should show a countdown or just auto-refresh + manual refresh.

## Edge cases
- WAHA is down when admin clicks Start: error message "Tidak dapat terhubung ke WAHA. Pastikan layanan WAHA berjalan."
- QR expired before admin scans: `GET /qr` from WAHA returns 404 — dashboard shows "QR expired, click Refresh."
- Max QR retries (6): WAHA transitions to `FAILED` — dashboard shows "Session gagal. Restart dan coba lagi."
- Phone unlinks device from WhatsApp app: WAHA fires `session.status = FAILED`. Redis updates. Dashboard shows `FAILED`. Admin clicks "Start" to re-pair (`.sessions` volume restores if re-linked to same number; new QR if different number).
- Docker restart: WAHA picks up existing `.sessions` volume → status goes directly to `WORKING` (no re-scan needed). Dashboard shows "Connected" without re-pairing.
