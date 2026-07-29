import { createInterface } from 'node:readline/promises'

import { provisionOwner } from '../server/admin/provision-owner'
import { validateAuthEnv } from '../server/config/env'
import { createDatabaseClient } from '../server/db/client'
import { validateDatabaseEnv } from '../server/db/env'
import { createAdminRepository } from '../server/neon/admin-repository'

async function readHidden(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error('Run this command in an interactive VS Code terminal.')
  }

  process.stdout.write(prompt)
  process.stdin.setEncoding('utf8')
  process.stdin.setRawMode(true)
  process.stdin.resume()

  return new Promise((resolve, reject) => {
    let value = ''

    const cleanup = () => {
      process.stdin.off('data', onData)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdout.write('\n')
    }

    const onData = (chunk: string | Buffer) => {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          cleanup()
          reject(new Error('Owner provisioning cancelled.'))
          return
        }
        if (character === '\r' || character === '\n') {
          cleanup()
          resolve(value)
          return
        }
        if (character === '\b' || character === '\u007f') {
          if (value.length > 0) {
            value = value.slice(0, -1)
            process.stdout.write('\b \b')
          }
          continue
        }
        if (character >= ' ') {
          value += character
          process.stdout.write('*')
        }
      }
    }

    process.stdin.on('data', onData)
  })
}

async function main(): Promise<void> {
  const authEnvironment = validateAuthEnv(process.env)
  const databaseEnvironment = validateDatabaseEnv(process.env)
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const email = await terminal.question('Owner email: ')
  const name = await terminal.question('Owner display name: ')
  terminal.close()

  const password = await readHidden('Password (12-128 characters): ')
  const confirmation = await readHidden('Confirm password: ')
  if (password !== confirmation) {
    throw new Error('Passwords do not match.')
  }

  const database = createDatabaseClient(databaseEnvironment.directUrl)
  const repository = createAdminRepository(database)
  const owner = await provisionOwner({
    authBaseUrl: authEnvironment.neonAuthBaseUrl,
    appOrigin: authEnvironment.allowedOrigins[0],
    details: { email, name, password },
    promoteAdmin: repository.promoteToAdmin,
  })
  console.log(`Admin owner created for ${owner.email}.`)
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Owner provisioning failed.'
  console.error(message)
  process.exitCode = 1
})
