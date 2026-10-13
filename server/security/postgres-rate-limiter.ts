import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import type { DatabaseClient } from '../db/client'
import type { RateLimiter } from '../auth/types'

export function createPostgresRateLimiter(database: Pick<DatabaseClient, 'execute'>): RateLimiter {
  return {
    async consume(key, policy) {
      const digest = createHash('sha256').update(key).digest('hex')
      try {
        const result = await database.execute<{ count: number; retry: number }>(sql`
          insert into auth_rate_limits (key_hash, count, expires_at)
          values (${digest}, 1, now() + ${policy.windowSeconds} * interval '1 second')
          on conflict (key_hash) do update set
            count = case when auth_rate_limits.expires_at <= now() then 1
              else least(auth_rate_limits.count + 1, ${policy.limit + 1}) end,
            expires_at = case when auth_rate_limits.expires_at <= now()
              then now() + ${policy.windowSeconds} * interval '1 second'
              else auth_rate_limits.expires_at end
          returning count, greatest(1, ceil(extract(epoch from (expires_at - now()))))::int as retry
        `)
        const row = result.rows[0]
        return row && row.count <= policy.limit
          ? { allowed: true, retryAfterSeconds: 0 }
          : { allowed: false, retryAfterSeconds: row?.retry ?? policy.windowSeconds }
      } catch {
        console.error('Authentication rate limit store unavailable.')
        return { allowed: false, retryAfterSeconds: policy.windowSeconds }
      }
    },
  }
}
