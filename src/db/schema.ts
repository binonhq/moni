import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  uuid,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
});
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: instant("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: instant("created_at").notNull().defaultNow(),
    updatedAt: instant("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  t => [index("session_user_idx").on(t.userId)],
);
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: instant("access_token_expires_at"),
    refreshTokenExpiresAt: instant("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: instant("created_at").notNull().defaultNow(),
    updatedAt: instant("updated_at").notNull().defaultNow(),
  },
  t => [index("account_user_idx").on(t.userId)],
);
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: instant("expires_at").notNull(),
    createdAt: instant("created_at").notNull().defaultNow(),
    updatedAt: instant("updated_at").notNull().defaultNow(),
  },
  t => [index("verification_identifier_idx").on(t.identifier)],
);
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("tag"),
    createdAt: instant("created_at").notNull().defaultNow(),
  },
  t => [
    uniqueIndex("categories_user_name_unique").on(t.userId, sql`lower(${t.name})`),
    check("category_name_length", sql`length(trim(${t.name})) BETWEEN 1 AND 40`),
  ],
);
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    title: text("title").notNull().default("Expense"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    notificationHash: text("notification_hash"),
    timestamp: instant("timestamp").notNull(),
    createdAt: instant("created_at").notNull().defaultNow(),
    updatedAt: instant("updated_at").notNull().defaultNow(),
  },
  t => [
    index("transactions_timestamp_id_idx").on(t.timestamp.desc(), t.id.desc()),
    index("transactions_category_timestamp_idx").on(t.categoryId, t.timestamp),
    uniqueIndex("transactions_notification_hash_unique").on(t.notificationHash),
    check("transaction_title_length", sql`length(trim(${t.title})) BETWEEN 1 AND 120`),
    check("amount_positive_safe", sql`${t.amount} > 0 AND ${t.amount} <= 9007199254740991`),
  ],
);
export const apiToken = pgTable(
  "api_token",
  {
    id: integer("id").primaryKey().default(1),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    hash: text("hash").notNull(),
    createdAt: instant("created_at").notNull().defaultNow(),
    lastUsedAt: instant("last_used_at"),
  },
  t => [uniqueIndex("api_token_user_unique").on(t.userId)],
);
export const rateBuckets = pgTable(
  "rate_buckets",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    resetAt: instant("reset_at").notNull(),
  },
  t => [index("rate_buckets_reset_idx").on(t.resetAt)],
);
