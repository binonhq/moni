export function csvCell(value: string): string {
  // Keep user-entered titles/categories as text when opened in a spreadsheet.
  const safe = /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
