# Requirements

- Build a single-service medication reminder + consumption tracking system for puskesmas DM patients.
- Backend stack: NestJS (TypeScript) with Prisma ORM and PostgreSQL (prod) / SQLite (dev).
- Initial scope: Core MVP covering auth, patients, medications, reminders, consumption logging, and template messages.
- Primary datastore: PostgreSQL. Use SQLite for local development.
- Use JWT role-based auth for the admin dashboard. No patient auth in MVP.
- Single-tenant for MVP. No `Puskesmas` tenant scoping yet.
- Patient identity: WhatsApp number only, registered by admin.
- WhatsApp gateway: WAHA (self-hosted Docker), not Fonnte or any sibling project.
- Timezone: Asia/Jakarta (WIB). Store DB timestamps as UTC, render in WIB.
