CREATE TABLE "gold_history_cache" (
	"product_code" text PRIMARY KEY NOT NULL,
	"product_name" text NOT NULL,
	"points" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
