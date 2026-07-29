import { describe, expect, it } from 'vitest'
import {
  addToCart,
  cartSummary,
  filterProducts,
  formatGhs,
  updateCartQuantity,
  validateEmail,
} from '../src/lib/storefront'
import type { Product } from '../src/types'

const products: Product[] = [
  {
    id: 'passport-classic',
    name: 'Classic Passport Cover',
    category: 'passport-covers',
    price: 129.5,
    description: 'A protective travel cover.',
    image: '/assets/passport-cover.jpg',
    badge: 'Best seller',
  },
  {
    id: 'packing-set',
    name: 'Nine-piece Packing Cube Set',
    category: 'packing-cubes',
    price: 340,
    description: 'Organise every trip.',
    image: '/assets/packing-cubes.jpg',
  },
]

describe('storefront utilities', () => {
  it('formats prices in Ghana cedis', () => {
    expect(formatGhs(129.5)).toBe('GH₵129.50')
  })

  it('filters products by category and a case-insensitive search query', () => {
    expect(filterProducts(products, 'PACKING', 'packing-cubes')).toEqual([products[1]])
    expect(filterProducts(products, '', 'all')).toEqual(products)
  })

  it('adds items without mutating the existing cart and increments repeats', () => {
    const initial = [{ product: products[0], quantity: 1 }]
    const next = addToCart(initial, products[0])
    const withNewProduct = addToCart(next, products[1])

    expect(next).not.toBe(initial)
    expect(initial[0].quantity).toBe(1)
    expect(next[0].quantity).toBe(2)
    expect(withNewProduct).toHaveLength(2)
  })

  it('keeps different colour variants as separate cart items', () => {
    const mint = { id: 'mint', name: 'Mint Green', swatch: '#62ad93', image: '/mint.jpg' }
    const pink = { id: 'pink', name: 'Pink', swatch: '#d684b4', image: '/pink.jpg' }
    const suitcase: Product = { ...products[0], id: 'cabin-suitcase', name: 'Cabin Suitcase', variants: [mint, pink] }

    const cart = addToCart(addToCart(addToCart([], suitcase, mint), suitcase, pink), suitcase, mint)
    const withoutPink = updateCartQuantity(cart, suitcase.id, 0, pink.id)
    const withMoreMint = updateCartQuantity(withoutPink, suitcase.id, 3, mint.id)

    expect(cart).toHaveLength(2)
    expect(cart.map((item) => item.variant?.name)).toEqual(['Mint Green', 'Pink'])
    expect(cart.map((item) => item.quantity)).toEqual([2, 1])
    expect(withoutPink).toHaveLength(1)
    expect(withMoreMint[0]).toMatchObject({ variant: mint, quantity: 3 })
  })

  it('updates quantities, removes zero quantities, and calculates a summary', () => {
    const cart = [
      { product: products[0], quantity: 2 },
      { product: products[1], quantity: 1 },
    ]

    const incremented = updateCartQuantity(cart, products[0].id, 3)
    const updated = updateCartQuantity(incremented, products[0].id, 0)
    expect(incremented[0].quantity).toBe(3)
    expect(updated).toHaveLength(1)
    expect(cartSummary(updated)).toEqual({ itemCount: 1, subtotal: 340 })
  })

  it('validates newsletter email addresses', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('hello@')).toBe(false)
    expect(validateEmail('traveller@example.com')).toBe(true)
  })
})
