import type {
  AdminUser,
  AuthGateway,
} from '../auth/types'
import type { StoredAuthSession } from './admin-repository'

type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, 'headers' | 'ok' | 'status' | 'json'>>

interface NeonAuthGatewayOptions {
  authBaseUrl: string
  appOrigin: string
  findSession: (token: string) => Promise<StoredAuthSession | null>
  isActiveAdmin: (userId: string) => Promise<boolean>
  revokeSession: (token: string) => Promise<boolean>
  fetch?: FetchLike
  now?: () => Date
  sessionMaxAgeSeconds?: number
  timeoutMs?: number
}

interface SessionPayload {
  session?: unknown
  token?: unknown
  user?: unknown
}

const DEFAULT_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

function parseUser(value: unknown): AdminUser | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.email !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    email: candidate.email.toLowerCase(),
  }
}

function remainingLifetime(
  value: unknown,
  now: Date,
): number | null {
  if (!value || typeof value !== 'object') return null
  const expiresAt = (value as Record<string, unknown>).expiresAt
  if (typeof expiresAt !== 'string') return null

  const expiresAtMs = Date.parse(expiresAt)
  if (!Number.isFinite(expiresAtMs)) return null

  const seconds = Math.floor((expiresAtMs - now.getTime()) / 1000)
  return seconds > 0 ? seconds : null
}

export function createNeonAuthGateway(
  options: NeonAuthGatewayOptions,
): AuthGateway {
  const request = options.fetch ?? globalThis.fetch
  const baseUrl = options.authBaseUrl.replace(/\/+$/, '')
  const now = options.now ?? (() => new Date())
  const sessionMaxAgeSeconds =
    options.sessionMaxAgeSeconds ?? DEFAULT_SESSION_MAX_AGE_SECONDS
  const timeoutMs = options.timeoutMs ?? 5_000

  async function authRequest(
    path: string,
    init: RequestInit,
  ): Promise<Pick<Response, 'headers' | 'ok' | 'status' | 'json'>> {
    const response = await request(`${baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (response.status >= 500) {
      throw new Error('Authentication provider request failed.')
    }
    return response
  }

  return {
    async signInWithPassword(email, password) {
      const response = await authRequest('/sign-in/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: options.appOrigin,
        },
        body: JSON.stringify({ email, password, rememberMe: true }),
      })
      if (!response.ok) return null

      const payload = (await response.json()) as SessionPayload
      const token =
        response.headers.get('set-auth-token') ??
        (typeof payload.token === 'string' ? payload.token : null)
      const user = parseUser(payload.user)
      if (!token || !user) return null

      return {
        token,
        expiresInSeconds: sessionMaxAgeSeconds,
        user,
      }
    },

    async getSession(token) {
      const session = await options.findSession(token)
      if (!session) return null

      const user = parseUser(session.user)
      const expiresInSeconds = remainingLifetime(
        { expiresAt: session.expiresAt },
        now(),
      )
      if (!user || !expiresInSeconds) return null

      return { token, expiresInSeconds, user }
    },

    isActiveAdmin(userId) {
      return options.isActiveAdmin(userId)
    },

    async signOut(token) {
      await options.revokeSession(token)
    },
  }
}
