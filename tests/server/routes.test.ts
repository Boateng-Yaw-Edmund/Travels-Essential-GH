import { describe, expect, it, vi } from 'vitest'

import {
  ADMIN_AUTH_ROUTES,
  registerAdminAuthRoutes,
} from '../../server/auth/routes'

describe('admin auth route adapter', () => {
  it('registers the frontend auth contract on an Express-compatible router', () => {
    const router = {
      get: vi.fn(),
      post: vi.fn(),
    }
    const handlers = {
      login: vi.fn(),
      session: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
    }

    registerAdminAuthRoutes(router, handlers)

    expect(router.post).toHaveBeenCalledWith(
      ADMIN_AUTH_ROUTES.login,
      handlers.login,
    )
    expect(router.get).toHaveBeenCalledWith(
      ADMIN_AUTH_ROUTES.session,
      handlers.session,
    )
    expect(router.post).toHaveBeenCalledWith(
      ADMIN_AUTH_ROUTES.refresh,
      handlers.refresh,
    )
    expect(router.post).toHaveBeenCalledWith(
      ADMIN_AUTH_ROUTES.logout,
      handlers.logout,
    )
  })
})
