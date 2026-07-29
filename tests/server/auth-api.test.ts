import { describe, expect, it, vi } from 'vitest'

import { createAuthHandlers } from '../../server/auth/handlers'
import type {
  AuthGateway,
  AuthSession,
  ExpressRequestLike,
  ExpressResponseLike,
  RateLimiter,
} from '../../server/auth/types'

const sessionToken = ['session', 'token'].join('-')

const session: AuthSession = {
  token: sessionToken,
  expiresInSeconds: 3600,
  user: {
    id: '5be1673a-0af7-4b21-b029-13059436c84f',
    email: 'owner@example.com',
  },
}

function createGateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    signInWithPassword: vi.fn().mockResolvedValue(session),
    getSession: vi.fn().mockResolvedValue(session),
    isActiveAdmin: vi.fn().mockResolvedValue(true),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createLimiter(allowed = true): RateLimiter {
  return {
    consume: vi.fn().mockResolvedValue({
      allowed,
      retryAfterSeconds: allowed ? 0 : 60,
    }),
  }
}

function createRequest(
  overrides: Partial<ExpressRequestLike> = {},
): ExpressRequestLike {
  return {
    headers: {
      origin: 'https://shop.example.com',
    },
    body: {},
    ip: '192.0.2.1',
    ...overrides,
  }
}

function createResponse(): ExpressResponseLike & {
  statusCode: number
  payload: unknown
  responseHeaders: Record<string, string | string[]>
} {
  return {
    statusCode: 200,
    payload: undefined,
    responseHeaders: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.payload = body
      return this
    },
    setHeader(name, value) {
      this.responseHeaders[name] = value
      return this
    },
  }
}

