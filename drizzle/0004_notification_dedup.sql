ALTER TABLE "transactions" ADD COLUMN "notification_hash" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_notification_hash_unique" ON "transactions" USING btree ("notification_hash");
--> statement-breakpoint
DROP TABLE "idempotency";
