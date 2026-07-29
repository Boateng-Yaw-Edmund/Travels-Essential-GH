import { describe, expect, it } from 'vitest'

import { FixedWindowRateLimiter } from '../../server/security/fixed-window-rate-limiter'

describe('FixedWindowRateLimiter', () => {
  it('rejects requests beyond the configured window limit', async () => {
    let now = 1_000
    const limiter = new FixedWindowRateLimiter('test', () => now)
    const policy = { limit: 2, windowSeconds: 60 }

    await expect(limiter.consume('login:ip', policy)).resolves.toMatchObject({
      allowed: true,
    })
    await expect(limiter.consume('login:ip', policy)).resolves.toMatchObject({
      allowed: true,
    })
    await expect(limiter.consume('login:ip', policy)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    })

    now += 60_000
    await expect(limiter.consume('login:ip', policy)).resolves.toMatchObject({
      allowed: true,
    })
  })
})
