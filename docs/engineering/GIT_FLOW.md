# Git Flow

- Use trunk-based development with short-lived branches from `main`.
- Keep `main` deployable once implementation code exists.
- Do not use long-running GitFlow branches unless release docs are added later.

# Branch Naming

- Match feature branches to numbered feature docs.
- Use `feature/<number>-<feature-name>` for planned feature work.
- Use `fix/<number>-<feature-name>-<issue>` for fixes tied to a feature.
- Use `docs/<topic>` for docs-only changes.
- Use `chore/<topic>` for setup, tooling, or maintenance changes.

Examples:

```text
feature/001-auth
feature/002-patients
feature/004-medications
fix/004-medications-schedule-validation
docs/api-response-convention
chore/init-nestjs-project
```

# Feature Workflow

- Create feature docs before implementation: `docs/features/<number>-<feature-name>/`.
- Create the matching branch from `main`.
- Implement only the scoped feature on that branch.
- Update `TASKLIST.md` as tasks are completed.
- Run the documented verification commands before opening a PR once commands exist.

# Pull Requests

- Open PRs into `main`.
- Keep PRs scoped to one feature, fix, docs change, or chore.
- Include feature docs updates when the PR adds or changes a feature.
- Include migrations when the PR changes database schema.
- Include tests when implementation code exists.
- Do not mix unrelated domains in one PR.

# Commits

- Use concise conventional commit prefixes.

Examples:

```text
docs: add patients feature plan
feat: add patients api
fix: scope schedule times validation
test: add patient service tests
chore: initialize nestjs project
```

# Releases

- For MVP, use `main` as the release branch.
- Add release branches only when deployment or versioning docs require them.
