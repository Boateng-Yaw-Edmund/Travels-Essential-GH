import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createServerApp } from '../../server/app'
import { createPostgresRateLimiter } from '../../server/security/postgres-rate-limiter'

describe('production runtime', () => {
  it('serves the SPA while keeping missing API routes and assets as 404s', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'travel-production-'))
    writeFileSync(join(directory, 'index.html'), '<html>Travel shop</html>')
    const handler = vi.fn()
    try {
      const app = createServerApp({
        handlers: { login: handler, session: handler, refresh: handler, logout: handler },
        staticDirectory: directory,
      })
      expect((await request(app).get('/admin')).text).toContain('Travel shop')
      expect((await request(app).get('/api/missing')).status).toBe(404)
      expect((await request(app).get('/assets/missing.js')).status).toBe(404)
      const health = await request(app).get('/api/health')
      expect(health.status).toBe(200)
      expect(health.headers['cache-control']).toBe('no-store')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('uses the shared counter result and fails closed on database failures', async () => {
    const execute = vi.fn().mockResolvedValueOnce({ rows: [{ count: 1, retry: 45 }] })
      .mockResolvedValueOnce({ rows: [{ count: 6, retry: 30 }] })
      .mockRejectedValueOnce(new Error('unavailable'))
    const limiter = createPostgresRateLimiter({ execute } as never)
    const policy = { limit: 5, windowSeconds: 60 }
    expect(await limiter.consume('login:127.0.0.1', policy)).toEqual({ allowed: true, retryAfterSeconds: 0 })
    expect(await limiter.consume('login:127.0.0.1', policy)).toEqual({ allowed: false, retryAfterSeconds: 30 })
    expect(await limiter.consume('login:127.0.0.1', policy)).toEqual({ allowed: false, retryAfterSeconds: 60 })
  })
})
