CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'tag' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_name_length" CHECK (length(trim("categories"."name")) BETWEEN 1 AND 40)
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "title" text DEFAULT 'expense' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "categories" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_category_timestamp_idx" ON "transactions" USING btree ("category_id","timestamp");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transaction_title_length" CHECK (length(trim("transactions"."title")) BETWEEN 1 AND 120);
--> statement-breakpoint
INSERT INTO "categories" ("name", "icon") VALUES
  ('Food', 'utensils'), ('Friend', 'users'), ('Love', 'heart'),
  ('Shopping', 'shopping-bag'), ('Gas', 'fuel'), ('Transport', 'bus'),
  ('Bills', 'house'), ('Coffee', 'coffee'), ('Health', 'heart-pulse'),
  ('Entertainment', 'ticket'), ('Education', 'graduation-cap'), ('Other', 'tag');
