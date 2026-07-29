import type { Category, Product } from './types'

export const categories: Category[] = [
  { id: 'passport-covers', name: 'Passport Covers', caption: 'Travel documents, refined' },
  { id: 'packing-cubes', name: 'Packing Cubes', caption: 'A place for everything' },
  { id: 'neck-pillows', name: 'Neck Pillows', caption: 'Comfort while in transit' },
  { id: 'luggage-tags', name: 'Luggage Tags', caption: 'Spot your bag quickly' },
  { id: 'suitcases', name: 'Suitcases', caption: 'Cabin-ready colour' },
]

export const products: Product[] = [
  {
    id: 'passport-classic',
    name: 'Classic Passport Cover',
    category: 'passport-covers',
    price: 129.5,
    description: 'A soft-grain cover that keeps your passport protected and easy to reach.',
    image: '/assets/product-board.png',
    imagePosition: '0% 0%',
    badge: 'Best seller',
  },
  {
    id: 'packing-set',
    name: '9-Piece Packing Cube Set',
    category: 'packing-cubes',
    price: 340,
    description: 'A coordinated set for separating outfits, shoes and small essentials.',
    image: '/assets/product-board.png',
    imagePosition: '100% 0%',
    badge: 'New',
  },
  {
    id: 'cloud-neck-pillow',
    name: 'Cloud Memory Neck Pillow',
    category: 'neck-pillows',
    price: 185,
    description: 'Supportive memory foam with a soft, travel-ready cover.',
    image: '/assets/product-board.png',
    imagePosition: '0% 100%',
  },
  {
    id: 'heritage-luggage-tag',
    name: 'Heritage Luggage Tag',
    category: 'luggage-tags',
    price: 85,
    description: 'A durable luggage tag with a covered identity card and secure buckle.',
    image: '/assets/product-board.png',
    imagePosition: '100% 100%',
  },
  {
    id: 'cabin-suitcase',
    name: 'Cabin Suitcase',
    category: 'suitcases',
    price: 850,
    description: 'A streamlined hard-shell cabin case with smooth spinner wheels and a secure combination lock.',
    image: '/assets/suitcase-mint.jpg',
    badge: '3 colours',
    variants: [
      { id: 'mint-green', name: 'Mint Green', swatch: '#62ad93', image: '/assets/suitcase-mint.jpg' },
      { id: 'pink', name: 'Pink', swatch: '#d684b4', image: '/assets/suitcase-pink.jpg' },
      { id: 'lilac', name: 'Lilac', swatch: '#cbb9e8', image: '/assets/suitcase-lilac.jpg' },
    ],
  },
]

export const travelTips = [
  {
    label: 'Packing guide',
    title: 'The 3-layer packing method for calmer departures',
    copy: 'Build every suitcase around access, protection and easy unpacking.',
  },
  {
    label: 'Travel comfort',
    title: 'Make long journeys feel a little lighter',
    copy: 'A practical checklist for staying rested and organised in transit.',
  },
  {
    label: 'Travel documents',
    title: 'Keep the important things within reach',
    copy: 'Simple ways to protect your passport, cards and travel details.',
  },
]
