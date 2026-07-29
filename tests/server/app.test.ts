import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createServerApp } from '../../server/app'
import { createAuthHandlers } from '../../server/auth/handlers'
import type { ExpressRequestLike, ExpressResponseLike } from '../../server/auth/types'

type Handler = (
  request: ExpressRequestLike,
  response: ExpressResponseLike,
) => Promise<void>

const okHandler: Handler = async (_request, response) => {
  response.status(200).json({ data: { ok: true } })
}

describe('admin HTTP runtime', () => {
  it('mounts the authentication contract and security headers', async () => {
    const app = createServerApp({
      handlers: {
        login: okHandler,
        session: okHandler,
        refresh: okHandler,
        logout: okHandler,
      },
    })

    const response = await request(app).get('/api/admin/auth/session')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { ok: true } })
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['content-security-policy']).toContain("default-src 'self'")
  })

  it('rejects oversized authentication payloads before the handler runs', async () => {
    const login = vi.fn(okHandler)
    const app = createServerApp({
      handlers: {
        login,
        session: okHandler,
        refresh: okHandler,
        logout: okHandler,
      },
    })

    const response = await request(app)
      .post('/api/admin/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'owner@example.com', password: 'x'.repeat(20_000) })

    expect(response.status).toBe(413)
    expect(response.body).toEqual({
      error: {
        code: 'payload_too_large',
        message: 'Unable to process this request.',
      },
    })
    expect(login).not.toHaveBeenCalled()
  })

  it('preserves refresh and CSRF cookies across an expired access check', async () => {
    let accessIsCurrent = true
    const handlers = createAuthHandlers({
      gateway: {
        signInWithPassword: vi.fn().mockResolvedValue({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresInSeconds: 3600,
          user: { id: 'admin-1', email: 'owner@example.com' },
        }),
        getUser: vi.fn().mockImplementation(async () =>
          accessIsCurrent
            ? { id: 'admin-1', email: 'owner@example.com' }
            : null,
        ),
        isActiveAdmin: vi.fn().mockResolvedValue(true),
        refreshSession: vi.fn().mockResolvedValue({
          accessToken: 'rotated-access',
          refreshToken: 'rotated-refresh',
          expiresInSeconds: 3600,
          user: { id: 'admin-1', email: 'owner@example.com' },
        }),
        signOut: vi.fn().mockResolvedValue(undefined),
      },
      rateLimiter: {
        consume: vi.fn().mockResolvedValue({
          allowed: true,
          retryAfterSeconds: 0,
        }),
      },
      allowedOrigins: ['http://localhost:5173'],
      secureCookies: false,
      csrfTokenFactory: () => 'csrf-token',
    })
    const agent = request.agent(createServerApp({ handlers }))

    await agent
      .post('/api/admin/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'owner@example.com', password: 'long-password' })
      .expect(200)

    accessIsCurrent = false
    await agent.get('/api/admin/auth/session').expect(401)

    const refresh = await agent
      .post('/api/admin/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', 'csrf-token')
      .expect(200)

    expect(refresh.body.data.user.email).toBe('owner@example.com')
  })
})
