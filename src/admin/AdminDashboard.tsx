import { Boxes, CreditCard, LayoutDashboard, LogOut, Package, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import type { AdminUser } from './authApi'
import { logoutAdmin } from './authApi'

interface AdminDashboardProps {
  user: AdminUser
  csrfToken: string
  onSignedOut: () => void
}

const futureModules = [
  { label: 'Products', icon: Package },
  { label: 'Inventory', icon: Boxes },
  { label: 'Orders', icon: ShoppingBag },
  { label: 'Payments', icon: CreditCard },
]

export default function AdminDashboard({ user, csrfToken, onSignedOut }: AdminDashboardProps) {
  const [logoutError, setLogoutError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleLogout = async () => {
    setLogoutError('')
    setIsSigningOut(true)

    try {
      await logoutAdmin(csrfToken)
      onSignedOut()
    } catch {
      setLogoutError('We could not sign you out. Please try again.')
      setIsSigningOut(false)
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="Travel Essentials GH storefront">
          <img src="/assets/travel-essentials-gh-logo.jpg" alt="" />
          <span>Travel Essentials GH</span>
        </a>
        <nav aria-label="Admin navigation">
          <a className="admin-nav-item admin-nav-item--active" href="/admin" aria-current="page">
            <LayoutDashboard aria-hidden="true" size={19} />
            Overview
          </a>
          {futureModules.map(({ label, icon: Icon }) => (
            <span className="admin-nav-item admin-nav-item--disabled" aria-disabled="true" key={label}>
              <Icon aria-hidden="true" size={19} />
              <span>{label}</span>
              <small>Coming next</small>
            </span>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-kicker">Travel Essentials GH</p>
            <h1>Store overview</h1>
          </div>
          <div className="admin-account">
            <span>{user.email}</span>
            <button type="button" onClick={handleLogout} disabled={isSigningOut}>
              <LogOut aria-hidden="true" size={17} />
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>

        {logoutError && <p className="admin-error" role="alert">{logoutError}</p>}

        <section aria-labelledby="summary-title">
          <div className="admin-section-heading">
            <div>
              <p className="admin-kicker">At a glance</p>
              <h2 id="summary-title">Business summary</h2>
            </div>
            <p>Loaded only when you open or refresh this page—no background polling.</p>
          </div>

          <div className="admin-metric-grid">
            {futureModules.map(({ label, icon: Icon }) => (
              <article className="admin-metric-card" key={label}>
                <Icon aria-hidden="true" size={22} />
                <p>{label}</p>
                <strong aria-label={`${label} metric not connected yet`}>—</strong>
                <span>Coming next</span>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-egress-card" aria-labelledby="data-use-title">
          <h2 id="data-use-title">Lean data use by design</h2>
          <p>
            Dashboard data will load on demand and use compact summaries. Product images will use
            resized formats and browser caching to keep Supabase egress under control.
          </p>
        </section>
      </main>
    </div>
  )
}
