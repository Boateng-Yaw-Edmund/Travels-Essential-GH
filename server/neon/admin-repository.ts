import { sql } from 'drizzle-orm'

import type { DatabaseClient } from '../db/client'
import type { AdminUser } from '../auth/types'

export type AdminQueryExecutor = Pick<DatabaseClient, 'execute'>

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface StoredAuthSession {
  user: AdminUser
  expiresAt: string
}

function isValidSessionToken(token: string): boolean {
  return (
    token.length >= 8 &&
    token.length <= 2048 &&
    !/\s/.test(token) &&
    !Array.from(token).some((character) => character.charCodeAt(0) < 32)
  )
}

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

    async promoteToAdmin(userId: string): Promise<boolean> {
      if (!UUID_PATTERN.test(userId)) return false

      const result = await database.execute<{ id: string }>(
        sql`
          update neon_auth."user"
          set role = 'admin',
              "updatedAt" = now()
          where id = ${userId}::uuid
            and banned is not true
          returning id::text
        `,
      )

      return result.rows.length === 1
    },

    async findSession(token: string): Promise<StoredAuthSession | null> {
      if (!isValidSessionToken(token)) return null

      const result = await database.execute<{
        id: string
        email: string
        expiresAt: string
      }>(
        sql`
          select
            users.id::text as id,
            users.email,
            sessions."expiresAt"::text as "expiresAt"
          from neon_auth.session as sessions
          join neon_auth."user" as users
            on users.id = sessions."userId"
          where sessions.token = ${token}
            and sessions."expiresAt" > now()
            and users.banned is not true
          limit 1
        `,
      )
      const row = result.rows[0]
      if (!row) return null

      return {
        user: {
          id: row.id,
          email: row.email.toLowerCase(),
        },
        expiresAt: row.expiresAt,
      }
    },

    async revokeSession(token: string): Promise<boolean> {
      if (!isValidSessionToken(token)) return false

      const result = await database.execute<{ id: string }>(
        sql`
          delete from neon_auth.session
          where token = ${token}
          returning id::text
        `,
      )

      return result.rows.length === 1
    },
  }
}
