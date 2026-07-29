export interface AdminUser {
  id: string
  email: string
}

export interface AuthSession {
  token: string
  expiresInSeconds: number
  user: AdminUser
}

export interface AuthGateway {
  signInWithPassword(email: string, password: string): Promise<AuthSession | null>
  getSession(token: string): Promise<AuthSession | null>
  isActiveAdmin(userId: string): Promise<boolean>
  signOut(token: string): Promise<void>
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export interface RateLimiter {
  consume(
    key: string,
    policy: { limit: number; windowSeconds: number },
  ): Promise<RateLimitResult>
}

export type HeaderValue = string | string[] | undefined

export interface ExpressRequestLike {
  headers: Record<string, HeaderValue>
  body?: unknown
  ip?: string
  socket?: {
    remoteAddress?: string
  }
}

export interface ExpressResponseLike {
  status(code: number): this
  json(body: unknown): this
  setHeader(name: string, value: string | string[]): this
}
