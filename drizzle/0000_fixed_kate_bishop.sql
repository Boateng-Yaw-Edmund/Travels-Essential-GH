CREATE TABLE "catalog_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(40) NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" uuid NOT NULL,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_audit_events_action_check" CHECK ("catalog_audit_events"."action" in ('create', 'update', 'publish', 'archive', 'attach_media', 'remove_media', 'replace_variants')),
	CONSTRAINT "catalog_audit_events_entity_type_check" CHECK ("catalog_audit_events"."entity_type" in ('category', 'product', 'variant', 'media')),
	CONSTRAINT "catalog_audit_events_changes_size_check" CHECK (octet_length("catalog_audit_events"."changes"::text) <= 8192)
);
--> statement-breakpoint
CREATE TABLE "catalog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(100) NOT NULL,
	"caption" varchar(160),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_categories_slug_check" CHECK ("catalog_categories"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "catalog_categories_name_check" CHECK (length(btrim("catalog_categories"."name")) > 0),
	CONSTRAINT "catalog_categories_sort_order_check" CHECK ("catalog_categories"."sort_order" >= 0),
	CONSTRAINT "catalog_categories_version_check" CHECK ("catalog_categories"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "catalog_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"role" varchar(16) DEFAULT 'gallery' NOT NULL,
	"alt_text" varchar(180) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_media_role_check" CHECK ("catalog_media"."role" in ('primary', 'gallery')),
	CONSTRAINT "catalog_media_alt_text_check" CHECK (length(btrim("catalog_media"."alt_text")) > 0),
	CONSTRAINT "catalog_media_sort_order_check" CHECK ("catalog_media"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "catalog_media_renditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	"object_key" varchar(500) NOT NULL,
	"mime_type" varchar(40) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"byte_size" integer NOT NULL,
	"checksum" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_media_renditions_kind_check" CHECK ("catalog_media_renditions"."kind" in ('thumbnail', 'display')),
	CONSTRAINT "catalog_media_renditions_mime_check" CHECK ("catalog_media_renditions"."mime_type" in ('image/avif', 'image/webp', 'image/jpeg')),
	CONSTRAINT "catalog_media_renditions_width_check" CHECK ("catalog_media_renditions"."width" between 1 and 6000),
	CONSTRAINT "catalog_media_renditions_height_check" CHECK ("catalog_media_renditions"."height" between 1 and 6000),
	CONSTRAINT "catalog_media_renditions_size_check" CHECK ("catalog_media_renditions"."byte_size" between 1 and 5242880),
	CONSTRAINT "catalog_media_renditions_object_key_check" CHECK ("catalog_media_renditions"."object_key" ~ '^catalog/[0-9a-f-]{36}/[0-9a-f]{64}/(thumbnail|display)\.(avif|webp|jpg)$'),
	CONSTRAINT "catalog_media_renditions_checksum_check" CHECK ("catalog_media_renditions"."checksum" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "catalog_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(140) NOT NULL,
	"short_description" varchar(300) NOT NULL,
	"description" text,
	"base_price_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'GHS' NOT NULL,
	"badge" varchar(40),
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_products_slug_check" CHECK ("catalog_products"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "catalog_products_name_check" CHECK (length(btrim("catalog_products"."name")) > 0),
	CONSTRAINT "catalog_products_price_check" CHECK ("catalog_products"."base_price_minor" between 0 and 999999999),
	CONSTRAINT "catalog_products_currency_check" CHECK ("catalog_products"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "catalog_products_status_check" CHECK ("catalog_products"."status" in ('draft', 'active', 'archived')),
	CONSTRAINT "catalog_products_sort_order_check" CHECK ("catalog_products"."sort_order" >= 0),
	CONSTRAINT "catalog_products_version_check" CHECK ("catalog_products"."version" > 0),
	CONSTRAINT "catalog_products_publish_check" CHECK (("catalog_products"."status" <> 'active') or ("catalog_products"."published_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "catalog_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"color_name" varchar(80),
	"color_hex" varchar(7),
	"price_override_minor" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_variants_sku_check" CHECK ("catalog_variants"."sku" ~ '^[A-Z0-9][A-Z0-9_-]{2,63}$'),
	CONSTRAINT "catalog_variants_name_check" CHECK (length(btrim("catalog_variants"."name")) > 0),
	CONSTRAINT "catalog_variants_color_hex_check" CHECK ("catalog_variants"."color_hex" is null or "catalog_variants"."color_hex" ~ '^#[0-9A-Fa-f]{6}$'),
	CONSTRAINT "catalog_variants_price_check" CHECK ("catalog_variants"."price_override_minor" is null or "catalog_variants"."price_override_minor" between 0 and 999999999),
	CONSTRAINT "catalog_variants_sort_order_check" CHECK ("catalog_variants"."sort_order" >= 0),
	CONSTRAINT "catalog_variants_version_check" CHECK ("catalog_variants"."version" > 0),
	CONSTRAINT "catalog_variants_id_product_unique" UNIQUE("id","product_id")
);
--> statement-breakpoint
ALTER TABLE "catalog_media" ADD CONSTRAINT "catalog_media_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_products"("id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "catalog_media" ADD CONSTRAINT "catalog_media_variant_product_fk" FOREIGN KEY ("variant_id","product_id") REFERENCES "public"."catalog_variants"("id","product_id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "catalog_media_renditions" ADD CONSTRAINT "catalog_media_renditions_media_id_catalog_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."catalog_media"("id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "catalog_variants" ADD CONSTRAINT "catalog_variants_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_products"("id") ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "catalog_audit_events_entity_idx" ON "catalog_audit_events" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_categories_slug_uidx" ON "catalog_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalog_categories_active_order_idx" ON "catalog_categories" USING btree ("sort_order","id") WHERE "catalog_categories"."is_active" = true;--> statement-breakpoint
CREATE INDEX "catalog_media_product_order_idx" ON "catalog_media" USING btree ("product_id","sort_order","id");--> statement-breakpoint
CREATE INDEX "catalog_media_variant_order_idx" ON "catalog_media" USING btree ("variant_id","sort_order","id") WHERE "catalog_media"."variant_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_media_primary_product_uidx" ON "catalog_media" USING btree ("product_id") WHERE "catalog_media"."role" = 'primary' and "catalog_media"."variant_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_media_primary_variant_uidx" ON "catalog_media" USING btree ("variant_id") WHERE "catalog_media"."role" = 'primary' and "catalog_media"."variant_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_media_renditions_object_key_uidx" ON "catalog_media_renditions" USING btree ("object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_media_renditions_media_kind_uidx" ON "catalog_media_renditions" USING btree ("media_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_products_slug_uidx" ON "catalog_products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalog_products_public_list_idx" ON "catalog_products" USING btree ("sort_order","id") WHERE "catalog_products"."status" = 'active';--> statement-breakpoint
CREATE INDEX "catalog_products_public_category_idx" ON "catalog_products" USING btree ("category_id","sort_order","id") WHERE "catalog_products"."status" = 'active';--> statement-breakpoint
CREATE INDEX "catalog_products_featured_idx" ON "catalog_products" USING btree ("sort_order","id") WHERE "catalog_products"."status" = 'active' and "catalog_products"."is_featured" = true;--> statement-breakpoint
CREATE INDEX "catalog_products_admin_updated_idx" ON "catalog_products" USING btree ("updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_variants_sku_uidx" ON "catalog_variants" USING btree ("sku");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_variants_product_name_uidx" ON "catalog_variants" USING btree ("product_id","name");--> statement-breakpoint
CREATE INDEX "catalog_variants_product_order_idx" ON "catalog_variants" USING btree ("product_id","sort_order","id") WHERE "catalog_variants"."is_active" = true;
--> statement-breakpoint
CREATE FUNCTION "catalog_reject_audit_mutation"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'catalogue audit events are append-only' USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "catalog_audit_events_append_only"
BEFORE UPDATE OR DELETE ON "catalog_audit_events"
FOR EACH ROW EXECUTE FUNCTION "catalog_reject_audit_mutation"();
--> statement-breakpoint
CREATE FUNCTION "catalog_reject_rendition_update"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'catalogue media renditions are immutable' USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "catalog_media_renditions_immutable"
BEFORE UPDATE ON "catalog_media_renditions"
FOR EACH ROW EXECUTE FUNCTION "catalog_reject_rendition_update"();
