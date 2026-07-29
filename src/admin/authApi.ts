export interface AdminUser {
  id: string
  email: string
}

export interface AdminSession {
  user: AdminUser
  csrfToken: string
}

interface AuthEnvelope {
  authenticated?: boolean
  user?: AdminUser
  data?: {
    authenticated?: boolean
    user?: AdminUser
    csrfToken?: string | null
  }
}

const request = async (path: string, init?: RequestInit): Promise<AuthEnvelope> => {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
  })

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'UNAUTHENTICATED' : 'REQUEST_FAILED')
  }

  return response.json() as Promise<AuthEnvelope>
}

const readUser = (payload: AuthEnvelope): AdminUser | null =>
  payload.data?.user ?? payload.user ?? null

const readSession = (payload: AuthEnvelope): AdminSession | null => {
  const user = readUser(payload)
  const csrfToken = payload.data?.csrfToken

  return user && csrfToken ? { user, csrfToken } : null
}

export const getAdminSession = async (): Promise<AdminSession | null> => {
  try {
    const payload = await request('/api/admin/auth/session')
    const isAuthenticated =
      payload.data?.authenticated ?? payload.authenticated ?? Boolean(readUser(payload))

    return isAuthenticated ? readSession(payload) : null
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return null
    }

    throw error
  }
}

export const loginAdmin = async (email: string, password: string): Promise<AdminSession> => {
  const payload = await request('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const session = readSession(payload)

  if (!session) {
    throw new Error('INVALID_RESPONSE')
  }

  return session
}

export const logoutAdmin = async (csrfToken: string): Promise<void> => {
  await request('/api/admin/auth/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  })
}
