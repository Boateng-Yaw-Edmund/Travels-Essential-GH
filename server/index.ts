import 'dotenv/config'

import { createServerApp } from './app'
import { createAuthHandlers } from './auth/handlers'
import { validateAuthEnv } from './config/env'
import { createDatabaseClient } from './db/client'
import { validateDatabaseEnv } from './db/env'
import { createAdminRepository } from './neon/admin-repository'
import { createNeonAuthGateway } from './neon/auth-gateway'
import { FixedWindowRateLimiter } from './security/fixed-window-rate-limiter'

const environment = validateAuthEnv(process.env)
const databaseEnvironment = validateDatabaseEnv(process.env)
if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'Production startup requires a shared rate limiter; the local runtime is development-only.',
  )
}
const runtimeEnvironment =
  process.env.NODE_ENV === 'test' ? 'test' : 'development'
const rateLimiter = new FixedWindowRateLimiter(runtimeEnvironment)
const database = createDatabaseClient(databaseEnvironment.pooledUrl)
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
const app = createServerApp({ handlers })
const port = Number(process.env.API_PORT ?? 8787)

app.listen(port, '127.0.0.1', () => {
  console.log(`Travel Essentials GH API listening on http://127.0.0.1:${port}`)
})
