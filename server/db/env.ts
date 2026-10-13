export interface DatabaseEnvironment {
  pooledUrl: string
  directUrl: string
}

function parseNeonUrl(value: string, expectedPooled: boolean): URL | undefined {
  try {
    const url = new URL(value)
    const isPostgres =
      url.protocol === 'postgres:' || url.protocol === 'postgresql:'
    const isNeonHost = url.hostname.endsWith('.neon.tech')
    const isPooled = url.hostname.includes('-pooler.')
    const requiresSsl = url.searchParams.get('sslmode') === 'require'

    if (
      !isPostgres ||
      !isNeonHost ||
      isPooled !== expectedPooled ||
      !requiresSsl ||
      !url.username ||
      !url.password ||
      url.pathname === '/'
    ) {
      return undefined
    }

    return url
  } catch {
    return undefined
  }
}

export function validateDatabaseEnv(
  env: Readonly<Record<string, string | undefined>>,
): DatabaseEnvironment {
  const pooledUrl = env.DATABASE_URL
  const directUrl = env.DATABASE_URL_UNPOOLED

  if (!pooledUrl || !directUrl) {
    throw new Error('Server database configuration is incomplete.')
  }

  const parsedPooledUrl = parseNeonUrl(pooledUrl, true)
  const parsedDirectUrl = parseNeonUrl(directUrl, false)

  if (!parsedPooledUrl || !parsedDirectUrl) {
    throw new Error('Server database configuration is invalid.')
  }

  if (
    env.NODE_ENV === 'production' &&
    parsedPooledUrl.username === parsedDirectUrl.username
  ) {
    throw new Error('Production runtime and migration database roles must differ.')
  }

  return {
    pooledUrl,
    directUrl,
  }
}
