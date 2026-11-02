CREATE TABLE "asset_checkpoint_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkpoint_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" bigint NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "asset_checkpoint_item_name_length" CHECK (length(trim("asset_checkpoint_items"."name")) BETWEEN 1 AND 80),
	CONSTRAINT "asset_checkpoint_item_amount_nonnegative" CHECK ("asset_checkpoint_items"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "asset_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"total" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_checkpoint_total_nonnegative" CHECK ("asset_checkpoints"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "gold_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_date" date NOT NULL,
	"product_code" text NOT NULL,
	"product_name" text NOT NULL,
	"buy_price" bigint NOT NULL,
	"sell_price" bigint NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gold_prices_positive" CHECK ("gold_prices"."buy_price" > 0 AND "gold_prices"."sell_price" > 0)
);
--> statement-breakpoint
CREATE TABLE "gold_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"product_code" text NOT NULL,
	"product_name" text NOT NULL,
	"weight_milli_chi" integer NOT NULL,
	"purchase_price" bigint NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gold_purchase_weight_positive" CHECK ("gold_purchases"."weight_milli_chi" > 0),
	CONSTRAINT "gold_purchase_price_positive" CHECK ("gold_purchases"."purchase_price" > 0 AND "gold_purchases"."purchase_price" <= 9007199254740991)
);
--> statement-breakpoint
ALTER TABLE "asset_checkpoint_items" ADD CONSTRAINT "asset_checkpoint_items_checkpoint_id_asset_checkpoints_id_fk" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."asset_checkpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_checkpoints" ADD CONSTRAINT "asset_checkpoints_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gold_purchases" ADD CONSTRAINT "gold_purchases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_checkpoint_items_checkpoint_idx" ON "asset_checkpoint_items" USING btree ("checkpoint_id","position");--> statement-breakpoint
CREATE INDEX "asset_checkpoints_user_date_idx" ON "asset_checkpoints" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "gold_prices_date_product_unique" ON "gold_prices" USING btree ("price_date","product_code");--> statement-breakpoint
CREATE INDEX "gold_prices_date_idx" ON "gold_prices" USING btree ("price_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "gold_purchases_user_date_idx" ON "gold_purchases" USING btree ("user_id","purchased_at" DESC NULLS LAST);
