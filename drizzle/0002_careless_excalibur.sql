ALTER TABLE "transactions" ALTER COLUMN "title" SET DEFAULT 'Expense';--> statement-breakpoint
UPDATE "transactions" SET "title" = 'Expense' WHERE "title" = 'expense';
