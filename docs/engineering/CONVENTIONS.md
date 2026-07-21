# Engineering Conventions

- Backend stack direction: single NestJS API service with Prisma and PostgreSQL.
- Use JWT role-based auth for admin endpoints unless a feature decision says otherwise.
- Treat this as a modular monolith, not microservices.
- Prefer feature-based NestJS modules under `apps/api/src/<feature>/` with controller, service, DTO files owned by that feature.
- Keep business rules in services, HTTP concerns in controllers/guards, and database access via Prisma in repositories.
- Feature docs should use incremental numeric prefixes, e.g. `001-auth`, `002-patients`, `003-medications`.
- Keep feature-specific conventions in `docs/features/<number>-<feature-name>/DECISIONS.md` when they are not global.

# API Response Envelope

- All API responses must use `code`, `message`, and `data`.
- `code` must match the HTTP status code.
- `message` must be human-readable in Indonesian for user-facing endpoints.
- `data` is dynamic and may be an object, array, scalar, or `null` depending on the endpoint.
- Include `pagination` only for paginated responses.

```json
{
  "code": 200,
  "message": "Success",
  "data": [{}, {}],
  "pagination": {
    "page": 1,
    "size": 10,
    "total_item": 100,
    "total_pages": 10
  }
}
```

# Pagination Requests

- Paginated list/search endpoints must use `POST`, not `GET`.
- Use a route such as `POST /api/v1/<resource>/list` for paginated list/search operations.
- Default `page` to `1` and `size` to `10` when omitted.
- Set a maximum allowed `size` when implementing pagination.
- `search.key` and `sort[].key` must be whitelisted per endpoint.
- `sort[].direction` accepts only `ASC` or `DESC`.

```json
{
  "page": 1,
  "size": 10,
  "search": {
    "key": ["name", "waNumber"],
    "value": "budi"
  },
  "sort": [
    {
      "key": "created_at",
      "direction": "DESC"
    }
  ]
}
```
