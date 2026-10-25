export const TIMEZONE = "Asia/Ho_Chi_Minh";
const OFFSET = 7 * 60 * 60 * 1000;
export function localDay(value: Date | string = new Date()) { return new Date(new Date(value).getTime() + OFFSET).toISOString().slice(0, 10); }
export function localMonth(value: Date | string = new Date()) { return localDay(value).slice(0, 7); }
export function dayStart(day: string) { return new Date(`${day}T00:00:00+07:00`); }
export function addDays(day: string, n: number) { return localDay(new Date(dayStart(day).getTime() + n * 86400000)); }
export function monthBounds(month: string) {
  const [year, m] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, m, 1)).toISOString().slice(0, 10);
  return { start: dayStart(`${month}-01`), end: dayStart(next), days: new Date(Date.UTC(year, m, 0)).getUTCDate() };
}
export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}
export function weekStart(now: Date) {
  const day = localDay(now);
  const weekday = new Date(day + "T12:00:00Z").getUTCDay();
  return dayStart(addDays(day, -((weekday + 6) % 7)));
}
export function displayDate(value: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, day: "numeric", month: "short", ...options }).format(new Date(value));
}
export function monthLabel(month: string) { return displayDate(`${month}-01T00:00:00+07:00`, { day: undefined, month: "long", year: "numeric" }); }
export function localInput(value: string) { return new Date(new Date(value).getTime() + OFFSET).toISOString().slice(0, 19); }
