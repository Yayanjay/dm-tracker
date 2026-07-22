# Cloudflare Tunnel Deploy Guide

## Prerequisites
- Cloudflare account with a domain managed by Cloudflare DNS
- `cloudflared` installed on the homelab host (macOS/Linux)
- Docker + Docker Compose installed on the homelab host

## 1. DNS Setup
In Cloudflare Dashboard → DNS, create a CNAME record:
- Name: `dm` (or your preferred subdomain)
- Target: `<tunnel-uuid>.cfargotunnel.com` (created in step 2)
- Proxy status: Proxied (orange cloud)

## 2. Cloudflare Tunnel (Dashboard method)
1. Go to Cloudflare Dashboard → Zero Trust → Networks → Tunnels
2. Click "Create a tunnel"
3. Name: `kawalgula`
4. Install connector: follow the dashboard instructions to install `cloudflared` as a service on your homelab host
5. After the connector is running, add a Public Hostname:
   - Subdomain: `dm` (match the DNS record)
   - Domain: your domain
   - Path: (leave empty)
   - Type: HTTP
   - URL: `localhost:3000`
6. Save

The tunnel now routes `https://dm.your-homelab.com` → `http://localhost:3000`.

## 3. Environment Configuration
Copy and edit `.env.example` → `.env`:

```bash
cp .env.example .env
```

Key values to change:
- `JWT_SECRET`: generate a long random string (`openssl rand -hex 32`)
- `WAHA_API_KEY`: set to match `WAHA_API_KEY` in WAHA env
- `WAHA_WEBHOOK_URL`: `https://dm.your-homelab.com/api/v1/webhooks/waha`
- `PUBLIC_BASE_URL`: `https://dm.your-homelab.com`
- `DATABASE_URL`: keep as-is (internal Docker network to postgres)

## 4. Start Services
```bash
docker compose up -d
```

On first run, PostgreSQL needs the schema applied:
```bash
docker compose exec api npx prisma migrate deploy --schema packages/prisma/schema.prisma
docker compose exec api npx tsx packages/prisma/seed.ts
```

Wait ~30 seconds for all services to be healthy. Verify:
- `docker compose ps` — all services show `Up`
- `curl http://localhost:3000/api/v1/health` — should respond (if health endpoint added)

## 5. WhatsApp Pairing (one-time)
1. Open `https://dm.your-homelab.com/login`
2. Login with seeded admin: `admin@puskesmas.local` / `admin123`
3. Navigate to the WhatsApp page
4. Click "Mulai Session"
5. Wait for QR code to appear (status: SCAN_QR_CODE)
6. On the sender phone, open WhatsApp → Settings → Linked Devices → Link a Device
7. Scan the QR code
8. Status should change to WORKING with the phone number shown

The session persists in `.sessions/` volume. Restarts do not require re-pairing.

## 6. WARNING: WAHA is NOT exposed to the internet
- WAHA binds to `127.0.0.1:3001` — accessible only from the host machine
- The Cloudflare Tunnel only exposes port `3000` (NestJS API)
- WAHA's own dashboard (`http://localhost:3001`) is only reachable via `ssh -L` if needed

## Access Guide
| Service | Internal URL | Public URL |
|---|---|---|
| Admin Dashboard | http://localhost:3000 | https://dm.your-homelab.com |
| API | http://localhost:3000/api/v1 | https://dm.your-homelab.com/api/v1 |
| WAHA API | http://localhost:3001 | NOT exposed |
| PostgreSQL | localhost:5432 | NOT exposed |
| Redis | localhost:6379 | NOT exposed |
