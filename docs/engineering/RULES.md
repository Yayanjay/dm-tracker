# Engineering Rules

- Read the relevant feature docs before implementing or changing a feature.
- Do not add framework, database, queue, or auth technology changes without recording the decision in docs.
- Do not implement feature code until its `docs/features/<number>-<feature-name>/` docs exist.
- Do not create separate services for MVP domains; this project is a single monolith unless architecture docs change.
- All API responses must use the standard response envelope from `docs/engineering/CONVENTIONS.md`.
- Paginated list/search endpoints must use POST with the standard pagination request body; do not use GET query pagination.
- Follow `docs/engineering/GIT_FLOW.md` for branch names, PR scope, and commit style.
- When adding runnable code, update `AGENTS.md` with the exact setup, run, lint, test, and migration commands.
- Do not introduce patient auth, multi-tenant, SatuseHAT integration, analytics, broadcast, fuzzy NLP, or photo/OCR — all explicitly out of MVP scope.
