import { AUTH_COOKIES, parseCookies, serializeCookie } from './cookies'
import type {
  AuthGateway,
  AuthSession,
  ExpressRequestLike,
  ExpressResponseLike,
  HeaderValue,
  RateLimiter,
} from './types'

const LOGIN_POLICY = {
  limit: 5,
  windowSeconds: 15 * 60,
} as const

const SESSION_POLICY = {
  limit: 60,
  windowSeconds: 60,
} as const

const REFRESH_POLICY = {
  limit: 10,
  windowSeconds: 15 * 60,
} as const

const GENERIC_REQUEST_ERROR = {
  error: {
    code: 'invalid_request',
    message: 'Unable to process this request.',
  },
} as const

const GENERIC_AUTH_ERROR = {
  error: {
    code: 'authentication_failed',
    message: 'Email or password is incorrect.',
  },
} as const

const UNAUTHORIZED_ERROR = {
  error: {
    code: 'unauthorized',
    message: 'Authentication is required.',
  },
} as const

const FORBIDDEN_ERROR = {
  error: {
    code: 'forbidden',
    message: 'Request could not be verified.',
  },
} as const

const SERVICE_ERROR = {
  error: {
    code: 'service_unavailable',
    message: 'Authentication is temporarily unavailable.',
  },
} as const

interface AuthHandlerOptions {
  gateway: AuthGateway
  rateLimiter: RateLimiter
  allowedOrigins: readonly string[]
  secureCookies?: boolean
  csrfTokenFactory?: () => string
}

function firstHeader(value: HeaderValue): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function header(request: ExpressRequestLike, name: string): string {
  const key = Object.keys(request.headers).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  )
  return key ? firstHeader(request.headers[key]) : ''
}

function requestIp(request: ExpressRequestLike): string {
  return request.ip || request.socket?.remoteAddress || 'unknown'
}

function isAllowedOrigin(
  request: ExpressRequestLike,
  allowedOrigins: readonly string[],
): boolean {
  const origin = header(request, 'origin')
  return origin.length > 0 && allowedOrigins.includes(origin)
}

function validCredentials(
  value: unknown,
): value is { email: string; password: string } {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email.trim()) &&
    candidate.email.length <= 254 &&
    typeof candidate.password === 'string' &&
    candidate.password.length >= 8 &&
    candidate.password.length <= 128
  )
}

