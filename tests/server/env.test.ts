import { describe, expect, it } from 'vitest'

import { validateAuthEnv } from '../../server/config/env'

describe('validateAuthEnv', () => {
  it('parses required Neon Auth and same-origin settings', () => {
    expect(
      validateAuthEnv({
        NEON_AUTH_BASE_URL:
          'https://example.neonauth.us-east-2.aws.neon.tech/auth/',
        AUTH_ALLOWED_ORIGINS:
          'https://shop.example.com, https://www.shop.example.com',
        AUTH_COOKIE_SECURE: 'true',
      }),
    ).toEqual({
      neonAuthBaseUrl:
        'https://example.neonauth.us-east-2.aws.neon.tech/auth',
      allowedOrigins: [
        'https://shop.example.com',
        'https://www.shop.example.com',
      ],
      secureCookies: true,
    })
  })

  it('fails fast when the auth service URL is missing', () => {
    expect(() =>
      validateAuthEnv({
        AUTH_ALLOWED_ORIGINS: 'https://shop.example.com',
      }),
    ).toThrow('Server authentication configuration is incomplete.')
  })

  it('rejects wildcard and non-https production origins', () => {
    expect(() =>
      validateAuthEnv({
        NEON_AUTH_BASE_URL:
          'https://example.neonauth.us-east-2.aws.neon.tech/auth',
        AUTH_ALLOWED_ORIGINS: '*',
      }),
    ).toThrow('Server authentication configuration is invalid.')

    expect(() =>
      validateAuthEnv({
        NEON_AUTH_BASE_URL:
          'https://example.neonauth.us-east-2.aws.neon.tech/auth',
        AUTH_ALLOWED_ORIGINS: 'http://shop.example.com',
      }),
    ).toThrow('Server authentication configuration is invalid.')
  })

  it('allows insecure cookies only for explicit loopback development', () => {
    expect(
      validateAuthEnv({
        NEON_AUTH_BASE_URL:
          'https://example.neonauth.us-east-2.aws.neon.tech/auth',
        AUTH_ALLOWED_ORIGINS: 'http://localhost:5173',
        AUTH_COOKIE_SECURE: 'false',
      }),
    ).toMatchObject({
      allowedOrigins: ['http://localhost:5173'],
      secureCookies: false,
    })

    expect(() =>
      validateAuthEnv({
        NEON_AUTH_BASE_URL:
          'https://example.neonauth.us-east-2.aws.neon.tech/auth',
        AUTH_ALLOWED_ORIGINS: 'https://shop.example.com',
        AUTH_COOKIE_SECURE: 'false',
      }),
    ).toThrow('Server authentication configuration is invalid.')
  })

  it('rejects non-Neon and non-auth service URLs', () => {
    expect(() =>
      validateAuthEnv({
        NEON_AUTH_BASE_URL: 'https://auth.example.com/auth',
        AUTH_ALLOWED_ORIGINS: 'https://shop.example.com',
      }),
    ).toThrow('Server authentication configuration is invalid.')

    expect(() =>
      validateAuthEnv({
        NEON_AUTH_BASE_URL:
          'https://example.neonauth.us-east-2.aws.neon.tech/not-auth',
        AUTH_ALLOWED_ORIGINS: 'https://shop.example.com',
      }),
    ).toThrow('Server authentication configuration is invalid.')
  })
})
