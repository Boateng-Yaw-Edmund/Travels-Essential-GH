import { readFileSync } from 'node:fs'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import {
  catalogCategories,
  catalogMedia,
  catalogMediaRenditions,
  catalogProducts,
  catalogVariants,
} from '../../server/db/schema/catalog'

describe('catalogue database schema', () => {
  it('places composite unique constraints only on tables with those columns', () => {
    const migration = readFileSync('drizzle/0000_fixed_kate_bishop.sql', 'utf8')
    const tables = [...migration.matchAll(/CREATE TABLE "([^"]+)" \(([\s\S]*?)\n\);/g)]
    expect(tables.length).toBeGreaterThan(0)
    for (const [, , body] of tables) {
      const columns = [...body.matchAll(/^\s*"([^"]+)"\s/gm)].map((match) => match[1])
      for (const constraint of body.matchAll(/UNIQUE\(([^)]+)\)/g)) {
        const references = [...constraint[1].matchAll(/"([^"]+)"/g)].map((match) => match[1])
        expect(columns).toEqual(expect.arrayContaining(references))
      }
    }
  })

  it('defines the catalogue tables under stable names', () => {
    expect([
      catalogCategories,
      catalogProducts,
      catalogVariants,
      catalogMedia,
      catalogMediaRenditions,
    ].map((table) => getTableConfig(table).name)).toEqual([
      'catalog_categories',
      'catalog_products',
      'catalog_variants',
      'catalog_media',
      'catalog_media_renditions',
    ])
  })

  it('stores money in integer minor units and variants as sellable SKUs', () => {
    expect(catalogProducts.basePriceMinor.dataType).toBe('number')
    expect(catalogProducts.basePriceMinor.notNull).toBe(true)
    expect(catalogVariants.sku.notNull).toBe(true)
    expect(catalogVariants.priceOverrideMinor.dataType).toBe('number')
  })

  it('stores only image metadata and immutable object keys', () => {
    const renditionColumns = getTableConfig(catalogMediaRenditions).columns
      .map((column) => column.name)

    expect(renditionColumns).toEqual(expect.arrayContaining([
      'object_key',
      'mime_type',
      'width',
      'height',
      'byte_size',
    ]))
    expect(renditionColumns).not.toEqual(expect.arrayContaining([
      'blob',
      'bytes',
      'data',
      'url',
    ]))
  })

  it('defines foreign keys and query-matching indexes', () => {
    const product = getTableConfig(catalogProducts)
    const variants = getTableConfig(catalogVariants)
    const media = getTableConfig(catalogMedia)
    const renditions = getTableConfig(catalogMediaRenditions)

    expect(product.foreignKeys).toHaveLength(1)
    expect(variants.foreignKeys).toHaveLength(1)
    expect(media.foreignKeys).toHaveLength(2)
    expect(renditions.foreignKeys).toHaveLength(1)
    expect(product.indexes.length).toBeGreaterThanOrEqual(3)
    expect(variants.indexes.length).toBeGreaterThanOrEqual(1)
    expect(media.indexes.length).toBeGreaterThanOrEqual(1)
  })

  it('protects catalogue invariants with database checks', () => {
    expect(getTableConfig(catalogCategories).checks.length).toBeGreaterThanOrEqual(3)
    expect(getTableConfig(catalogProducts).checks.length).toBeGreaterThanOrEqual(5)
    expect(getTableConfig(catalogVariants).checks.length).toBeGreaterThanOrEqual(5)
    expect(getTableConfig(catalogMediaRenditions).checks.length).toBeGreaterThanOrEqual(5)
  })
})
