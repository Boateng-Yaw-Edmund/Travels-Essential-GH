import { describe, expect, it, vi } from 'vitest'

import { createNeonAuthGateway } from '../../server/neon/auth-gateway'

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

const user = {
  id: '5be1673a-0af7-4b21-b029-13059436c84f',
  email: 'OWNER@example.com',
}
const sessionToken = ['session', 'token'].join('-')
const bodySessionToken = ['body', 'session', 'token'].join('-')

describe('Neon Auth gateway', () => {
  it('signs in with Better Auth and keeps the bearer token server-side', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(
        200,
        { user },
        { 'set-auth-token': 'session-token' },
      ),
    )
    const gateway = createNeonAuthGateway({
      authBaseUrl: 'https://example.neonauth.us-east-2.aws.neon.tech/auth/',
      appOrigin: 'http://localhost:5173',
      fetch,
      isActiveAdmin: vi.fn(),
      findSession: vi.fn(),
      revokeSession: vi.fn(),
      sessionMaxAgeSeconds: 604_800,
    })

    await expect(
      gateway.signInWithPassword('owner@example.com', 'password123'),
    ).resolves.toEqual({
      token: sessionToken,
      expiresInSeconds: 604_800,
      user: {
        ...user,
        email: 'owner@example.com',
      },
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://example.neonauth.us-east-2.aws.neon.tech/auth/sign-in/email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Origin: 'http://localhost:5173',
        }),
        body: JSON.stringify({
          email: 'owner@example.com',
          password: 'password123',
          rememberMe: true,
        }),
      }),
    )
  })

  it('returns null for rejected credentials or a malformed sign-in response', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, { user }))
    const gateway = createNeonAuthGateway({
      authBaseUrl: 'https://example.neonauth.us-east-2.aws.neon.tech/auth',
      appOrigin: 'http://localhost:5173',
      fetch,
      isActiveAdmin: vi.fn(),
      findSession: vi.fn(),
      revokeSession: vi.fn(),
    })

    await expect(
      gateway.signInWithPassword('owner@example.com', 'wrong-password'),
    ).resolves.toBeNull()
    await expect(
      gateway.signInWithPassword('owner@example.com', 'password123'),
    ).resolves.toBeNull()
  })

  it('accepts Neon Auth bearer tokens returned in the JSON body', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        token: bodySessionToken,
        user,
      }),
    )
    const gateway = createNeonAuthGateway({
      authBaseUrl:
        'https://example.neonauth.us-east-2.aws.neon.tech/auth',
      appOrigin: 'http://localhost:5173',
      fetch,
      isActiveAdmin: vi.fn(),
      findSession: vi.fn(),
      revokeSession: vi.fn(),
    })

    await expect(
      gateway.signInWithPassword('owner@example.com', 'password123'),
    ).resolves.toMatchObject({
      token: bodySessionToken,
      user: { email: 'owner@example.com' },
    })
  })

  it('validates a database session and derives its remaining lifetime', async () => {
    const now = new Date('2026-07-29T12:00:00.000Z')
    const findSession = vi.fn().mockResolvedValue({
      expiresAt: '2026-07-29T13:00:00.000Z',
      user,
    })
    const fetch = vi.fn()
    const gateway = createNeonAuthGateway({
      authBaseUrl: 'https://example.neonauth.us-east-2.aws.neon.tech/auth',
      appOrigin: 'http://localhost:5173',
      fetch,
      isActiveAdmin: vi.fn(),
      findSession,
      revokeSession: vi.fn(),
      now: () => now,
    })

    await expect(gateway.getSession('session-token')).resolves.toEqual({
      token: sessionToken,
      expiresInSeconds: 3600,
      user: {
        ...user,
        email: 'owner@example.com',
      },
    })
    expect(findSession).toHaveBeenCalledWith('session-token')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('treats expired, rejected, and malformed sessions as unauthenticated', async () => {
    const findSession = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        expiresAt: '2026-07-29T11:59:59.000Z',
        user,
      })
      .mockResolvedValueOnce({ expiresAt: 'invalid', user })
    const gateway = createNeonAuthGateway({
      authBaseUrl: 'https://example.neonauth.us-east-2.aws.neon.tech/auth',
      appOrigin: 'http://localhost:5173',
      fetch: vi.fn(),
      isActiveAdmin: vi.fn(),
      findSession,
      revokeSession: vi.fn(),
      now: () => new Date('2026-07-29T12:00:00.000Z'),
    })

    await expect(gateway.getSession('missing')).resolves.toBeNull()
    await expect(gateway.getSession('expired')).resolves.toBeNull()
    await expect(gateway.getSession('malformed')).resolves.toBeNull()
  })

  it('delegates active-admin authorization to Neon Postgres', async () => {
    const isActiveAdmin = vi.fn().mockResolvedValue(true)
    const gateway = createNeonAuthGateway({
      authBaseUrl: 'https://example.neonauth.us-east-2.aws.neon.tech/auth',
      appOrigin: 'http://localhost:5173',
      fetch: vi.fn(),
      isActiveAdmin,
      findSession: vi.fn(),
      revokeSession: vi.fn(),
    })

    await expect(gateway.isActiveAdmin(user.id)).resolves.toBe(true)
    expect(isActiveAdmin).toHaveBeenCalledWith(user.id)
  })

  it('revokes database sessions and accepts an already-expired session', async () => {
    const revokeSession = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    const gateway = createNeonAuthGateway({
      authBaseUrl: 'https://example.neonauth.us-east-2.aws.neon.tech/auth',
      appOrigin: 'http://localhost:5173',
      fetch: vi.fn(),
      isActiveAdmin: vi.fn(),
      findSession: vi.fn(),
      revokeSession,
    })

    await expect(gateway.signOut('active')).resolves.toBeUndefined()
    await expect(gateway.signOut('expired')).resolves.toBeUndefined()
    expect(revokeSession).toHaveBeenCalledTimes(2)
  })

  it('uses generic errors for password-provider failures without leaking response data', async () => {
    const gateway = createNeonAuthGateway({
      authBaseUrl: 'https://example.neonauth.us-east-2.aws.neon.tech/auth',
      appOrigin: 'http://localhost:5173',
      fetch: vi.fn().mockResolvedValue(jsonResponse(503, { secret: 'detail' })),
      isActiveAdmin: vi.fn(),
      findSession: vi.fn(),
      revokeSession: vi.fn(),
    })

    await expect(
      gateway.signInWithPassword('owner@example.com', 'password123'),
    ).rejects.toThrow(
      'Authentication provider request failed.',
    )
  })
})
