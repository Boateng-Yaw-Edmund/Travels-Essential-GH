# Admin API foundation

The auth domain is framework-independent and mounts on an Express-compatible
router through `registerAdminAuthRoutes`.

Endpoints:

- `POST /api/admin/auth/login`
- `GET /api/admin/auth/session`
- `POST /api/admin/auth/refresh`
- `POST /api/admin/auth/logout`

Access and refresh tokens are held only in `HttpOnly`, `Secure`,
`SameSite=Strict` cookies. Login and session responses return a CSRF token for
the frontend to keep in memory. Logout sends that value in `X-CSRF-Token`.

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

## Supabase egress discipline

- Restore the admin session once when the dashboard boots; do not poll it.
- The GET session route never refreshes or rotates credentials. Expired access
  is refreshed only by the origin-checked, CSRF-protected, rate-limited POST
  refresh route.
- Auth responses contain only small identity records and never return profile
  lists.
- The gateway selects only `user_id` with `limit=1` for the admin check.
- Keep authorization checks fresh for sensitive mutations. If auth traffic
  becomes material, locally verify Supabase JWT signatures using a cached JWKS
  and retain a single narrow admin-membership lookup.
- Product media belongs to the next phase. Upload directly to Supabase Storage,
  reject oversized originals, generate one thumbnail and one display image,
  prefer WebP/AVIF, use immutable cache headers, and never proxy image bytes
  through this API.
