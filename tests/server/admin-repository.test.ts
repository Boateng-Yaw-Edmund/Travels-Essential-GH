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

  it('promotes an active Neon Auth user by UUID', async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [{ id: '5be1673a-0af7-4b21-b029-13059436c84f' }],
    })
    const repository = createAdminRepository({
      execute,
    } as unknown as AdminQueryExecutor)

    await expect(
      repository.promoteToAdmin(
        '5be1673a-0af7-4b21-b029-13059436c84f',
      ),
    ).resolves.toBe(true)
    expect(execute).toHaveBeenCalledOnce()
  })

  it('refuses to promote invalid or banned user identifiers', async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] })
    const repository = createAdminRepository({
      execute,
    } as unknown as AdminQueryExecutor)

    await expect(repository.promoteToAdmin('invalid')).resolves.toBe(false)
    await expect(
      repository.promoteToAdmin(
        '5be1673a-0af7-4b21-b029-13059436c84f',
      ),
    ).resolves.toBe(false)
    expect(execute).toHaveBeenCalledOnce()
  })

  it('resolves an unexpired Neon Auth session without exposing its token', async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          id: '5be1673a-0af7-4b21-b029-13059436c84f',
          email: 'OWNER@example.com',
          expiresAt: '2026-08-05T12:00:00.000Z',
        },
      ],
    })
    const repository = createAdminRepository({
      execute,
    } as unknown as AdminQueryExecutor)

    await expect(
      repository.findSession('opaque-session-token'),
    ).resolves.toEqual({
      user: {
        id: '5be1673a-0af7-4b21-b029-13059436c84f',
        email: 'owner@example.com',
      },
      expiresAt: '2026-08-05T12:00:00.000Z',
    })
  })

  it('revokes one matching Neon Auth session', async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [{ id: 'session-id' }],
    })
    const repository = createAdminRepository({
      execute,
    } as unknown as AdminQueryExecutor)

    await expect(
      repository.revokeSession('opaque-session-token'),
    ).resolves.toBe(true)
    expect(execute).toHaveBeenCalledOnce()
  })
})
