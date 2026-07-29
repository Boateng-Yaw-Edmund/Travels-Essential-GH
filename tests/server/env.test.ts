import { describe, expect, it } from 'vitest'

import { validateAuthEnv } from '../../server/config/env'

describe('validateAuthEnv', () => {
  it('parses required Supabase and same-origin settings', () => {
    expect(
      validateAuthEnv({
        SUPABASE_URL: 'https://project.supabase.co/',
        SUPABASE_ANON_KEY: 'public-anon-key',
        AUTH_ALLOWED_ORIGINS:
          'https://shop.example.com, https://www.shop.example.com',
        AUTH_COOKIE_SECURE: 'true',
      }),
    ).toEqual({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-anon-key',
      allowedOrigins: [
        'https://shop.example.com',
        'https://www.shop.example.com',
      ],
      secureCookies: true,
    })
  })

  it('fails fast without naming the missing secret value', () => {
    expect(() =>
      validateAuthEnv({
        SUPABASE_URL: 'https://project.supabase.co',
        AUTH_ALLOWED_ORIGINS: 'https://shop.example.com',
      }),
    ).toThrow('Server authentication configuration is incomplete.')
  })

  it('rejects wildcard and non-https production origins', () => {
    expect(() =>
      validateAuthEnv({
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_ANON_KEY: 'public-anon-key',
        AUTH_ALLOWED_ORIGINS: '*',
      }),
    ).toThrow('Server authentication configuration is invalid.')

    expect(() =>
      validateAuthEnv({
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_ANON_KEY: 'public-anon-key',
        AUTH_ALLOWED_ORIGINS: 'http://shop.example.com',
      }),
    ).toThrow('Server authentication configuration is invalid.')
  })

  it('allows insecure cookies only for explicit loopback development', () => {
    expect(
      validateAuthEnv({
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_ANON_KEY: 'public-anon-key',
        AUTH_ALLOWED_ORIGINS: 'http://localhost:5173',
        AUTH_COOKIE_SECURE: 'false',
      }),
    ).toMatchObject({
      allowedOrigins: ['http://localhost:5173'],
      secureCookies: false,
    })

    expect(() =>
      validateAuthEnv({
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_ANON_KEY: 'public-anon-key',
        AUTH_ALLOWED_ORIGINS: 'https://shop.example.com',
        AUTH_COOKIE_SECURE: 'false',
      }),
    ).toThrow('Server authentication configuration is invalid.')
  })
})
