# 004 — Template Messages

## Motivation
Admins can customize the WhatsApp message templates used by the system (enrollment, reminder, opt-in confirmation, usage hints). Templates support `{{variable}}` placeholders rendered at send time.

## API contract

### `POST /api/v1/templates/list` (paginated, POST per API convention)
Request:
```json
{
  "page": 1,
  "size": 10,
  "search": { "key": ["title"], "value": "pengingat" },
  "sort": [{ "key": "updatedAt", "direction": "DESC" }]
}
```
Whitelisted `search.key`: `title`, `key`, `type`. Whitelisted `sort.key`: `key`, `title`, `type`, `updatedAt`.

### `GET /api/v1/templates/:key`
Returns single template by `key`.

### `PATCH /api/v1/templates/:key`
Request:
```json
{
  "title": "Pengingat Minum Obat",
  "body": "Halo {{name}},\n\nSaatnya minum obat {{medication_name}} dosis {{dosage}} {{unit}}.",
  "buttonLabels": ["Sudah minum", "Belum"]
}
```
Response `200` — updated template. After update, future sends use new template body. `type` and `key` are immutable.

### `POST /api/v1/templates/preview`
Request:
```json
{
  "key": "reminder",
  "variables": { "name": "Budi", "medication_name": "Metformin", "dosage": "500mg", "unit": "tablet" }
}
```
Response `200`:
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "title": "Pengingat Minum Obat",
    "body": "Halo Budi,\n\nSaatnya minum obat Metformin dosis 500mg tablet.",
    "buttonLabels": ["Sudah minum", "Belum"]
  }
}
```
Uses `packages/shared/template-renderer/renderTemplate()` with the provided variables.

## Data model
- `TemplateMessage(id, type(TemplateType), key unique, title, body, buttonLabels String[] default [], updatedAt)`
- `key` is the lookup identifier (e.g. `enrollment`, `reminder`, `optin_confirm`, `usage_hint`).
- `type` enum: `enrollment`, `reminder`, `optin_confirm`, `usage_hint`, `already_opted_in`.
- Seed creates all 5 default templates (see `packages/prisma/seed.ts`).

## Decisions
- **`key` is the stable identifier, not `id`** — endpoints use `/templates/:key`. `key` is immutable.
- **Template type is immutable** — changing `enrollment` to `reminder` would break expected behavior in opt-in flow. Delete + recreate is fine but not MVP.
- **buttonLabels is a flat string array** — no per-button callbacks, no conditional buttons. Simple `["Label 1", "Label 2"]`.
- **Renderer lives in `packages/shared`** — both API (for sending) and web dashboard (for preview) use the same `renderTemplate()` function. Variables are simple `{{...}}` replacement, no logic.
- **Preview endpoint uses POST** — variables can be arbitrary JSON object; `POST` is appropriate.
- **No template version history** — MVP just updates in-place. If audit trail is needed later, add a `TemplateRevision` table.
- **Template body support** — plain text with `\n` for line breaks. No Markdown, no HTML, no rich formatting for MVP. Emoji allowed but not encouraged for medical context.

## Available variables (per template type)
| Template | Variables |
|---|---|
| `enrollment` | `{{name}}` |
| `reminder` | `{{name}}`, `{{medication_name}}`, `{{dosage}}`, `{{unit}}` |
| `optin_confirm` | `{{name}}` |
| `usage_hint` | none |
| `already_opted_in` | `{{name}}` |

## Edge cases
- Template key not found: `404`.
- Button labels empty array: allowed (plain text message, no interactive buttons).
- Variable in template has no corresponding value: leave `{{key}}` as-is (don't crash).
