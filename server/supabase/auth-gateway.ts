import type {
  AdminUser,
  AuthGateway,
  AuthSession,
} from '../auth/types'

type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>

interface SupabaseGatewayOptions {
  supabaseUrl: string
  supabaseAnonKey: string
  fetch?: FetchLike
  timeoutMs?: number
}

interface SupabaseSessionPayload {
  access_token?: unknown
  refresh_token?: unknown
  expires_in?: unknown
  user?: unknown
}

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

function parseSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as SupabaseSessionPayload
  const user = parseUser(candidate.user)
  if (
    typeof candidate.access_token !== 'string' ||
    typeof candidate.refresh_token !== 'string' ||
    typeof candidate.expires_in !== 'number' ||
    !user
  ) {
    return null
  }
  return {
    accessToken: candidate.access_token,
    refreshToken: candidate.refresh_token,
    expiresInSeconds: candidate.expires_in,
    user,
  }
}

export function createSupabaseAuthGateway(
  options: SupabaseGatewayOptions,
): AuthGateway {
  const request = options.fetch ?? globalThis.fetch
  const baseUrl = options.supabaseUrl.replace(/\/+$/, '')
  const timeoutMs = options.timeoutMs ?? 5_000
  const publicHeaders = {
    apikey: options.supabaseAnonKey,
    'Content-Type': 'application/json',
  } as const

  async function authRequest(
    path: string,
    init: RequestInit,
  ): Promise<Pick<Response, 'ok' | 'status' | 'json'>> {
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
      const response = await authRequest(
        '/auth/v1/token?grant_type=password',
        {
          method: 'POST',
          headers: publicHeaders,
          body: JSON.stringify({ email, password }),
        },
      )
      if (!response.ok) return null
      return parseSession(await response.json())
    },

    async refreshSession(refreshToken) {
      const response = await authRequest(
        '/auth/v1/token?grant_type=refresh_token',
        {
          method: 'POST',
          headers: publicHeaders,
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
      )
      if (!response.ok) return null
      return parseSession(await response.json())
    },

    async getUser(accessToken) {
      const response = await authRequest('/auth/v1/user', {
        method: 'GET',
        headers: {
          ...publicHeaders,
          Authorization: `Bearer ${accessToken}`,
        },
      })
      if (response.status === 401 || response.status === 403) return null
      if (!response.ok) {
        throw new Error('Authentication provider request failed.')
      }
      return parseUser(await response.json())
    },

    async isActiveAdmin(userId, accessToken) {
      const query = new URLSearchParams({
        select: 'user_id',
        user_id: `eq.${userId}`,
        active: 'is.true',
        limit: '1',
      })
      const response = await authRequest(
        `/rest/v1/admin_profiles?${query.toString()}`,
        {
          method: 'GET',
          headers: {
            ...publicHeaders,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )
      if (response.status === 401 || response.status === 403) return false
      if (!response.ok) {
        throw new Error('Authentication provider request failed.')
      }
      const rows: unknown = await response.json()
      return Array.isArray(rows) && rows.length === 1
    },

    async signOut(accessToken) {
      const response = await authRequest('/auth/v1/logout', {
        method: 'POST',
        headers: {
          ...publicHeaders,
          Authorization: `Bearer ${accessToken}`,
        },
      })
      if (!response.ok && response.status !== 401) {
        throw new Error('Authentication provider request failed.')
      }
    },
  }
}
