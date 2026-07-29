# Travel Essentials GH

A responsive storefront with the first production-commerce foundation. The
development environment is linked to Neon Postgres and Neon Auth. The admin
gateway uses Neon Auth bearer sessions and checks the managed Neon Auth admin
role in Postgres. Product, inventory, order, and payment modules are being
added in separate phases.

## Neon development setup

The repository is linked locally to the `development` branch of the
`Travels-Essential-GH` Neon project. `.neon` and `.env.local` are intentionally
Git-ignored because they contain workspace context and credentials.

After cloning on another computer:

```bash
npx neon@latest auth
npx neon@latest link
npx neon@latest checkout development
npm install
npm run db:check
```

`DATABASE_URL` is the pooled runtime connection. `DATABASE_URL_UNPOOLED` is
reserved for schema migrations and administrative tasks. Never expose either
value through a `VITE_*` variable or commit `.env.local`.

Create the first owner from an interactive VS Code terminal:

```bash
npm run admin:create
```

The command asks for email, display name, and a hidden password, creates the
Neon Auth user, assigns the managed `admin` role by UUID, and revokes the
temporary provisioning session. It never accepts the password as a command
argument or writes it to disk. There is no public admin-registration route in
the application. The API also rejects banned users even if their Neon Auth
session remains valid.

## Run locally

```bash
npm install
npm run db:check
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
- Origin and CSRF protection plus login and session rate limiting
- Neon Auth bearer-session gateway with Postgres-backed admin authorization
- Neon development branch with cost-limited autoscaling
- Validated pooled Neon/Drizzle database adapter
- Route-split storefront and admin bundles

## Egress controls

- The admin restores its session once and never polls.
- Session renewal is user-triggered and the dashboard never polls.
- Admin membership checks use one indexed identity lookup.
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
