import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  uuid,
  date,
  jsonb,
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

export const goldPrices = pgTable(
  "gold_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    priceDate: date("price_date", { mode: "string" }).notNull(),
    productCode: text("product_code").notNull(),
    productName: text("product_name").notNull(),
    buyPrice: bigint("buy_price", { mode: "bigint" }).notNull(),
    sellPrice: bigint("sell_price", { mode: "bigint" }).notNull(),
    fetchedAt: instant("fetched_at").notNull().defaultNow(),
  },
  t => [
    uniqueIndex("gold_prices_date_product_unique").on(t.priceDate, t.productCode),
    index("gold_prices_date_idx").on(t.priceDate.desc()),
    check("gold_prices_positive", sql`${t.buyPrice} > 0 AND ${t.sellPrice} > 0`),
  ],
);

export const goldPurchases = pgTable(
  "gold_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    productCode: text("product_code").notNull(),
    productName: text("product_name").notNull(),
    weightMilliChi: integer("weight_milli_chi").notNull(),
    purchasePrice: bigint("purchase_price", { mode: "bigint" }).notNull(),
    purchasedAt: instant("purchased_at").notNull(),
    createdAt: instant("created_at").notNull().defaultNow(),
  },
  t => [
    index("gold_purchases_user_date_idx").on(t.userId, t.purchasedAt.desc()),
    check("gold_purchase_weight_positive", sql`${t.weightMilliChi} > 0`),
    check(
      "gold_purchase_price_positive",
      sql`${t.purchasePrice} > 0 AND ${t.purchasePrice} <= 9007199254740991`,
    ),
  ],
);

export const goldHistoryCache = pgTable("gold_history_cache", {
  productCode: text("product_code").primaryKey(),
  productName: text("product_name").notNull(),
  points: jsonb("points")
    .$type<Array<{ date: string; buy: string; sell: string | null }>>()
    .notNull(),
  fetchedAt: instant("fetched_at").notNull().defaultNow(),
});

export const assetCheckpoints = pgTable(
  "asset_checkpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    total: bigint("total", { mode: "bigint" }).notNull(),
    createdAt: instant("created_at").notNull().defaultNow(),
  },
  t => [
    index("asset_checkpoints_user_date_idx").on(t.userId, t.createdAt.desc()),
    check("asset_checkpoint_total_nonnegative", sql`${t.total} >= 0`),
  ],
);

export const assetCheckpointItems = pgTable(
  "asset_checkpoint_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checkpointId: uuid("checkpoint_id")
      .notNull()
      .references(() => assetCheckpoints.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    position: integer("position").notNull(),
    weightMilliChi: integer("weight_milli_chi"),
    productCode: text("product_code"),
    productName: text("product_name"),
    buyPrice: bigint("buy_price", { mode: "bigint" }),
    priceDate: date("price_date", { mode: "string" }),
  },
  t => [
    index("asset_checkpoint_items_checkpoint_idx").on(t.checkpointId, t.position),
    check("asset_checkpoint_item_name_length", sql`length(trim(${t.name})) BETWEEN 1 AND 80`),
    check("asset_checkpoint_item_amount_nonnegative", sql`${t.amount} >= 0`),
  ],
);

export const assetCategorySets = pgTable("asset_category_sets", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
});
export const assetCategories = pgTable(
  "asset_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unit: text("unit").$type<"vnd" | "chi">().notNull().default("vnd"),
  },
  t => [
    uniqueIndex("asset_categories_user_name_unique").on(t.userId, sql`lower(${t.name})`),
    check("asset_category_name_length", sql`length(trim(${t.name})) BETWEEN 1 AND 80`),
    check("asset_category_unit", sql`${t.unit} IN ('vnd', 'chi')`),
  ],
);
