CREATE TABLE "asset_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"unit" text DEFAULT 'vnd' NOT NULL,
	CONSTRAINT "asset_category_name_length" CHECK (length(trim("asset_categories"."name")) BETWEEN 1 AND 80),
	CONSTRAINT "asset_category_unit" CHECK ("asset_categories"."unit" IN ('vnd', 'chi'))
);
--> statement-breakpoint
CREATE TABLE "asset_category_sets" (
	"user_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_checkpoint_items" ADD COLUMN "weight_milli_chi" integer;--> statement-breakpoint
ALTER TABLE "asset_checkpoint_items" ADD COLUMN "product_code" text;--> statement-breakpoint
ALTER TABLE "asset_checkpoint_items" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "asset_checkpoint_items" ADD COLUMN "buy_price" bigint;--> statement-breakpoint
ALTER TABLE "asset_checkpoint_items" ADD COLUMN "price_date" date;--> statement-breakpoint
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_category_sets" ADD CONSTRAINT "asset_category_sets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_categories_user_name_unique" ON "asset_categories" USING btree ("user_id",lower("name"));