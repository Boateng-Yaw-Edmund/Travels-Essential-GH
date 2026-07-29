export interface AuthEnvironment {
  supabaseUrl: string
  supabaseAnonKey: string
  allowedOrigins: readonly string[]
  secureCookies: boolean
}

function isValidOrigin(value: string, secureCookies: boolean): boolean {
  try {
    const url = new URL(value)
    const loopback =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '[::1]'
    return (
      (url.protocol === 'https:' ||
        (!secureCookies && url.protocol === 'http:' && loopback)) &&
      url.origin === value &&
      url.username === '' &&
      url.password === ''
    )
  } catch {
    return false
  }
}

export function validateAuthEnv(
  env: Readonly<Record<string, string | undefined>>,
): AuthEnvironment {
  const supabaseUrl = env.SUPABASE_URL?.replace(/\/+$/, '')
  const supabaseAnonKey = env.SUPABASE_ANON_KEY
  const origins = env.AUTH_ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  const secureCookies = env.AUTH_COOKIE_SECURE !== 'false'

  if (!supabaseUrl || !supabaseAnonKey || !origins?.length) {
    throw new Error('Server authentication configuration is incomplete.')
  }

  let parsedSupabaseUrl: URL
  try {
    parsedSupabaseUrl = new URL(supabaseUrl)
  } catch {
    throw new Error('Server authentication configuration is invalid.')
  }

  if (
    parsedSupabaseUrl.protocol !== 'https:' ||
    origins.some((origin) => !isValidOrigin(origin, secureCookies)) ||
    (!secureCookies &&
      origins.some((origin) => new URL(origin).protocol !== 'http:'))
  ) {
    throw new Error('Server authentication configuration is invalid.')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    allowedOrigins: origins,
    secureCookies,
  }
}
