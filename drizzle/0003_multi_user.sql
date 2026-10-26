ALTER TABLE "categories" ADD COLUMN "user_id" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "user_id" text;
--> statement-breakpoint
ALTER TABLE "api_token" ADD COLUMN "user_id" text;
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP INDEX IF EXISTS "single_owner";
--> statement-breakpoint
DROP INDEX IF EXISTS "categories_name_unique";
--> statement-breakpoint
ALTER TABLE "api_token" DROP CONSTRAINT IF EXISTS "single_token";
--> statement-breakpoint
DO $$
DECLARE first_user text;
BEGIN
  SELECT id INTO first_user FROM "user" ORDER BY created_at LIMIT 1;
  IF first_user IS NOT NULL THEN
    UPDATE "categories" SET user_id = first_user WHERE user_id IS NULL;
    UPDATE "transactions" SET user_id = first_user WHERE user_id IS NULL;
    UPDATE "api_token" SET user_id = first_user WHERE user_id IS NULL;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_name_unique" ON "categories" USING btree ("user_id", lower("name"));
--> statement-breakpoint
CREATE UNIQUE INDEX "api_token_user_unique" ON "api_token" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "categories_user_idx" ON "categories" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "transactions_user_timestamp_idx" ON "transactions" USING btree ("user_id", "timestamp" DESC NULLS LAST, "id" DESC NULLS LAST);
