import { useCallback, useEffect, useRef, useState } from 'react'
import AdminDashboard from './AdminDashboard'
import AdminLogin from './AdminLogin'
import { getAdminSession, type AdminSession } from './authApi'
import './admin.css'

type AuthState =
  | { status: 'checking'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: AdminSession }
  | { status: 'error'; user: null }

const isLoginPath = () => window.location.pathname === '/admin/login'

const replacePath = (path: string) => {
  window.history.replaceState({}, '', path)
}

export default function AdminApp() {
  const startsOnLogin = isLoginPath()
  const [auth, setAuth] = useState<AuthState>(
    startsOnLogin
      ? { status: 'anonymous', user: null }
      : { status: 'checking', user: null },
  )
  const checkedSession = useRef(startsOnLogin)

  useEffect(() => {
    if (checkedSession.current) return
    checkedSession.current = true

    getAdminSession()
      .then((session) => {
        if (session) {
          setAuth({ status: 'authenticated', user: session })
          return
        }

        replacePath('/admin/login')
        setAuth({ status: 'anonymous', user: null })
      })
      .catch(() => {
        setAuth({ status: 'error', user: null })
      })
  }, [])

  const handleAuthenticated = useCallback((session: AdminSession) => {
    replacePath('/admin')
    setAuth({ status: 'authenticated', user: session })
  }, [])

  const handleSignedOut = useCallback(() => {
    replacePath('/admin/login')
    setAuth({ status: 'anonymous', user: null })
  }, [])

  if (auth.status === 'checking') {
    return (
      <main className="admin-state" aria-live="polite">
        <div className="admin-spinner" aria-hidden="true" />
        <p>Checking your secure session…</p>
      </main>
    )
  }

  if (auth.status === 'error') {
    return (
      <main className="admin-state">
        <h1>Admin unavailable</h1>
        <p>We could not verify your session. Check your connection and refresh the page.</p>
        <a href="/admin">Try again</a>
      </main>
    )
  }

  if (auth.status === 'anonymous') {
    return <AdminLogin onAuthenticated={handleAuthenticated} />
  }

  return (
    <AdminDashboard
      user={auth.user.user}
      csrfToken={auth.user.csrfToken}
      onSignedOut={handleSignedOut}
    />
  )
}
