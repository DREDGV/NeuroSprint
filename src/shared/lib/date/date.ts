export function toLocalDateKey(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatSecondsFromMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)} с`;
}

