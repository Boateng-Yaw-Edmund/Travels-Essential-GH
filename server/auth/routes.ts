import type {
  ExpressRequestLike,
  ExpressResponseLike,
} from './types'

type Handler = (
  request: ExpressRequestLike,
  response: ExpressResponseLike,
) => Promise<void>

interface AuthHandlers {
  login: Handler
  session: Handler
  refresh: Handler
  logout: Handler
}

interface ExpressRouterLike {
  get(path: string, handler: Handler): unknown
  post(path: string, handler: Handler): unknown
}

export const ADMIN_AUTH_ROUTES = {
  login: '/api/admin/auth/login',
  session: '/api/admin/auth/session',
  refresh: '/api/admin/auth/refresh',
  logout: '/api/admin/auth/logout',
} as const

export function registerAdminAuthRoutes(
  router: ExpressRouterLike,
  handlers: AuthHandlers,
): void {
  router.post(ADMIN_AUTH_ROUTES.login, handlers.login)
  router.get(ADMIN_AUTH_ROUTES.session, handlers.session)
  router.post(ADMIN_AUTH_ROUTES.refresh, handlers.refresh)
  router.post(ADMIN_AUTH_ROUTES.logout, handlers.logout)
}
