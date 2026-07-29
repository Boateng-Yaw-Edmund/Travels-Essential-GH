import { describe, expect, it, vi } from 'vitest'

import { createSupabaseAuthGateway } from '../../server/supabase/auth-gateway'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('Supabase auth gateway', () => {
  it('maps a password grant to the internal session model', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        user: { id: 'user-id', email: 'OWNER@example.com' },
      }),
    )
    const gateway = createSupabaseAuthGateway({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-key',
      fetch,
    })

    await expect(
      gateway.signInWithPassword('owner@example.com', 'password123'),
    ).resolves.toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresInSeconds: 3600,
      user: { id: 'user-id', email: 'owner@example.com' },
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/token?grant_type=password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'owner@example.com',
          password: 'password123',
        }),
      }),
    )
  })

  it('treats a rejected password grant as invalid credentials', async () => {
    const gateway = createSupabaseAuthGateway({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-key',
      fetch: vi.fn().mockResolvedValue(jsonResponse(400, { error: 'bad' })),
    })

    await expect(
      gateway.signInWithPassword('owner@example.com', 'wrong-password'),
    ).resolves.toBeNull()
  })

  it('checks active admin membership through RLS using the user token', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, [{ user_id: 'user-id' }]),
    )
    const gateway = createSupabaseAuthGateway({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-key',
      fetch,
    })

    await expect(
      gateway.isActiveAdmin('user-id', 'access-token'),
    ).resolves.toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/admin_profiles?'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          apikey: 'public-key',
        }),
      }),
    )
  })

  it('throws a generic upstream error for server failures', async () => {
    const gateway = createSupabaseAuthGateway({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-key',
      fetch: vi.fn().mockResolvedValue(jsonResponse(503, { details: 'secret' })),
    })

    await expect(gateway.getUser('access-token')).rejects.toThrow(
      'Authentication provider request failed.',
    )
  })

  it('refreshes sessions and reads authenticated users', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          user: { id: 'user-id', email: 'owner@example.com' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { id: 'user-id', email: 'owner@example.com' }),
      )
    const gateway = createSupabaseAuthGateway({
      supabaseUrl: 'https://project.supabase.co/',
      supabaseAnonKey: 'public-key',
      fetch,
    })

    await expect(gateway.refreshSession('refresh')).resolves.toMatchObject({
      accessToken: 'new-access',
    })
    await expect(gateway.getUser('new-access')).resolves.toEqual({
      id: 'user-id',
      email: 'owner@example.com',
    })
  })

  it('returns null for rejected or malformed provider identity payloads', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, { id: 'missing-email' }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'incomplete' }))
    const gateway = createSupabaseAuthGateway({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-key',
      fetch,
    })

    await expect(gateway.getUser('rejected')).resolves.toBeNull()
    await expect(gateway.getUser('malformed')).resolves.toBeNull()
    await expect(gateway.refreshSession('malformed')).resolves.toBeNull()
  })

  it('returns false when RLS rejects admin lookup or finds no row', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(403, {}))
      .mockResolvedValueOnce(jsonResponse(200, []))
    const gateway = createSupabaseAuthGateway({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-key',
      fetch,
    })

    await expect(gateway.isActiveAdmin('user-id', 'denied')).resolves.toBe(
      false,
    )
    await expect(gateway.isActiveAdmin('user-id', 'allowed')).resolves.toBe(
      false,
    )
  })

  it('accepts normal and already-expired remote logout sessions', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(401, {}))
    const gateway = createSupabaseAuthGateway({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-key',
      fetch,
    })

    await expect(gateway.signOut('active')).resolves.toBeUndefined()
    await expect(gateway.signOut('expired')).resolves.toBeUndefined()
  })

  it('rejects unexpected non-auth provider failures', async () => {
    const gateway = createSupabaseAuthGateway({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-key',
      fetch: vi.fn().mockResolvedValue(jsonResponse(409, {})),
    })

    await expect(gateway.getUser('access')).rejects.toThrow(
      'Authentication provider request failed.',
    )
    await expect(gateway.signOut('access')).rejects.toThrow(
      'Authentication provider request failed.',
    )
  })
})
