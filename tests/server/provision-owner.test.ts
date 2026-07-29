import { describe, expect, it, vi } from 'vitest'

import {
  provisionOwner,
  validateOwnerDetails,
} from '../../server/admin/provision-owner'

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

const owner = {
  id: '5be1673a-0af7-4b21-b029-13059436c84f',
  email: 'OWNER@example.com',
  name: 'Store Owner',
}
const bodySessionToken = ['body', 'session'].join('-')
const fixturePassword = ['a', 'strong', 'password'].join('-')
const shortPassword = ['too', 'short'].join('-')

describe('owner provisioning', () => {
  it('validates and normalizes owner details', () => {
    expect(
      validateOwnerDetails({
        email: ' OWNER@example.com ',
        name: ' Store Owner ',
        password: fixturePassword,
      }),
    ).toEqual({
      email: 'owner@example.com',
      name: 'Store Owner',
      password: fixturePassword,
    })
  })

  it.each([
    [{ email: 'invalid', name: 'Store Owner', password: fixturePassword }],
    [{ email: 'owner@example.com', name: '', password: fixturePassword }],
    [{ email: 'owner@example.com', name: 'Store Owner', password: shortPassword }],
  ])('rejects invalid owner details', (details) => {
    expect(() => validateOwnerDetails(details)).toThrow(
      'Owner account details are invalid.',
    )
  })

  it('creates, promotes, and signs out the owner without returning credentials', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          { user: owner },
          { 'set-auth-token': 'provisioning-session' },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    const promoteAdmin = vi.fn().mockResolvedValue(true)

    await expect(
      provisionOwner({
        authBaseUrl:
          'https://example.neonauth.us-east-2.aws.neon.tech/auth/',
        appOrigin: 'http://localhost:5173',
        details: {
          email: owner.email,
          name: owner.name,
          password: fixturePassword,
        },
        fetch,
        promoteAdmin,
      }),
    ).resolves.toEqual({
      id: owner.id,
      email: 'owner@example.com',
      name: owner.name,
    })

    expect(promoteAdmin).toHaveBeenCalledWith(owner.id)
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://example.neonauth.us-east-2.aws.neon.tech/auth/sign-up/email',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          callbackURL: 'http://localhost:5173/admin',
          email: 'owner@example.com',
          name: owner.name,
          password: fixturePassword,
        }),
        headers: expect.objectContaining({
          Origin: 'http://localhost:5173',
        }),
      }),
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://example.neonauth.us-east-2.aws.neon.tech/auth/sign-out',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer provisioning-session',
        }),
      }),
    )
  })

  it('does not promote rejected or malformed sign-ups', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(422, {}))
      .mockResolvedValueOnce(jsonResponse(200, { user: { id: 'invalid' } }))
    const promoteAdmin = vi.fn()
    const options = {
      authBaseUrl:
        'https://example.neonauth.us-east-2.aws.neon.tech/auth',
      appOrigin: 'http://localhost:5173',
      details: {
        email: owner.email,
        name: owner.name,
        password: fixturePassword,
      },
      fetch,
      promoteAdmin,
    }

    await expect(provisionOwner(options)).rejects.toThrow(
      'Owner account could not be created.',
    )
    await expect(provisionOwner(options)).rejects.toThrow(
      'Owner account could not be created.',
    )
    expect(promoteAdmin).not.toHaveBeenCalled()
  })

  it('accepts Neon Auth session tokens returned in the JSON body', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          token: bodySessionToken,
          user: owner,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    await expect(
      provisionOwner({
        authBaseUrl:
          'https://example.neonauth.us-east-2.aws.neon.tech/auth',
        appOrigin: 'http://localhost:5173',
        details: {
          email: owner.email,
          name: owner.name,
          password: fixturePassword,
        },
        fetch,
        promoteAdmin: vi.fn().mockResolvedValue(true),
      }),
    ).resolves.toMatchObject({ id: owner.id })

    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/sign-out$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${bodySessionToken}`,
        }),
      }),
    )
  })

  it('revokes the provisioning session if authorization fails', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          200,
          { user: owner },
          { 'set-auth-token': 'provisioning-session' },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    await expect(
      provisionOwner({
        authBaseUrl:
          'https://example.neonauth.us-east-2.aws.neon.tech/auth',
        appOrigin: 'http://localhost:5173',
        details: {
          email: owner.email,
          name: owner.name,
          password: fixturePassword,
        },
        fetch,
        promoteAdmin: vi.fn().mockResolvedValue(false),
      }),
    ).rejects.toThrow('Owner account could not be authorized.')

    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
