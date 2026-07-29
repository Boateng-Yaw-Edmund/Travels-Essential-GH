import { useState, type FormEvent } from 'react'
import type { AdminSession } from './authApi'
import { loginAdmin } from './authApi'

interface AdminLoginProps {
  onAuthenticated: (session: AdminSession) => void
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export default function AdminLogin({ onAuthenticated }: AdminLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!isEmail(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const session = await loginAdmin(normalizedEmail, password)
      setPassword('')
      onAuthenticated(session)
    } catch {
      setError('Sign in failed. Check your details and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="admin-login">
      <section className="admin-login__card" aria-labelledby="admin-login-title">
        <a className="admin-brand" href="/" aria-label="Travel Essentials GH storefront">
          <img src="/assets/travel-essentials-gh-logo.jpg" alt="" />
          <span>Travel Essentials GH</span>
        </a>
        <p className="admin-kicker">Store management</p>
        <h1 id="admin-login-title">Admin sign in</h1>
        <p>Use your authorised account to manage the store.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />

          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            required
          />

          {error && <p className="admin-error" role="alert">{error}</p>}

          <button className="admin-primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in securely'}
          </button>
        </form>
        <p className="admin-security-note">
          Your session stays in a secure cookie. This browser does not store an access token.
        </p>
      </section>
    </main>
  )
}
