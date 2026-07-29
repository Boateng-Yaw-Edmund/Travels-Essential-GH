export interface AuthEnvironment {
  neonAuthBaseUrl: string
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
  const neonAuthBaseUrl = env.NEON_AUTH_BASE_URL?.replace(/\/+$/, '')
  const origins = env.AUTH_ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  const secureCookies = env.AUTH_COOKIE_SECURE !== 'false'

  if (!neonAuthBaseUrl || !origins?.length) {
    throw new Error('Server authentication configuration is incomplete.')
  }

  let parsedNeonAuthUrl: URL
  try {
    parsedNeonAuthUrl = new URL(neonAuthBaseUrl)
  } catch {
    throw new Error('Server authentication configuration is invalid.')
  }

  if (
    parsedNeonAuthUrl.protocol !== 'https:' ||
    !parsedNeonAuthUrl.hostname.endsWith('.neon.tech') ||
    !parsedNeonAuthUrl.hostname.includes('.neonauth.') ||
    parsedNeonAuthUrl.pathname !== '/auth' ||
    parsedNeonAuthUrl.search !== '' ||
    parsedNeonAuthUrl.hash !== '' ||
    parsedNeonAuthUrl.username !== '' ||
    parsedNeonAuthUrl.password !== '' ||
    origins.some((origin) => !isValidOrigin(origin, secureCookies)) ||
    (!secureCookies &&
      origins.some((origin) => new URL(origin).protocol !== 'http:'))
  ) {
    throw new Error('Server authentication configuration is invalid.')
  }

  return {
    neonAuthBaseUrl,
    allowedOrigins: origins,
    secureCookies,
  }
}
