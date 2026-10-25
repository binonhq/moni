export function formatExpenseTitle(value?: string | null): string {
  const title = value?.trim().replace(/\s+/g, " ") || "Expense";
  return title.replace(/(^|[\s/\-–—])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toLocaleUpperCase("vi-VN"));
}
