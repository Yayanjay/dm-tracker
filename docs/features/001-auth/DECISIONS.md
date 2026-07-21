# 001 — Admin Auth

## Motivation
Admin puskesmas needs to access the dashboard. Single admin for MVP, but the schema and module are typed for future multi-admin with roles.

## API contract

### `POST /api/v1/auth/login`
Request:
```json
{
  "email": "admin@puskesmas.local",
  "password": "admin123"
}
```
Response `200`:
```json
{
  "code": 200,
  "message": "Login berhasil",
  "data": {
    "accessToken": "eyJ...",
    "admin": { "id": "...", "email": "...", "name": "...", "role": "superadmin" }
  }
}
```
Errors: `401` — Email atau password salah.

## Data model
- `Admin(id, email unique, passwordHash, name, role(AdminRole), createdAt)`
- Initial admin seeded via `prisma/seed.ts` with bcrypt-hashed default password.
- `AdminRole` enum: `superadmin` only for MVP.

## Decisions
- **JWT only, no refresh token in MVP** — access token stored in localStorage on the dashboard, sent via `Authorization: Bearer <token>` header. If the token expires (1h default), the dashboard redirects to `/login`. Refresh tokens (`7d httpOnly cookie`) deferred to post-MVP.
- **Email + password login** — no username, no OAuth, no 2FA. Email is unique identifier.
- **Passport JWT strategy** — extracts token from `Authorization: Bearer`, validates against `JWT_SECRET`, populates `request.admin` with `{id, email, role}`.
- **JwtAuthGuard** — uses `@nestjs/jwt` + Passport. Throws `401` on missing/invalid/expired token.
- **Password policy** — none for MVP (any password accepted). Hashing only via bcrypt (10 rounds).
- **Single admin** — seed creates one admin. No `POST /admin` registration endpoint in MVP. Future: admin CRUD when multi-admin is needed.

## Edge cases
- Login with wrong email: `401` — "Email atau password salah" (same message for both to avoid enumeration).
- Token expiry: dashboard `axios` interceptor catches `401` → clear localStorage → redirect `/login`.
- Server restart invalidates JWT only if secret changes — no token blacklist in MVP.
