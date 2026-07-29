import {
  checkDatabaseConnection,
  createDatabaseClient,
} from './client'
import { validateDatabaseEnv } from './env'

async function main() {
  const environment = validateDatabaseEnv(process.env)
  const database = createDatabaseClient(environment.pooledUrl)
  const connected = await checkDatabaseConnection(database)

  if (!connected) {
    throw new Error('Neon returned an unexpected health-check response.')
  }

  console.log('Neon development database connection verified.')
}

main().catch(() => {
  console.error('Unable to connect to the Neon development database.')
  process.exitCode = 1
})
