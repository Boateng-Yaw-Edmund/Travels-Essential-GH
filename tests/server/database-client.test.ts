import type { NeonQueryFunction } from '@neondatabase/serverless'
import { describe, expect, it, vi } from 'vitest'

import {
  checkDatabaseConnection,
  createDatabaseClient,
  type DatabaseClient,
} from '../../server/db/client'

const pooledUrl =
  'postgresql://app:secret@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require'

describe('createDatabaseClient', () => {
  it('connects Drizzle to the supplied pooled Neon URL', () => {
    const neonClient = vi.fn() as unknown as NeonQueryFunction<false, false>
    const createClient = vi.fn(() => neonClient)

    const database = createDatabaseClient(pooledUrl, createClient)

    expect(createClient).toHaveBeenCalledWith(pooledUrl)
    expect(database.$client).toBe(neonClient)
  })
})

describe('checkDatabaseConnection', () => {
  it('returns true when Neon responds to the health query', async () => {
    const database = {
      execute: vi.fn().mockResolvedValue({
        rows: [{ ok: 1 }],
      }),
    } as unknown as DatabaseClient

    await expect(checkDatabaseConnection(database)).resolves.toBe(true)
  })

  it('returns false for an unexpected database response', async () => {
    const database = {
      execute: vi.fn().mockResolvedValue({
        rows: [],
      }),
    } as unknown as DatabaseClient

    await expect(checkDatabaseConnection(database)).resolves.toBe(false)
  })
})
