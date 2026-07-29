import type { HeaderValue } from './types'

export const AUTH_COOKIES = {
  session: 'tegh_session',
  csrf: 'tegh_csrf',
} as const

function firstHeaderValue(value: HeaderValue): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export function parseCookies(value: HeaderValue): Readonly<Record<string, string>> {
  return Object.fromEntries(
    firstHeaderValue(value)
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=')
        if (separator < 0) return [part, '']

        const name = part.slice(0, separator)
        const encodedValue = part.slice(separator + 1)
        try {
          return [name, decodeURIComponent(encodedValue)]
        } catch {
          return [name, '']
        }
      }),
  )
}

interface CookieOptions {
  httpOnly: boolean
  secure: boolean
  maxAgeSeconds: number
  path: string
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path}`,
    options.httpOnly ? 'HttpOnly' : '',
    options.secure ? 'Secure' : '',
    'SameSite=Strict',
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`,
  ].filter(Boolean)

  return attributes.join('; ')
}
