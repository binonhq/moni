export function normalizeAmount(value: string, allowEmpty = false): string {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits || (allowEmpty ? "" : "0");
}
export function formatAmountInput(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
