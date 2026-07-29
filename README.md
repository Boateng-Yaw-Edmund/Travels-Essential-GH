# Travel Essentials GH

A responsive storefront with the first production-commerce foundation: an
invite-only admin login and dashboard backed by Supabase Auth and PostgreSQL
row-level security. Product, inventory, order, and payment modules are being
added in separate phases.

## Configure the admin foundation

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Add the project URL and publishable/anon key to `.env.local`.
4. Apply `supabase/migrations/202607280001_admin_auth_foundation.sql`.
5. Create the owner in Supabase Auth, then add the matching user ID to
   `public.admin_profiles`.

There is no public admin registration route. Never place a Supabase secret or
service-role key in a `VITE_*` variable or commit `.env.local`.

## Run locally

```bash
npm install
npm run dev
```

This launches the Vite storefront and the same-origin admin API together. Then
open the local URL shown by Vite. The admin entry is `/admin`.

## Quality checks

```bash
npm test
npm run test:coverage
npx vitest run --config vitest.server.config.ts --coverage
npm run build
npm run lint
npm run test:e2e
```

## Included

- Responsive editorial homepage based on the approved design reference
- Ghana cedi product pricing and locally relevant travel copy
- Search and category filters
- Mock cart drawer with quantity controls
- Mobile navigation
- Newsletter form validation
- Generated, project-local hero and product imagery
- Secure admin login with `HttpOnly` authentication cookies
- Origin and CSRF protection, login rate limiting, and RLS migration
- Route-split storefront and admin bundles

## Egress controls

- The admin restores its session once and never polls.
- Session refresh occurs only after the short-lived access session expires.
- Admin membership checks select one column and one row.
- Storefront and admin code/styles are separate bundles.
- Product media will use a public CDN bucket, immutable URLs, long browser
  caching, thumbnails/list images, and display-sized WebP/AVIF assets.
- Catalogue queries will select explicit columns, paginate results, and cache
  public reads instead of repeatedly downloading full records.

## Deferred

Checkout, payment processing, real inventory, product management, order
management, delivery-rate calculation, analytics, and live Instagram data are
not part of this first admin-foundation phase.

Product names, prices, and policies are placeholders until the business catalogue is confirmed.