function safeTokenMatch(left: string, right: string): boolean {
  if (!left || left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

function defaultCsrfToken(): string {
  const bytes = new Uint8Array(32)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join(
    '',
  )
}

function authCookies(
  session: AuthSession,
  csrfToken: string,
  secure: boolean,
): string[] {
  return [
    serializeCookie(AUTH_COOKIES.session, session.token, {
      httpOnly: true,
      secure,
      maxAgeSeconds: session.expiresInSeconds,
      path: '/api/admin',
    }),
    serializeCookie(AUTH_COOKIES.csrf, csrfToken, {
      httpOnly: false,
      secure,
      maxAgeSeconds: 30 * 24 * 60 * 60,
      path: '/',
    }),
  ]
}

function expiredCookies(secure: boolean): string[] {
  return [
    serializeCookie(AUTH_COOKIES.session, '', {
      httpOnly: true,
      secure,
      maxAgeSeconds: 0,
      path: '/api/admin',
    }),
    serializeCookie(AUTH_COOKIES.csrf, '', {
      httpOnly: false,
      secure,
      maxAgeSeconds: 0,
      path: '/',
    }),
  ]
}

function expiredSessionCookie(secure: boolean): string {
  return serializeCookie(AUTH_COOKIES.session, '', {
    httpOnly: true,
    secure,
    maxAgeSeconds: 0,
    path: '/api/admin',
  })
}

async function activeAdmin(
  gateway: AuthGateway,
  token: string,
): Promise<AuthSession | null> {
  const session = await gateway.getSession(token)
  if (!session) return null
  return (await gateway.isActiveAdmin(session.user.id)) ? session : null
}

export function createAuthHandlers(options: AuthHandlerOptions) {
  const secure = options.secureCookies ?? true
  const csrfTokenFactory = options.csrfTokenFactory ?? defaultCsrfToken

  return {
    login: async (
      request: ExpressRequestLike,
      response: ExpressResponseLike,
    ): Promise<void> => {
      if (!isAllowedOrigin(request, options.allowedOrigins)) {
        response.status(403).json(FORBIDDEN_ERROR)
        return
      }

      const limit = await options.rateLimiter.consume(
        `admin-login:${requestIp(request)}`,
        LOGIN_POLICY,
      )
      if (!limit.allowed) {
        response.setHeader(
          'Retry-After',
          String(Math.max(1, limit.retryAfterSeconds)),
        )
        response.status(429).json({
          error: {
            code: 'rate_limit_exceeded',
            message: 'Too many attempts. Please try again later.',
          },
        })
        return
      }

      if (!validCredentials(request.body)) {
        response.status(400).json(GENERIC_REQUEST_ERROR)
        return
      }

      try {
        const session = await options.gateway.signInWithPassword(
          request.body.email.trim().toLowerCase(),
          request.body.password,
        )
        if (!session) {
          response.status(401).json(GENERIC_AUTH_ERROR)
          return
        }

        const isAdmin = await options.gateway.isActiveAdmin(
          session.user.id,
        )
        if (!isAdmin) {
          await options.gateway.signOut(session.token).catch(() => undefined)
          response.status(401).json(GENERIC_AUTH_ERROR)
          return
        }

        const csrfToken = csrfTokenFactory()
        response.setHeader(
          'Set-Cookie',
          authCookies(session, csrfToken, secure),
        )
        response.status(200).json({
          data: {
            user: session.user,
            csrfToken,
          },
        })
      } catch {
        response.status(503).json(SERVICE_ERROR)
      }
    },

    session: async (
      request: ExpressRequestLike,
      response: ExpressResponseLike,
    ): Promise<void> => {
      const limit = await options.rateLimiter.consume(
        `admin-session:${requestIp(request)}`,
        SESSION_POLICY,
      )
      if (!limit.allowed) {
        response.setHeader('Retry-After', String(limit.retryAfterSeconds))
        response.status(429).json({
          error: {
            code: 'rate_limit_exceeded',
            message: 'Too many attempts. Please try again later.',
          },
        })
        return
      }

      const cookies = parseCookies(header(request, 'cookie'))
      const token = cookies[AUTH_COOKIES.session]

      try {
        if (token) {
          const session = await activeAdmin(options.gateway, token)
          if (session) {
            response.status(200).json({
              data: {
                user: session.user,
                csrfToken: cookies[AUTH_COOKIES.csrf] ?? null,
              },
            })
            return
          }
        }

        response.setHeader('Set-Cookie', [expiredSessionCookie(secure)])
        response.status(401).json(UNAUTHORIZED_ERROR)
      } catch {
        response.status(503).json(SERVICE_ERROR)
      }
    },

    refresh: async (
      request: ExpressRequestLike,
      response: ExpressResponseLike,
    ): Promise<void> => {
      if (!isAllowedOrigin(request, options.allowedOrigins)) {
        response.status(403).json(FORBIDDEN_ERROR)
        return
      }

      const limit = await options.rateLimiter.consume(
        `admin-refresh:${requestIp(request)}`,
        REFRESH_POLICY,
      )
      if (!limit.allowed) {
        response.setHeader('Retry-After', String(limit.retryAfterSeconds))
        response.status(429).json({
          error: {
            code: 'rate_limit_exceeded',
            message: 'Too many attempts. Please try again later.',
          },
        })
        return
      }

      const cookies = parseCookies(header(request, 'cookie'))
      if (
        !safeTokenMatch(
          cookies[AUTH_COOKIES.csrf] ?? '',
          header(request, 'x-csrf-token'),
        )
      ) {
        response.status(403).json(FORBIDDEN_ERROR)
        return
      }

      try {
        const token = cookies[AUTH_COOKIES.session]
        const refreshed = token
          ? await options.gateway.getSession(token)
          : null
        if (
          !refreshed ||
          !(await options.gateway.isActiveAdmin(
            refreshed.user.id,
          ))
        ) {
          response.setHeader('Set-Cookie', expiredCookies(secure))
          response.status(401).json(UNAUTHORIZED_ERROR)
          return
        }

        const csrfToken = csrfTokenFactory()
        response.setHeader(
          'Set-Cookie',
          authCookies(refreshed, csrfToken, secure),
        )
        response.status(200).json({
          data: {
            user: refreshed.user,
            csrfToken,
          },
        })
      } catch {
        response.status(503).json(SERVICE_ERROR)
      }
    },

    logout: async (
      request: ExpressRequestLike,
      response: ExpressResponseLike,
    ): Promise<void> => {
      if (!isAllowedOrigin(request, options.allowedOrigins)) {
        response.status(403).json(FORBIDDEN_ERROR)
        return
      }

      const cookies = parseCookies(header(request, 'cookie'))
      if (
        !safeTokenMatch(
          cookies[AUTH_COOKIES.csrf] ?? '',
          header(request, 'x-csrf-token'),
        )
      ) {
        response.status(403).json(FORBIDDEN_ERROR)
        return
      }

      const token = cookies[AUTH_COOKIES.session]
      try {
        if (token) await options.gateway.signOut(token)
      } catch {
        // Local session invalidation must still complete if the upstream is down.
      }

      response.setHeader('Set-Cookie', expiredCookies(secure))
      response.status(200).json({ data: { loggedOut: true } })
    },
  }
}
