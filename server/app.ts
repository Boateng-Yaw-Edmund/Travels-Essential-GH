import express, {
  type ErrorRequestHandler,
  type Express,
} from 'express'
import helmet from 'helmet'

import { registerAdminAuthRoutes } from './auth/routes'
import type {
  ExpressRequestLike,
  ExpressResponseLike,
} from './auth/types'

type Handler = (
  request: ExpressRequestLike,
  response: ExpressResponseLike,
) => Promise<void>

interface ServerHandlers {
  login: Handler
  session: Handler
  refresh: Handler
  logout: Handler
}

interface ServerAppOptions {
  handlers: ServerHandlers
}

export function createServerApp(options: ServerAppOptions): Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(
    helmet({
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  )
  app.use('/api/admin/auth', express.json({ limit: '16kb', strict: true }))
  registerAdminAuthRoutes(app, options.handlers)

  app.use('/api', (_request, response) => {
    response.status(404).json({
      error: {
        code: 'not_found',
        message: 'The requested endpoint does not exist.',
      },
    })
  })

  const safeErrorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next,
  ) => {
    void _next
    const status =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      error.status === 413
        ? 413
        : 400
    response.status(status).json({
      error: {
        code: status === 413 ? 'payload_too_large' : 'invalid_request',
        message: 'Unable to process this request.',
      },
    })
  }
  app.use(safeErrorHandler)

  return app
}
