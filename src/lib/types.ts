export type Transaction = { id: string; amount: string; timestamp: string; createdAt: string; updatedAt: string };
export type TransactionPage = { data: Transaction[]; nextCursor: string | null };
export type DayTotal = { date: string; amount: string; count: number };
export type Stats = {
  month: string; asOf: string; total: string; count: number; today: string; week: string; previousWeek: string;
  year: string; allTime: string; allTimeCount: number; previousMonth: string; previousMonthToDate: string;
  averageDaily: string; averageTransaction: string; activeDays: number; elapsedDays: number;
  daily: DayTotal[]; monthly: { month: string; amount: string; count: number }[];
  highestDay: DayTotal | null; largestTransaction: Transaction | null;
};
