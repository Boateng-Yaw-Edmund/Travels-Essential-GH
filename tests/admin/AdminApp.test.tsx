import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminApp from '../../src/admin/AdminApp'

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

describe('admin authentication and dashboard shell', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/login')
    document.cookie = 'tegh_csrf=; Max-Age=0; Path=/'
    vi.restoreAllMocks()
  })

  it('shows an accessible login form without checking a session', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    render(<AdminApp />)

    expect(screen.getByRole('heading', { name: /admin sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('validates input before sending credentials', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    render(<AdminApp />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'not-an-email' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in securely/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/valid email address/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('logs in through the same-origin API and opens the dashboard', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (input === '/api/admin/auth/login') {
        return jsonResponse({
          success: true,
          data: {
            user: { id: 'admin-1', email: 'owner@example.com' },
            csrfToken: 'login-csrf-token',
          },
        })
      }

      throw new Error(`Unexpected request: ${String(input)}`)
    })
    render(<AdminApp />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'owner@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'correct horse battery staple' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in securely/i }))

    expect(await screen.findByRole('heading', { name: /store overview/i })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/admin')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner@example.com',
          password: 'correct horse battery staple',
        }),
      }),
    )
  })

  it('checks the session once and renders egress-conscious placeholder metrics', async () => {
    window.history.replaceState({}, '', '/admin')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (input === '/api/admin/auth/session') {
        return jsonResponse({
          authenticated: true,
          data: {
            user: { id: 'admin-1', email: 'owner@example.com' },
            csrfToken: 'session-csrf-token',
          },
        })
      }

      throw new Error(`Unexpected request: ${String(input)}`)
    })

    render(<AdminApp />)

    expect(await screen.findByRole('heading', { name: /store overview/i })).toBeInTheDocument()
    expect(screen.getByText(/loaded only when you open or refresh/i)).toBeInTheDocument()
    expect(screen.getAllByText('Products')).toHaveLength(2)
    expect(screen.getAllByText('Inventory')).toHaveLength(2)
    expect(screen.getAllByText('Orders')).toHaveLength(2)
    expect(screen.getAllByText('Payments')).toHaveLength(2)
    expect(screen.getAllByText(/coming next/i)).toHaveLength(8)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('restores the session under the application StrictMode wrapper', async () => {
    window.history.replaceState({}, '', '/admin')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      jsonResponse({
        data: {
          user: { id: 'admin-1', email: 'owner@example.com' },
          csrfToken: 'strict-mode-csrf-token',
        },
      }),
    )

    render(
      <StrictMode>
        <AdminApp />
      </StrictMode>,
    )

    expect(await screen.findByRole('heading', { name: /store overview/i })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses the CSRF cookie to refresh an expired access session once', async () => {
    window.history.replaceState({}, '', '/admin')
    document.cookie = 'tegh_csrf=refresh-csrf-token; Path=/'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (input === '/api/admin/auth/session') {
        return jsonResponse({ authenticated: false }, 401)
      }

      if (input === '/api/admin/auth/refresh') {
        return jsonResponse({
          data: {
            user: { id: 'admin-1', email: 'owner@example.com' },
            csrfToken: 'rotated-csrf-token',
          },
        })
      }

      throw new Error(`Unexpected request: ${String(input)}`)
    })

    render(<AdminApp />)

    expect(await screen.findByRole('heading', { name: /store overview/i })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': 'refresh-csrf-token' },
      }),
    )
  })

  it('redirects an unauthenticated protected route to login', async () => {
    window.history.replaceState({}, '', '/admin/orders')
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      jsonResponse({ authenticated: false }, 401),
    )

    render(<AdminApp />)

    expect(await screen.findByRole('heading', { name: /admin sign in/i })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/admin/login')
  })

  it('logs out through the API and returns to login', async () => {
    window.history.replaceState({}, '', '/admin')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (input === '/api/admin/auth/session') {
        return jsonResponse({
          data: {
            user: { id: 'admin-1', email: 'owner@example.com' },
            csrfToken: 'logout-csrf-token',
          },
        })
      }

      if (input === '/api/admin/auth/logout') {
        return jsonResponse({ success: true })
      }

      throw new Error(`Unexpected request: ${String(input)}`)
    })
    render(<AdminApp />)

    fireEvent.click(await screen.findByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /admin sign in/i })).toBeInTheDocument()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': 'logout-csrf-token' },
      }),
    )
    expect(window.location.pathname).toBe('/admin/login')
  })
})
