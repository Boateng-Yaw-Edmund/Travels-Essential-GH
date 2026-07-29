import { describe, expect, it } from 'vitest'

import { validateDatabaseEnv } from '../../server/db/env'

const pooledUrl =
  'postgresql://app:secret@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require'
const directUrl =
  'postgresql://app:secret@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require'

describe('validateDatabaseEnv', () => {
  it('accepts separate pooled runtime and direct migration URLs', () => {
    expect(
      validateDatabaseEnv({
        DATABASE_URL: pooledUrl,
        DATABASE_URL_UNPOOLED: directUrl,
      }),
    ).toEqual({
      pooledUrl,
      directUrl,
    })
  })

  it('rejects missing database configuration without exposing credentials', () => {
    expect(() =>
      validateDatabaseEnv({
        DATABASE_URL: pooledUrl,
      }),
    ).toThrow('Server database configuration is incomplete.')
  })

  it.each([
    ['a non-Neon host', directUrl.replace('neon.tech', 'example.com'), directUrl],
    ['a direct runtime URL', directUrl, directUrl],
    ['a pooled migration URL', pooledUrl, pooledUrl],
    [
      'SSL disabled',
      pooledUrl.replace('sslmode=require', 'sslmode=disable'),
      directUrl,
    ],
  ])('rejects %s', (_case, runtimeUrl, migrationUrl) => {
    expect(() =>
      validateDatabaseEnv({
        DATABASE_URL: runtimeUrl,
        DATABASE_URL_UNPOOLED: migrationUrl,
      }),
    ).toThrow('Server database configuration is invalid.')
  })
})
