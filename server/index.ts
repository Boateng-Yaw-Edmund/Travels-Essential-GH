import 'dotenv/config'
import { resolve } from 'node:path'

import { createServerApp } from './app'
import { createAuthHandlers } from './auth/handlers'
import { validateAuthEnv } from './config/env'
import { createDatabaseClient } from './db/client'
import { validateDatabaseEnv } from './db/env'
import { createAdminRepository } from './neon/admin-repository'
import { createNeonAuthGateway } from './neon/auth-gateway'
import { FixedWindowRateLimiter } from './security/fixed-window-rate-limiter'
import { createPostgresRateLimiter } from './security/postgres-rate-limiter'

const environment = validateAuthEnv(process.env)
const databaseEnvironment = validateDatabaseEnv(process.env)
const production = process.env.NODE_ENV === 'production'
if (production && !environment.secureCookies) throw new Error('Production requires secure cookies.')
const runtimeEnvironment =
  process.env.NODE_ENV === 'test' ? 'test' : 'development'
const database = createDatabaseClient(databaseEnvironment.pooledUrl)
const rateLimiter = production
  ? createPostgresRateLimiter(database)
  : new FixedWindowRateLimiter(runtimeEnvironment)
const adminRepository = createAdminRepository(database)
const gateway = createNeonAuthGateway({
  authBaseUrl: environment.neonAuthBaseUrl,
  appOrigin: environment.allowedOrigins[0],
  findSession: adminRepository.findSession,
  isActiveAdmin: adminRepository.isActiveAdmin,
  revokeSession: adminRepository.revokeSession,
})
const handlers = createAuthHandlers({
  gateway,
  rateLimiter,
  allowedOrigins: environment.allowedOrigins,
  secureCookies: environment.secureCookies,
})
const app = createServerApp({
  handlers,
  staticDirectory: production ? resolve('dist') : undefined,
  trustedProxy: production ? process.env.TRUSTED_PROXY_CIDRS : undefined,
})
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 8787)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid server port.')
const host = production ? '0.0.0.0' : '127.0.0.1'

const server = app.listen(port, host, () => {
  console.log(`Travel Essentials GH server listening on port ${port}`)
})
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 10_000).unref()
  })
}
