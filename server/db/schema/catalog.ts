import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}

export const catalogCategories = pgTable(
  'catalog_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    caption: varchar('caption', { length: 160 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    version: integer('version').default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('catalog_categories_slug_uidx').on(table.slug),
    index('catalog_categories_active_order_idx')
      .on(table.sortOrder, table.id)
      .where(sql`${table.isActive} = true`),
    check(
      'catalog_categories_slug_check',
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check('catalog_categories_name_check', sql`length(btrim(${table.name})) > 0`),
    check('catalog_categories_sort_order_check', sql`${table.sortOrder} >= 0`),
    check('catalog_categories_version_check', sql`${table.version} > 0`),
  ],
)

export const catalogProducts = pgTable(
  'catalog_products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => catalogCategories.id, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 140 }).notNull(),
    shortDescription: varchar('short_description', { length: 300 }).notNull(),
    description: text('description'),
    basePriceMinor: integer('base_price_minor').notNull(),
    currency: varchar('currency', { length: 3 }).default('GHS').notNull(),
    badge: varchar('badge', { length: 40 }),
    status: varchar('status', { length: 16 }).default('draft').notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    version: integer('version').default(1).notNull(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('catalog_products_slug_uidx').on(table.slug),
    index('catalog_products_public_list_idx')
      .on(table.sortOrder, table.id)
      .where(sql`${table.status} = 'active'`),
    index('catalog_products_public_category_idx')
      .on(table.categoryId, table.sortOrder, table.id)
      .where(sql`${table.status} = 'active'`),
    index('catalog_products_featured_idx')
      .on(table.sortOrder, table.id)
      .where(sql`${table.status} = 'active' and ${table.isFeatured} = true`),
    index('catalog_products_admin_updated_idx').on(table.updatedAt, table.id),
    check(
      'catalog_products_slug_check',
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check('catalog_products_name_check', sql`length(btrim(${table.name})) > 0`),
    check(
      'catalog_products_price_check',
      sql`${table.basePriceMinor} between 0 and 999999999`,
    ),
    check('catalog_products_currency_check', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'catalog_products_status_check',
      sql`${table.status} in ('draft', 'active', 'archived')`,
    ),
    check('catalog_products_sort_order_check', sql`${table.sortOrder} >= 0`),
    check('catalog_products_version_check', sql`${table.version} > 0`),
    check(
      'catalog_products_publish_check',
      sql`(${table.status} <> 'active') or (${table.publishedAt} is not null)`,
    ),
  ],
)

export const catalogVariants = pgTable(
  'catalog_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => catalogProducts.id, {
        onDelete: 'cascade',
        onUpdate: 'restrict',
      }),
    sku: varchar('sku', { length: 64 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    colorName: varchar('color_name', { length: 80 }),
    colorHex: varchar('color_hex', { length: 7 }),
    priceOverrideMinor: integer('price_override_minor'),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    version: integer('version').default(1).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('catalog_variants_sku_uidx').on(table.sku),
    uniqueIndex('catalog_variants_product_name_uidx').on(
      table.productId,
      table.name,
    ),
    unique('catalog_variants_id_product_unique').on(
      table.id,
      table.productId,
    ),
    index('catalog_variants_product_order_idx')
      .on(table.productId, table.sortOrder, table.id)
      .where(sql`${table.isActive} = true`),
    check(
      'catalog_variants_sku_check',
      sql`${table.sku} ~ '^[A-Z0-9][A-Z0-9_-]{2,63}$'`,
    ),
    check('catalog_variants_name_check', sql`length(btrim(${table.name})) > 0`),
    check(
      'catalog_variants_color_hex_check',
      sql`${table.colorHex} is null or ${table.colorHex} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
    check(
      'catalog_variants_price_check',
      sql`${table.priceOverrideMinor} is null or ${table.priceOverrideMinor} between 0 and 999999999`,
    ),
    check('catalog_variants_sort_order_check', sql`${table.sortOrder} >= 0`),
    check('catalog_variants_version_check', sql`${table.version} > 0`),
  ],
)

export const catalogMedia = pgTable(
  'catalog_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => catalogProducts.id, {
        onDelete: 'cascade',
        onUpdate: 'restrict',
      }),
    variantId: uuid('variant_id'),
    role: varchar('role', { length: 16 }).default('gallery').notNull(),
    altText: varchar('alt_text', { length: 180 }).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      name: 'catalog_media_variant_product_fk',
      columns: [table.variantId, table.productId],
      foreignColumns: [catalogVariants.id, catalogVariants.productId],
    })
      .onDelete('cascade')
      .onUpdate('restrict'),
    index('catalog_media_product_order_idx').on(
      table.productId,
      table.sortOrder,
      table.id,
    ),
    index('catalog_media_variant_order_idx')
      .on(table.variantId, table.sortOrder, table.id)
      .where(sql`${table.variantId} is not null`),
    uniqueIndex('catalog_media_primary_product_uidx')
      .on(table.productId)
      .where(sql`${table.role} = 'primary' and ${table.variantId} is null`),
    uniqueIndex('catalog_media_primary_variant_uidx')
      .on(table.variantId)
      .where(sql`${table.role} = 'primary' and ${table.variantId} is not null`),
    check('catalog_media_role_check', sql`${table.role} in ('primary', 'gallery')`),
    check('catalog_media_alt_text_check', sql`length(btrim(${table.altText})) > 0`),
    check('catalog_media_sort_order_check', sql`${table.sortOrder} >= 0`),
  ],
)

export const catalogMediaRenditions = pgTable(
  'catalog_media_renditions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => catalogMedia.id, {
        onDelete: 'cascade',
        onUpdate: 'restrict',
      }),
    kind: varchar('kind', { length: 16 }).notNull(),
    objectKey: varchar('object_key', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 40 }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    byteSize: integer('byte_size').notNull(),
    checksum: varchar('checksum', { length: 128 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('catalog_media_renditions_object_key_uidx').on(table.objectKey),
    uniqueIndex('catalog_media_renditions_media_kind_uidx').on(
      table.mediaId,
      table.kind,
    ),
    check(
      'catalog_media_renditions_kind_check',
      sql`${table.kind} in ('thumbnail', 'display')`,
    ),
    check(
      'catalog_media_renditions_mime_check',
      sql`${table.mimeType} in ('image/avif', 'image/webp', 'image/jpeg')`,
    ),
    check('catalog_media_renditions_width_check', sql`${table.width} between 1 and 6000`),
    check('catalog_media_renditions_height_check', sql`${table.height} between 1 and 6000`),
    check(
      'catalog_media_renditions_size_check',
      sql`${table.byteSize} between 1 and 5242880`,
    ),
    check(
      'catalog_media_renditions_object_key_check',
      sql`${table.objectKey} ~ '^catalog/[0-9a-f-]{36}/[0-9a-f]{64}/(thumbnail|display)\\.(avif|webp|jpg)$'`,
    ),
    check(
      'catalog_media_renditions_checksum_check',
      sql`${table.checksum} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
)

export const catalogAuditEvents = pgTable(
  'catalog_audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').notNull(),
    action: varchar('action', { length: 40 }).notNull(),
    entityType: varchar('entity_type', { length: 40 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    changes: jsonb('changes').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('catalog_audit_events_entity_idx').on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    check(
      'catalog_audit_events_action_check',
      sql`${table.action} in ('create', 'update', 'publish', 'archive', 'attach_media', 'remove_media', 'replace_variants')`,
    ),
    check(
      'catalog_audit_events_entity_type_check',
      sql`${table.entityType} in ('category', 'product', 'variant', 'media')`,
    ),
    check(
      'catalog_audit_events_changes_size_check',
      sql`octet_length(${table.changes}::text) <= 8192`,
    ),
  ],
)
