import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'

import { validateDatabaseEnv } from '../server/db/env'
import { validateMigrationTarget } from '../server/db/migration-target'

function migrationTarget(): string {
  const targetIndex = process.argv.indexOf('--target')
  const target = targetIndex >= 0 ? process.argv[targetIndex + 1] : undefined
  return validateMigrationTarget(target, process.env)
}

async function main(): Promise<void> {
  const environment = validateDatabaseEnv(process.env)
  const target = migrationTarget()
  const client = new Client({ connectionString: environment.directUrl })

  console.log(`Applying database migrations to the declared ${target} branch.`)
  await client.connect()
  try {
    const database = drizzle(client)
    await migrate(database, { migrationsFolder: 'drizzle' })
    console.log('Database migrations completed.')
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Migration failed.'
  console.error(message)
  process.exitCode = 1
})
