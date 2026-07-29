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

`FixedWindowRateLimiter` is gated to development/test and cannot be
constructed for production. Production wiring must supply a shared store so
all instances enforce the same login-attempt counter. `server/index.ts`
therefore fails closed when `NODE_ENV=production` until that deployment
adapter is added.

## Neon database wiring

- `DATABASE_URL` must use the pooled Neon host and is used for runtime queries.
- `DATABASE_URL_UNPOOLED` must use the direct host and is reserved for
  migrations and administrative work.
- Both connections require TLS and are validated without exposing credentials
  in error messages.
- Run `npm run db:check` for a one-row connection test. It does not start the
  application server.

## Neon authentication

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
