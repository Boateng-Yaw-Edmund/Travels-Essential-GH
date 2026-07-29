import type {
  RateLimiter,
  RateLimitResult,
} from '../auth/types'

interface WindowState {
  count: number
  startedAt: number
}

export class FixedWindowRateLimiter implements RateLimiter {
  private windows: ReadonlyMap<string, WindowState> = new Map()

  constructor(
    environment: 'development' | 'test',
    private readonly now: () => number = Date.now,
  ) {
    if (environment !== 'development' && environment !== 'test') {
      throw new Error('A distributed production rate limiter is required.')
    }
  }

  async consume(
    key: string,
    policy: { limit: number; windowSeconds: number },
  ): Promise<RateLimitResult> {
    const now = this.now()
    const duration = policy.windowSeconds * 1000
    const activeWindows = new Map(
      [...this.windows].filter(
        ([, state]) => now - state.startedAt < duration,
      ),
    )
    const existing = activeWindows.get(key)
    const current =
      !existing || now - existing.startedAt >= duration
        ? { count: 0, startedAt: now }
        : existing

    if (current.count >= policy.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((current.startedAt + duration - now) / 1000),
        ),
      }
    }

    this.windows = new Map(activeWindows).set(key, {
      ...current,
      count: current.count + 1,
    })
    return {
      allowed: true,
      retryAfterSeconds: 0,
    }
  }
}
