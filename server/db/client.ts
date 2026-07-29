import {
  neon,
  type NeonQueryFunction,
} from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'

type NeonClientFactory = (
  connectionString: string,
) => NeonQueryFunction<false, false>

export function createDatabaseClient(
  pooledUrl: string,
  createClient: NeonClientFactory = neon,
) {
  return drizzle(createClient(pooledUrl))
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>

export async function checkDatabaseConnection(
  database: DatabaseClient,
): Promise<boolean> {
  const result = await database.execute<{ ok: number }>(
    sql`select 1::int as ok`,
  )

  return result.rows[0]?.ok === 1
}
