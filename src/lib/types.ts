export type Category = { id: string; name: string; icon: string };
export type CategoryTotal = { category: Category | null; amount: string; count: number };
export type Transaction = {
  id: string;
  amount: string;
  title: string;
  categoryId: string | null;
  category: Category | null;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
};
export type TransactionPage = {
  data: Transaction[];
  nextCursor: string | null;
  total: string;
  count: number;
};
export type DayTotal = { date: string; amount: string; count: number };
export type Stats = {
  month: string;
  asOf: string;
  total: string;
  count: number;
  today: string;
  week: string;
  previousWeek: string;
  year: string;
  allTime: string;
  allTimeCount: number;
  previousMonth: string;
  previousMonthToDate: string;
  averageDaily: string;
  averageTransaction: string;
  activeDays: number;
  elapsedDays: number;
  daily: DayTotal[];
  monthly: { month: string; amount: string; count: number }[];
  byCategory: CategoryTotal[];
  highestDay: DayTotal | null;
  largestTransaction: Transaction | null;
};
export type GoldPrice = {
  productCode: string;
  productName: string;
  buyPrice: string;
  sellPrice: string;
};
export type GoldPurchase = {
  id: string;
  productCode: string;
  productName: string;
  weightMilliChi: number;
  purchasePrice: string;
  currentValue: string | null;
  purchasedAt: string;
  createdAt: string;
};
export type GoldPortfolio = {
  priceDate: string | null;
  priceFetchedAt: string | null;
  priceStale: boolean;
  prices: GoldPrice[];
  purchases: GoldPurchase[];
  totalCost: string;
  currentValue: string | null;
};
export type GoldHistoryPoint = { date: string; buy: string; sell: string | null };
export type GoldHistory = {
  productCode: string;
  productName: string;
  rangeStart: string;
  rangeEnd: string;
  fetchedAt: string;
  stale: boolean;
  points: GoldHistoryPoint[];
};
export type AssetCheckpointItem = { id: string; name: string; amount: string };
export type AssetCheckpoint = {
  id: string;
  total: string;
  createdAt: string;
  items: AssetCheckpointItem[];
};
export type AssetsResponse = { gold: GoldPortfolio; checkpoints: AssetCheckpoint[] };
