import { createElement, StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import '@fontsource/work-sans/400.css'
import '@fontsource/work-sans/500.css'
import '@fontsource/work-sans/600.css'

const root = createRoot(document.getElementById('root')!)

const renderEntry = (component: ComponentType) => {
  root.render(<StrictMode>{createElement(component)}</StrictMode>)
}

const renderLoadError = () => {
  root.render(
    <StrictMode>
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          fontFamily: 'Work Sans, sans-serif',
          textAlign: 'center',
        }}
      >
        <div>
          <h1>Page unavailable</h1>
          <p>We could not load this page. Check your connection and try again.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </main>
    </StrictMode>,
  )
}

root.render(
  <StrictMode>
    <main aria-live="polite">Loading…</main>
  </StrictMode>,
)

const isAdminRoute =
  window.location.pathname === '/admin' ||
  window.location.pathname.startsWith('/admin/')

if (isAdminRoute) {
  import('./admin/AdminApp')
    .then(({ default: AdminApp }) => renderEntry(AdminApp))
    .catch(renderLoadError)
} else {
  Promise.all([import('./App'), import('./styles.css')])
    .then(([{ default: App }]) => renderEntry(App))
    .catch(renderLoadError)
}
