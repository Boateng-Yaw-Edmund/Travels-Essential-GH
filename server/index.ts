import 'dotenv/config'

import { createServerApp } from './app'
import { createAuthHandlers } from './auth/handlers'
import { validateAuthEnv } from './config/env'
import { FixedWindowRateLimiter } from './security/fixed-window-rate-limiter'
import { createSupabaseAuthGateway } from './supabase/auth-gateway'

const environment = validateAuthEnv(process.env)
if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'Production startup requires a shared rate limiter; the local runtime is development-only.',
  )
}
const runtimeEnvironment =
  process.env.NODE_ENV === 'test' ? 'test' : 'development'
const rateLimiter = new FixedWindowRateLimiter(runtimeEnvironment)
const gateway = createSupabaseAuthGateway({
  supabaseUrl: environment.supabaseUrl,
  supabaseAnonKey: environment.supabaseAnonKey,
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
