import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createServerApp } from '../../server/app'
import { createAuthHandlers } from '../../server/auth/handlers'
import type { ExpressRequestLike, ExpressResponseLike } from '../../server/auth/types'

type Handler = (
  request: ExpressRequestLike,
  response: ExpressResponseLike,
) => Promise<void>

const sessionToken = ['session', 'token'].join('-')

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

  it('renews the session and CSRF cookies through the protected endpoint', async () => {
    const handlers = createAuthHandlers({
      gateway: {
        signInWithPassword: vi.fn().mockResolvedValue({
          token: sessionToken,
          expiresInSeconds: 3600,
          user: { id: 'admin-1', email: 'owner@example.com' },
        }),
        getSession: vi.fn().mockResolvedValue({
          token: sessionToken,
          expiresInSeconds: 3600,
          user: { id: 'admin-1', email: 'owner@example.com' },
        }),
        isActiveAdmin: vi.fn().mockResolvedValue(true),
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

    await agent.get('/api/admin/auth/session').expect(200)

    const refresh = await agent
      .post('/api/admin/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', 'csrf-token')
      .expect(200)

    expect(refresh.body.data.user.email).toBe('owner@example.com')
  })
})
