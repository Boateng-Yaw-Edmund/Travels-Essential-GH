import type { CartItem, CategoryId, Product, ProductVariant } from '../types'

export function formatGhs(value: number): string {
  return `GH₵${value.toFixed(2)}`
}

export function filterProducts(
  products: Product[],
  query: string,
  category: CategoryId,
): Product[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  return products.filter((product) => {
    const matchesCategory = category === 'all' || product.category === category
    const searchableText = `${product.name} ${product.description}`.toLocaleLowerCase()
    const matchesQuery = normalizedQuery.length === 0 || searchableText.includes(normalizedQuery)
    return matchesCategory && matchesQuery
  })
}

export function addToCart(cart: CartItem[], product: Product, variant?: ProductVariant): CartItem[] {
  const existingItem = cart.find(
    (item) => item.product.id === product.id && item.variant?.id === variant?.id,
  )

  if (!existingItem) {
    return [...cart, { product, variant, quantity: 1 }]
  }

  return cart.map((item) =>
    item.product.id === product.id && item.variant?.id === variant?.id
      ? { ...item, quantity: item.quantity + 1 }
      : item,
  )
}

export function updateCartQuantity(
  cart: CartItem[],
  productId: string,
  quantity: number,
  variantId?: string,
): CartItem[] {
  if (quantity <= 0) {
    return cart.filter(
      (item) => !(item.product.id === productId && item.variant?.id === variantId),
    )
  }

  return cart.map((item) =>
    item.product.id === productId && item.variant?.id === variantId
      ? { ...item, quantity }
      : item,
  )
}

export function cartSummary(cart: CartItem[]): { itemCount: number; subtotal: number } {
  return cart.reduce(
    (summary, item) => ({
      itemCount: summary.itemCount + item.quantity,
      subtotal: summary.subtotal + item.product.price * item.quantity,
    }),
    { itemCount: 0, subtotal: 0 },
  )
}

export function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
