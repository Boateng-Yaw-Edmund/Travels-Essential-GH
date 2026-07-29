export type CategoryId = 'all' | 'passport-covers' | 'packing-cubes' | 'neck-pillows' | 'luggage-tags' | 'suitcases'

export interface Category {
  id: Exclude<CategoryId, 'all'>
  name: string
  caption: string
}

export interface ProductVariant {
  id: string
  name: string
  swatch: string
  image: string
}

export interface Product {
  id: string
  name: string
  category: Exclude<CategoryId, 'all'>
  price: number
  description: string
  image: string
  imagePosition?: string
  badge?: string
  variants?: ProductVariant[]
}

export interface CartItem {
  product: Product
  variant?: ProductVariant
  quantity: number
}
