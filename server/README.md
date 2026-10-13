# Admin API foundation

The auth domain is framework-independent and mounts on an Express-compatible
router through `registerAdminAuthRoutes`.

Endpoints:

- `POST /api/admin/auth/login`
- `GET /api/admin/auth/session`
- `POST /api/admin/auth/refresh`
- `POST /api/admin/auth/logout`

The Neon Auth session token is held only in an `HttpOnly`, `Secure`,
`SameSite=Strict` cookie. Login and session responses return a CSRF token for
the frontend to keep in memory. Renewal and logout send that value in
`X-CSRF-Token`.

## Runtime wiring

`server/index.ts` wires these modules into Express. During local development,
Vite proxies `/api` to the API on port `8787`; `npm run dev` starts both
processes. The runtime configures:

- JSON body limit of 16 KB for auth routes
- Helmet security headers
- same-origin routing
- a distributed `RateLimiter` implementation in production
- no cross-origin credentials; serve the UI and API from one origin

`FixedWindowRateLimiter` is gated to development/test. Production uses an
atomic PostgreSQL upsert in `auth_rate_limits` so instances share counters.
Keys are SHA-256 hashes and a database failure denies the attempt.

## Coolify production deployment

Use the repository Dockerfile with internal port `3000` and health endpoint
`/api/health`. Do not publish a host port; route through Coolify's proxy.
`npm start` serves the built storefront and API on the same origin. The
container runs as the Node non-root user and excludes local environment files
from the build context. It includes the TypeScript runtime dependencies;
migrations are run separately, never automatically at startup.

Before deployment, apply all migrations to the intended database branch,
including `0001_auth_rate_limits`. Set these runtime variables in Coolify:

- `DATABASE_URL`: pooled URL for the runtime role.
- `DATABASE_URL_UNPOOLED`: direct URL with a separate migration role (required
  by the current startup validator; restrict access to Coolify secrets).
- `NEON_AUTH_BASE_URL`: production branch's Neon Auth URL.
- `AUTH_ALLOWED_ORIGINS`: the exact HTTPS storefront origin.
- `AUTH_COOKIE_SECURE=true`.
- `TRUSTED_PROXY_CIDRS`: only the verified Coolify proxy IP or dedicated
  proxy network CIDR. Never use a blanket trust setting. Without this value,
  forwarded IPs are ignored and clients share the proxy's rate limit.

Allow only the proxy to reach the container. Confirm HTTPS and admin cookies
after deployment. `/api/health` is process liveness, not a database query, so
regular checks do not create Neon egress or wake its compute.

Periodically remove expired rate limit rows during maintenance using
`DELETE FROM auth_rate_limits WHERE expires_at < now() - interval '1 day';`.
There is no background database polling. Live deployment and the production
database migration remain separate explicit steps.

## Neon database wiring

- `DATABASE_URL` must use the pooled Neon host and is used for runtime queries.
- `DATABASE_URL_UNPOOLED` must use the direct host and is reserved for
  migrations and administrative work.
- Both connections require TLS and are validated without exposing credentials
  in error messages.
- Run `npm run db:check` for a one-row connection test. It does not start the
  application server.

## Neon authentication

Provision the first owner with `npm run admin:create` from an interactive
terminal. The password prompt is hidden, and the command uses the direct
administrative database connection only for the one-row role update.

## Catalogue migrations

The catalogue schema lives in `server/db/schema/` and its append-only SQL
migrations live in `drizzle/`. Run migrations with the direct database URL and
an explicit Neon branch label:

```bash
npm run db:migrate -- --target development
```

The migration runner uses a transaction-capable PostgreSQL connection. Runtime
queries continue to use the pooled URL. Production validates that the runtime
and migration URLs use different database roles. Catalogue audit actor UUIDs
are deliberately not foreign keys into Neon's managed Auth schema; product
services must verify the active admin before every write and only then persist
that verified user ID.

- Restore the admin session once when the dashboard boots; do not poll it.
- The GET session route validates the existing Neon Auth bearer session.
- The origin-checked, CSRF-protected, rate-limited POST refresh route renews
  the local cookie lifetime only after Neon Auth validates the same session.
- Auth responses contain only small identity records and never return profile
  lists.
- Authorization queries the managed `neon_auth.user` row by UUID and allows
  only users whose role is `admin` and who are not banned.
- Keep the authorization check fresh for every sensitive mutation.
- Product media belongs to the next phase and will use object storage plus a
  CDN rather than Postgres. Reject oversized originals, generate one thumbnail
  and one display image, prefer WebP/AVIF, use immutable cache headers, and
  never proxy image bytes through this API.
