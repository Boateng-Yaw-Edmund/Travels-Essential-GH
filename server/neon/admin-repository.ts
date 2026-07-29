import { sql } from 'drizzle-orm'

import type { DatabaseClient } from '../db/client'

export type AdminQueryExecutor = Pick<DatabaseClient, 'execute'>

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function createAdminRepository(database: AdminQueryExecutor) {
  return {
    async isActiveAdmin(userId: string): Promise<boolean> {
      if (!UUID_PATTERN.test(userId)) return false

      const result = await database.execute<{ allowed: boolean }>(
        sql`
          select exists (
            select 1
            from neon_auth."user"
            where id = ${userId}::uuid
              and role = 'admin'
              and banned is not true
          ) as allowed
        `,
      )

      return result.rows[0]?.allowed === true
    },
  }
}
