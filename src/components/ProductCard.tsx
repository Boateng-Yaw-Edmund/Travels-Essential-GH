import { LoaderCircle, ShoppingBag } from 'lucide-react'
import { formatGhs } from '../lib/storefront'
import type { Product, ProductVariant } from '../types'

interface ProductCardProps {
  product: Product
  isAdding: boolean
  selectedVariantId?: string
  onVariantSelect: (productId: string, variantId: string) => void
  onAdd: (product: Product, variant?: ProductVariant) => void
}

export function ProductCard({ product, isAdding, selectedVariantId, onVariantSelect, onAdd }: ProductCardProps) {
  const selectedVariant = product.variants?.find((variant) => variant.id === selectedVariantId)
  const productLabel = selectedVariant ? `${product.name} in ${selectedVariant.name}` : product.name

  return (
    <article className="product-card" data-testid="product-card">
      <div
        className={`product-card__image ${selectedVariant ? 'product-card__image--standalone' : ''}`}
        role="img"
        aria-label={`${productLabel} product photograph`}
        style={{
          backgroundImage: `url(${selectedVariant?.image ?? product.image})`,
          backgroundPosition: selectedVariant ? 'center' : product.imagePosition,
        }}
      >
        {product.badge && <span className="badge">{product.badge}</span>}
      </div>
      <div className="product-card__content">
        <p className="eyebrow">Travel ready</p>
        <h3>{product.name}</h3>
        <p className="product-card__description">{product.description}</p>
        {product.variants && selectedVariant && (
          <fieldset className="variant-picker">
            <legend>{`Colour: ${selectedVariant.name}`}</legend>
            <div>
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  aria-label={`Select ${variant.name}`}
                  aria-pressed={variant.id === selectedVariant.id}
                  disabled={isAdding}
                  onClick={() => onVariantSelect(product.id, variant.id)}
                >
                  <span style={{ backgroundColor: variant.swatch }} />
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <div className="product-card__footer">
          <strong>{formatGhs(product.price)}</strong>
          <button
            className="icon-button icon-button--filled"
            type="button"
            aria-label={`${isAdding ? 'Adding' : 'Add'} ${productLabel} to cart`}
            aria-busy={isAdding}
            disabled={isAdding}
            onClick={() => onAdd(product, selectedVariant)}
          >
            {isAdding
              ? <LoaderCircle className="add-spinner" aria-hidden="true" size={18} />
              : <ShoppingBag aria-hidden="true" size={18} />}
          </button>
        </div>
      </div>
    </article>
  )
}
