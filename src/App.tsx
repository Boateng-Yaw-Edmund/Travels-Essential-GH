import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BaggageClaim,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  Headphones,
  Heart,
  Luggage,
  Mail,
  MapPin,
  Menu,
  Minus,
  PackageCheck,
  Plane,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react'
import { ProductCard } from './components/ProductCard'
import { categories, products, travelTips } from './data'
import {
  addToCart,
  cartSummary,
  filterProducts,
  formatGhs,
  updateCartQuantity,
  validateEmail,
} from './lib/storefront'
import type { CartItem, CategoryId, Product, ProductVariant } from './types'

const ADD_TO_CART_DELAY_MS = 450
const CART_NOTICE_DURATION_MS = 3500

interface CartNoticeData {
  id: string
  message: string
}

function CartNotice({ notice, onDismiss }: { notice: CartNoticeData; onDismiss: () => void }) {
  return (
    <div className="cart-toast">
      <span className="cart-toast__icon"><Check aria-hidden="true" size={20} /></span>
      <p key={notice.id} role="status" aria-live="polite">{notice.message}</p>
      <button className="cart-toast__close" type="button" aria-label="Dismiss cart notification" onClick={onDismiss}>
        <X aria-hidden="true" size={19} />
      </button>
    </div>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [pendingProductIds, setPendingProductIds] = useState<ReadonlySet<string>>(() => new Set())
  const [selectedVariantIds, setSelectedVariantIds] = useState<Record<string, string>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartNotices, setCartNotices] = useState<CartNoticeData[]>([])
  const [email, setEmail] = useState('')
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const pageRef = useRef<HTMLDivElement>(null)
  const cartTriggerRef = useRef<HTMLButtonElement>(null)
  const cartCloseRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const pendingProductIdsRef = useRef<ReadonlySet<string>>(new Set())
  const addTimersRef = useRef<number[]>([])

  const visibleProducts = useMemo(
    () => filterProducts(products, query, activeCategory),
    [activeCategory, query],
  )
  const summary = useMemo(() => cartSummary(cart), [cart])
  const activeCartNotice = cartNotices[0] ?? null

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setCartOpen(false)
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  useEffect(() => () => {
    addTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    addTimersRef.current = []
    pendingProductIdsRef.current = new Set()
  }, [])

  useEffect(() => {
    if (!cartOpen) return

    previousFocusRef.current ??= document.activeElement as HTMLElement | null
    const pageElement = pageRef.current
    pageElement?.setAttribute('inert', '')
    const focusFrame = window.requestAnimationFrame(() => cartCloseRef.current?.focus())

    return () => {
      window.cancelAnimationFrame(focusFrame)
      pageElement?.removeAttribute('inert')
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [cartOpen])

  useEffect(() => {
    if (!activeCartNotice) return

    const notice = activeCartNotice
    const dismissTimer = window.setTimeout(() => {
      setCartNotices((currentNotices) => currentNotices.filter((item) => item.id !== notice.id))
    }, CART_NOTICE_DURATION_MS)

    return () => window.clearTimeout(dismissTimer)
  }, [activeCartNotice])

  const addProduct = (product: Product, variant?: ProductVariant) => {
    if (pendingProductIdsRef.current.has(product.id)) return

    const nextPendingIds = new Set(pendingProductIdsRef.current)
    nextPendingIds.add(product.id)
    pendingProductIdsRef.current = nextPendingIds
    setPendingProductIds(nextPendingIds)

    const addTimer = window.setTimeout(() => {
      addTimersRef.current = addTimersRef.current.filter((timerId) => timerId !== addTimer)

      const remainingPendingIds = new Set(pendingProductIdsRef.current)
      remainingPendingIds.delete(product.id)
      pendingProductIdsRef.current = remainingPendingIds
      setPendingProductIds(remainingPendingIds)

      setCart((currentCart) => addToCart(currentCart, product, variant))
      const productLabel = variant ? `${product.name} in ${variant.name}` : product.name
      setCartNotices((currentNotices) => [
        ...currentNotices,
        {
          id: `${product.id}-${Date.now()}`,
          message: `${productLabel} added to your cart.`,
        },
      ])
    }, ADD_TO_CART_DELAY_MS)

    addTimersRef.current = [...addTimersRef.current, addTimer]
  }

  const selectCategory = (category: CategoryId) => {
    setActiveCategory(category)
    document.querySelector('#shop')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  const handleNewsletter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateEmail(email)) {
      setNewsletterMessage('Please enter a valid email address.')
      return
    }
    setNewsletterMessage('Mockup confirmed — no email was submitted or stored.')
    setEmail('')
  }

  return (
    <>
      <div ref={pageRef}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="announcement-bar">
        <p><Plane aria-hidden="true" size={15} /> Thoughtful travel essentials, delivered across Ghana</p>
        <a href="https://www.instagram.com/travelessentials1gh" target="_blank" rel="noreferrer">
          Follow us <Camera aria-hidden="true" size={15} />
        </a>
      </div>

      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#top" aria-label="Travel Essentials GH home">
            <img className="brand-logo" src="/assets/travel-essentials-gh-logo.jpg" alt="" />
            <span>Travel Essentials <b>GH</b></span>
          </a>

          <nav className="desktop-nav" aria-label="Primary navigation">
            <a href="#shop">Shop</a>
            <a href="#categories">Categories</a>
            <a href="#why-us">Why us</a>
            <a href="#journal">Travel tips</a>
          </nav>

          <div className="header-actions">
            <button className="icon-button desktop-only" type="button" aria-label="Favourites coming soon" disabled>
              <Heart aria-hidden="true" size={20} />
            </button>
            <button
              className="icon-button cart-button"
              type="button"
              ref={cartTriggerRef}
              aria-label={`Cart with ${summary.itemCount} ${summary.itemCount === 1 ? 'item' : 'items'}`}
              onClick={() => {
                previousFocusRef.current = cartTriggerRef.current
                setCartOpen(true)
              }}
            >
              <ShoppingBag aria-hidden="true" size={20} />
              <span>{summary.itemCount}</span>
            </button>
            <button className="icon-button desktop-only" type="button" aria-label="Account features coming soon" disabled>
              <CircleUserRound aria-hidden="true" size={20} />
            </button>
            <button
              className="icon-button mobile-menu-button"
              type="button"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        <nav
          id="mobile-navigation"
          className={`mobile-nav ${menuOpen ? 'is-open' : ''}`}
          aria-label="Mobile navigation"
          aria-hidden={!menuOpen}
        >
          <a href="#shop" onClick={() => setMenuOpen(false)}>Shop</a>
          <a href="#categories" onClick={() => setMenuOpen(false)}>Categories</a>
          <a href="#why-us" onClick={() => setMenuOpen(false)}>Why us</a>
          <a href="#journal" onClick={() => setMenuOpen(false)}>Travel tips</a>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <img src="/assets/travel-hero.png" alt="Traveller thoughtfully organising accessories into a suitcase" />
          <div className="hero-overlay" />
          <div className="hero-content">
            <p className="eyebrow eyebrow--light">Made for the journey</p>
            <h1 id="hero-title">Pack better.<br />Go further.</h1>
            <p>Travel essentials that help you stay organised, comfortable and ready for what comes next.</p>
            <div className="hero-actions">
              <a className="button button--primary" href="#shop">Shop essentials <ArrowRight aria-hidden="true" size={18} /></a>
              <a className="button button--glass" href="#categories">Explore categories</a>
            </div>
          </div>
          <div className="hero-note"><Sparkles aria-hidden="true" size={18} /><span><b>Curated in Ghana</b>For every kind of traveller</span></div>
        </section>

        <section className="section container" id="categories" aria-labelledby="category-title">
          <div className="section-heading">
            <div><p className="eyebrow">Travel your way</p><h2 id="category-title">Shop by category</h2></div>
            <button className="text-button" type="button" onClick={() => selectCategory('all')}>Explore all <ChevronRight aria-hidden="true" size={17} /></button>
          </div>
          <div className="category-grid">
            {categories.map((category, index) => {
              const icons = [ShieldCheck, PackageCheck, Headphones, Luggage, BaggageClaim]
              const Icon = icons[index]
              return (
                <button
                  className={`category-card ${activeCategory === category.id ? 'is-active' : ''}`}
                  key={category.id}
                  type="button"
                  aria-pressed={activeCategory === category.id}
                  onClick={() => selectCategory(category.id)}
                >
                  <span><Icon aria-hidden="true" size={24} /></span>
                  <strong>{category.name}</strong>
                  <small>{category.caption}</small>
                  <ChevronRight aria-hidden="true" className="category-arrow" size={18} />
                </button>
              )
            })}
          </div>
        </section>

        <section className="section section--tinted" id="shop" aria-labelledby="shop-title">
          <div className="container">
            <div className="section-heading section-heading--shop">
              <div><p className="eyebrow">Ready when you are</p><h2 id="shop-title">Travel favourites</h2></div>
              <label className="search-field">
                <Search aria-hidden="true" size={18} />
                <span className="sr-only">Search products</span>
                <input
                  aria-label="Search products"
                  type="search"
                  placeholder="Search essentials"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
            <div className="filter-row" aria-label="Product categories">
              <button type="button" aria-pressed={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>All</button>
              {categories.map((category) => (
                <button key={category.id} type="button" aria-pressed={activeCategory === category.id} onClick={() => setActiveCategory(category.id)}>{category.name}</button>
              ))}
            </div>
            {visibleProducts.length > 0 ? (
              <div className="product-grid">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isAdding={pendingProductIds.has(product.id)}
                    selectedVariantId={selectedVariantIds[product.id] ?? product.variants?.[0]?.id}
                    onVariantSelect={(productId, variantId) => {
                      setSelectedVariantIds((currentIds) => ({ ...currentIds, [productId]: variantId }))
                    }}
                    onAdd={addProduct}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state"><Search aria-hidden="true" /><h3>No travel essentials match that search.</h3><p>Try another product name or clear your filters.</p></div>
            )}
          </div>
        </section>

        <section className="section container editorial" aria-labelledby="editorial-title">
          <div className="editorial-main">
            <div className="editorial-copy">
              <p className="eyebrow eyebrow--light">The organised traveller</p>
              <h2 id="editorial-title">Pack smarter.<br />Enjoy the journey.</h2>
              <p>A thoughtful system for the details that make every trip feel easier.</p>
              <a className="button button--light" href="#shop">Build your travel kit <ArrowRight aria-hidden="true" size={18} /></a>
            </div>
          </div>
          <div className="editorial-stack">
            <article><span>01</span><div><p className="eyebrow">Protect the essentials</p><h3>Documents within easy reach</h3></div><ShieldCheck aria-hidden="true" /></article>
            <article><span>02</span><div><p className="eyebrow">Create calm</p><h3>A place for every item</h3></div><PackageCheck aria-hidden="true" /></article>
          </div>
        </section>

        <section className="section container" id="why-us" aria-labelledby="why-title">
          <div className="promo-grid">
            <article className="promo promo--blue"><p className="eyebrow eyebrow--light">Travel light</p><h2 id="why-title">The packing edit</h2><p>Four essentials. One calmer suitcase.</p><a href="#shop">Shop the edit <ArrowRight aria-hidden="true" size={17} /></a></article>
            <article className="promo promo--teal"><p className="eyebrow eyebrow--light">Made for movement</p><h2>Little details,<br />better journeys.</h2><p>Practical pieces selected for real travel days.</p><a href="#categories">Explore the collection <ArrowRight aria-hidden="true" size={17} /></a></article>
          </div>
          <div className="trust-grid">
            <article><MapPin aria-hidden="true" /><div><h3>Delivery across Ghana</h3><p>Convenient delivery options for your order.</p></div></article>
            <article><ShieldCheck aria-hidden="true" /><div><h3>Quality checked</h3><p>Each essential is selected with everyday travel in mind.</p></div></article>
            <article><Headphones aria-hidden="true" /><div><h3>Human support</h3><p>Questions? Reach us through Instagram before you order.</p></div></article>
          </div>
        </section>

        <section className="section section--journal" id="journal" aria-labelledby="journal-title">
          <div className="container">
            <div className="section-heading"><div><p className="eyebrow">Travel notes</p><h2 id="journal-title">A smoother trip starts here</h2></div><a className="text-button" href="https://www.instagram.com/travelessentials1gh" target="_blank" rel="noreferrer">More on Instagram <Camera aria-hidden="true" size={17} /></a></div>
            <div className="journal-grid">
              {travelTips.map((tip, index) => <article key={tip.title} className={`journal-card journal-card--${index + 1}`}><p className="eyebrow">{tip.label}</p><h3>{tip.title}</h3><p>{tip.copy}</p><span className="journal-card__arrow" aria-hidden="true"><ArrowRight /></span></article>)}
            </div>
          </div>
        </section>

        <section className="support-strip" aria-label="Customer support">
          <div className="container"><div><span><Headphones aria-hidden="true" /></span><div><h2>Here for the whole journey</h2><p>Product questions, delivery guidance or packing advice.</p></div></div><a className="button button--dark" href="https://www.instagram.com/travelessentials1gh" target="_blank" rel="noreferrer">Message us on Instagram</a></div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div><a className="brand brand--footer" href="#top"><img className="brand-logo" src="/assets/travel-essentials-gh-logo.jpg" alt="" /><span>Travel Essentials <b>GH</b></span></a><p>Thoughtful accessories for organised, comfortable travel.</p><a className="social-link" href="https://www.instagram.com/travelessentials1gh" target="_blank" rel="noreferrer"><Camera aria-hidden="true" /> @travelessentials1gh</a></div>
          <div><h2>Explore</h2><a href="#shop">Shop all</a><a href="#categories">Categories</a><a href="#why-us">Why us</a><a href="#journal">Travel tips</a></div>
          <div><h2>Popular</h2>{categories.map((category) => <button type="button" key={category.id} onClick={() => selectCategory(category.id)}>{category.name}</button>)}</div>
          <div className="newsletter"><p className="eyebrow">Stay travel ready</p><h2>Tips and fresh arrivals, occasionally.</h2><form onSubmit={handleNewsletter} noValidate><label htmlFor="newsletter-email">Email address</label><div><Mail aria-hidden="true" size={18} /><input id="newsletter-email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /><button type="submit" aria-label="Join the list"><ArrowRight aria-hidden="true" /></button></div></form><p className="form-message" aria-live="polite">{newsletterMessage}</p></div>
        </div>
        <div className="container footer-bottom"><p>© 2026 Travel Essentials GH. Mockup for review.</p><div><span>Accra, Ghana</span><span>Instagram orders</span></div></div>
      </footer>
      </div>

      <div role={cartOpen ? 'dialog' : undefined} aria-modal={cartOpen || undefined} aria-labelledby={cartOpen ? 'cart-drawer-title' : undefined}>
      {activeCartNotice && (
        <CartNotice
          notice={activeCartNotice}
          onDismiss={() => setCartNotices((currentNotices) => currentNotices.slice(1))}
        />
      )}

      <div className={`drawer-backdrop ${cartOpen ? 'is-open' : ''}`} onClick={() => setCartOpen(false)} aria-hidden="true" />
      <aside className={`cart-drawer ${cartOpen ? 'is-open' : ''}`} aria-hidden={!cartOpen}>
        <div className="drawer-header"><div><p className="eyebrow">Your travel kit</p><h2 id="cart-drawer-title">Shopping cart</h2></div><button ref={cartCloseRef} className="icon-button" type="button" aria-label="Close cart" onClick={() => setCartOpen(false)}><X aria-hidden="true" /></button></div>
        {cart.length === 0 ? <div className="cart-empty"><ShoppingBag aria-hidden="true" /><h3>Your cart is ready for an adventure.</h3><p>Add a few travel essentials to get started.</p></div> : <div className="cart-items">{cart.map((item) => {
          const itemLabel = item.variant ? `${item.product.name} in ${item.variant.name}` : item.product.name
          return <article key={`${item.product.id}-${item.variant?.id ?? 'standard'}`}><div className={`cart-thumb ${item.variant ? 'cart-thumb--standalone' : ''}`} style={{ backgroundImage: `url(${item.variant?.image ?? item.product.image})`, backgroundPosition: item.variant ? 'center' : item.product.imagePosition }} role="img" aria-label={itemLabel} /><div><h3>{item.product.name}</h3>{item.variant && <small>Colour: {item.variant.name}</small>}<p>{formatGhs(item.product.price)}</p><div className="quantity"><button type="button" aria-label={`Decrease ${itemLabel} quantity`} onClick={() => setCart((current) => updateCartQuantity(current, item.product.id, item.quantity - 1, item.variant?.id))}><Minus aria-hidden="true" /></button><span>{item.quantity}</span><button type="button" aria-label={`Increase ${itemLabel} quantity`} onClick={() => setCart((current) => updateCartQuantity(current, item.product.id, item.quantity + 1, item.variant?.id))}><Plus aria-hidden="true" /></button></div></div></article>
        })}</div>}
        <div className="drawer-footer"><div><span>Subtotal</span><strong>{formatGhs(summary.subtotal)}</strong></div><button className="button button--primary button--wide" type="button" disabled>Checkout unavailable in mockup <Check aria-hidden="true" size={18} /></button><small>This is a storefront mockup. No payment will be collected.</small></div>
      </aside>
      </div>
    </>
  )
}

export default App
