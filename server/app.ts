import express, {
  type ErrorRequestHandler,
  type Express,
} from 'express'
import helmet from 'helmet'
import { join } from 'node:path'

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
  handlers?: ServerHandlers
  staticDirectory?: string
  trustedProxy?: string
}

export function createServerApp(options: ServerAppOptions): Express {
  const app = express()

  app.disable('x-powered-by')
  if (options.trustedProxy) app.set('trust proxy', options.trustedProxy)
  app.use(
    helmet({
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      strictTransportSecurity: options.handlers ? undefined : false,
      contentSecurityPolicy: options.handlers ? undefined : {
        directives: { upgradeInsecureRequests: null },
      },
    }),
  )
  if (options.handlers) {
    app.use('/api/admin/auth', express.json({ limit: '16kb', strict: true }))
    registerAdminAuthRoutes(app, options.handlers)
  } else {
    app.use('/admin', (_request, response) => {
      response.status(404).send('Admin is unavailable in storefront preview mode.')
    })
  }
  app.get('/api/health', (_request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.json({ data: { ok: true } })
  })

  app.use('/api', (_request, response) => {
    response.status(404).json({
      error: {
        code: 'not_found',
        message: 'The requested endpoint does not exist.',
      },
    })
  })

  if (options.staticDirectory) {
    const directory = options.staticDirectory
    app.use('/assets', express.static(join(directory, 'assets'), {
      maxAge: '1y', immutable: true, index: false, dotfiles: 'deny',
    }))
    app.use(express.static(directory, { index: false, dotfiles: 'deny' }))
    app.get(['/', '/admin'], (_request, response) => {
      response.setHeader('Cache-Control', 'no-cache')
      response.sendFile(join(directory, 'index.html'))
    })
  }

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
