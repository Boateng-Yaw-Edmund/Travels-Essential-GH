export interface OwnerDetails {
  email: string
  name: string
  password: string
}

interface ProvisionOwnerOptions {
  authBaseUrl: string
  appOrigin: string
  details: OwnerDetails
  promoteAdmin: (userId: string) => Promise<boolean>
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
}

interface ProvisionedOwner {
  id: string
  email: string
  name: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateOwnerDetails(details: OwnerDetails): OwnerDetails {
  const email = details.email.trim().toLowerCase()
  const name = details.name.trim()

  if (
    !EMAIL_PATTERN.test(email) ||
    email.length > 254 ||
    name.length < 2 ||
    name.length > 100 ||
    details.password.length < 12 ||
    details.password.length > 128
  ) {
    throw new Error('Owner account details are invalid.')
  }

  return {
    email,
    name,
    password: details.password,
  }
}

function parseOwner(value: unknown): ProvisionedOwner | null {
  if (!value || typeof value !== 'object') return null
  const user = (value as Record<string, unknown>).user
  if (!user || typeof user !== 'object') return null

  const candidate = user as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    !UUID_PATTERN.test(candidate.id) ||
    typeof candidate.email !== 'string' ||
    typeof candidate.name !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    email: candidate.email.toLowerCase(),
    name: candidate.name,
  }
}

export async function provisionOwner(
  options: ProvisionOwnerOptions,
): Promise<ProvisionedOwner> {
  const details = validateOwnerDetails(options.details)
  const request = options.fetch ?? globalThis.fetch
  const baseUrl = options.authBaseUrl.replace(/\/+$/, '')
  const timeoutMs = options.timeoutMs ?? 10_000
  const callbackURL = new URL('/admin', options.appOrigin).toString()

  const response = await request(`${baseUrl}/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: options.appOrigin,
    },
    body: JSON.stringify({ callbackURL, ...details }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) {
    throw new Error('Owner account could not be created.')
  }

  const payload = await response.json()
  const owner = parseOwner(payload)
  const bodyToken =
    payload &&
    typeof payload === 'object' &&
    typeof (payload as Record<string, unknown>).token === 'string'
      ? (payload as Record<string, string>).token
      : null
  const sessionToken =
    response.headers.get('set-auth-token') ?? bodyToken
  if (!owner || !sessionToken) {
    throw new Error('Owner account could not be created.')
  }

  try {
    if (!(await options.promoteAdmin(owner.id))) {
      throw new Error('Owner account could not be authorized.')
    }
    return owner
  } finally {
    await request(`${baseUrl}/sign-out`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
        Origin: options.appOrigin,
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => undefined)
  }
}