describe('admin auth handlers', () => {
  it('logs in an admin and stores the session in a secure httpOnly cookie', async () => {
    const gateway = createGateway()
    const handlers = createAuthHandlers({
      gateway,
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
      secureCookies: true,
      csrfTokenFactory: () => 'csrf-token',
    })
    const response = createResponse()

    await handlers.login(
      createRequest({
        body: { email: ' OWNER@example.com ', password: 'long-password' },
      }),
      response,
    )

    expect(response.statusCode).toBe(200)
    expect(response.payload).toEqual({
      data: {
        user: session.user,
        csrfToken: 'csrf-token',
      },
    })
    expect(gateway.signInWithPassword).toHaveBeenCalledWith(
      'owner@example.com',
      'long-password',
    )
    expect(response.responseHeaders['Set-Cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^tegh_session=session-token; Path=\/api\/admin; HttpOnly; Secure; SameSite=Strict;/,
        ),
        expect.stringMatching(
          /^tegh_csrf=csrf-token; Path=\/; Secure; SameSite=Strict;/,
        ),
      ]),
    )
  })

  it('returns the same generic error for bad credentials and non-admin users', async () => {
    const badCredentials = createAuthHandlers({
      gateway: createGateway({
        signInWithPassword: vi.fn().mockResolvedValue(null),
      }),
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
      csrfTokenFactory: () => 'csrf-token',
    })
    const nonAdmin = createAuthHandlers({
      gateway: createGateway({
        isActiveAdmin: vi.fn().mockResolvedValue(false),
      }),
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
      csrfTokenFactory: () => 'csrf-token',
    })
    const firstResponse = createResponse()
    const secondResponse = createResponse()
    const request = createRequest({
      body: { email: 'user@example.com', password: 'long-password' },
    })

    await badCredentials.login(request, firstResponse)
    await nonAdmin.login(request, secondResponse)

    expect(firstResponse.statusCode).toBe(401)
    expect(secondResponse.statusCode).toBe(401)
    expect(firstResponse.payload).toEqual(secondResponse.payload)
    expect(secondResponse.responseHeaders['Set-Cookie']).toBeUndefined()
  })

  it('rejects malformed login input before calling the gateway', async () => {
    const gateway = createGateway()
    const handlers = createAuthHandlers({
      gateway,
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
    })
    const response = createResponse()

    await handlers.login(
      createRequest({ body: { email: 'not-an-email', password: 'short' } }),
      response,
    )

    expect(response.statusCode).toBe(400)
    expect(response.payload).toEqual({
      error: {
        code: 'invalid_request',
        message: 'Unable to process this request.',
      },
    })
    expect(gateway.signInWithPassword).not.toHaveBeenCalled()
  })

  it('rejects cross-origin login requests', async () => {
    const gateway = createGateway()
    const handlers = createAuthHandlers({
      gateway,
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
    })
    const response = createResponse()

    await handlers.login(
      createRequest({
        headers: { origin: 'https://attacker.example' },
        body: { email: 'owner@example.com', password: 'long-password' },
      }),
      response,
    )

    expect(response.statusCode).toBe(403)
    expect(gateway.signInWithPassword).not.toHaveBeenCalled()
  })

  it('rate limits login attempts before authenticating', async () => {
    const gateway = createGateway()
    const handlers = createAuthHandlers({
      gateway,
      rateLimiter: createLimiter(false),
      allowedOrigins: ['https://shop.example.com'],
    })
    const response = createResponse()

    await handlers.login(
      createRequest({
        body: { email: 'owner@example.com', password: 'long-password' },
      }),
      response,
    )

    expect(response.statusCode).toBe(429)
    expect(response.responseHeaders['Retry-After']).toBe('60')
    expect(gateway.signInWithPassword).not.toHaveBeenCalled()
  })

  it('returns the current active admin from a session cookie', async () => {
    const gateway = createGateway()
    const handlers = createAuthHandlers({
      gateway,
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
    })
    const response = createResponse()

    await handlers.session(
      createRequest({
        headers: {
          cookie: 'tegh_session=session-token; tegh_csrf=csrf-token',
        },
      }),
      response,
    )

    expect(response.statusCode).toBe(200)
    expect(response.payload).toEqual({
      data: { user: session.user, csrfToken: 'csrf-token' },
    })
    expect(gateway.getSession).toHaveBeenCalledWith('session-token')
  })

  it('requires a matching double-submit token to log out', async () => {
    const gateway = createGateway()
    const handlers = createAuthHandlers({
      gateway,
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
    })
    const response = createResponse()

    await handlers.logout(
      createRequest({
        headers: {
          origin: 'https://shop.example.com',
          cookie: 'tegh_session=session-token; tegh_csrf=cookie-token',
          'x-csrf-token': 'different-token',
        },
      }),
      response,
    )

    expect(response.statusCode).toBe(403)
    expect(gateway.signOut).not.toHaveBeenCalled()
  })

  it('logs out and expires all auth cookies', async () => {
    const gateway = createGateway()
    const handlers = createAuthHandlers({
      gateway,
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
    })
    const response = createResponse()

    await handlers.logout(
      createRequest({
        headers: {
          origin: 'https://shop.example.com',
          cookie: 'tegh_session=session-token; tegh_csrf=csrf-token',
          'x-csrf-token': 'csrf-token',
        },
      }),
      response,
    )

    expect(response.statusCode).toBe(200)
    expect(gateway.signOut).toHaveBeenCalledWith('session-token')
    expect(response.responseHeaders['Set-Cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^tegh_session=;/),
        expect.stringMatching(/^tegh_csrf=;/),
      ]),
    )
  })

  it('renews a session only through protected POST semantics', async () => {
    const gateway = createGateway()
    const handlers = createAuthHandlers({
      gateway,
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
      csrfTokenFactory: () => 'new-csrf-token',
    })
    const response = createResponse()

    await handlers.refresh(
      createRequest({
        headers: {
          origin: 'https://shop.example.com',
          cookie: 'tegh_session=session-token; tegh_csrf=old-token',
          'x-csrf-token': 'old-token',
        },
      }),
      response,
    )

    expect(response.statusCode).toBe(200)
    expect(gateway.getSession).toHaveBeenCalledWith('session-token')
    expect(response.payload).toEqual({
      data: {
        user: session.user,
        csrfToken: 'new-csrf-token',
      },
    })
    expect(response.responseHeaders['Set-Cookie']).toBeDefined()
  })

  it('expires an invalid session cookie', async () => {
    const gateway = createGateway({
      getSession: vi.fn().mockResolvedValue(null),
    })
    const handlers = createAuthHandlers({
      gateway,
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
    })
    const response = createResponse()

    await handlers.session(
      createRequest({
        headers: { cookie: 'tegh_session=invalid-session' },
      }),
      response,
    )

    expect(response.statusCode).toBe(401)
    expect(gateway.getSession).toHaveBeenCalledWith('invalid-session')
    expect(response.responseHeaders['Set-Cookie']).toEqual([
      expect.stringMatching(/^tegh_session=;.*Max-Age=0/),
    ])
  })

  it('uses generic service errors when the auth provider is unavailable', async () => {
    const gateway = createGateway({
      signInWithPassword: vi.fn().mockRejectedValue(new Error('private detail')),
      getSession: vi.fn().mockRejectedValue(new Error('private detail')),
    })
    const handlers = createAuthHandlers({
      gateway,
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
    })
    const loginResponse = createResponse()
    const sessionResponse = createResponse()

    await handlers.login(
      createRequest({
        body: { email: 'owner@example.com', password: 'long-password' },
      }),
      loginResponse,
    )
    await handlers.session(
      createRequest({ headers: { cookie: 'tegh_session=session-token' } }),
      sessionResponse,
    )

    expect(loginResponse.statusCode).toBe(503)
    expect(sessionResponse.statusCode).toBe(503)
    expect(JSON.stringify(loginResponse.payload)).not.toContain('private')
  })

  it('still clears the local session if upstream logout fails', async () => {
    const handlers = createAuthHandlers({
      gateway: createGateway({
        signOut: vi.fn().mockRejectedValue(new Error('offline')),
      }),
      rateLimiter: createLimiter(),
      allowedOrigins: ['https://shop.example.com'],
    })
    const response = createResponse()

    await handlers.logout(
      createRequest({
        headers: {
          Origin: ['https://shop.example.com'],
          Cookie:
            'tegh_session=session-token; tegh_csrf=csrf-token; broken=%E0%A4%A',
          'X-CSRF-Token': 'csrf-token',
        },
        ip: undefined,
        socket: { remoteAddress: '192.0.2.2' },
      }),
      response,
    )

    expect(response.statusCode).toBe(200)
    expect(response.responseHeaders['Set-Cookie']).toBeDefined()
  })
})
