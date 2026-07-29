import { describe, expect, it, vi } from 'vitest'

import {
  createAdminRepository,
  type AdminQueryExecutor,
} from '../../server/neon/admin-repository'

describe('Neon admin repository', () => {
  it('accepts only active Neon Auth users with the admin role', async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [{ allowed: true }],
    })
    const repository = createAdminRepository({
      execute,
    } as unknown as AdminQueryExecutor)

    await expect(
      repository.isActiveAdmin('5be1673a-0af7-4b21-b029-13059436c84f'),
    ).resolves.toBe(true)
    expect(execute).toHaveBeenCalledOnce()
  })

  it('rejects invalid identifiers before querying the database', async () => {
    const execute = vi.fn()
    const repository = createAdminRepository({
      execute,
    } as unknown as AdminQueryExecutor)

    await expect(repository.isActiveAdmin('not-a-uuid')).resolves.toBe(false)
    expect(execute).not.toHaveBeenCalled()
  })

  it('returns false when no active admin matches', async () => {
    const repository = createAdminRepository({
      execute: vi.fn().mockResolvedValue({ rows: [{ allowed: false }] }),
    } as unknown as AdminQueryExecutor)

    await expect(
      repository.isActiveAdmin('5be1673a-0af7-4b21-b029-13059436c84f'),
    ).resolves.toBe(false)
  })
})
