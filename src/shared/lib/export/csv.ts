function sanitizeForSpreadsheet(raw: string): string {
  if (/^[=+\-@]/.test(raw)) {
    return `'${raw}`;
  }
  return raw;
}

export function escapeCsv(value: unknown): string {
  const raw = sanitizeForSpreadsheet(String(value ?? ""));
  const escaped = raw.replaceAll('"', '""');
  return /[",\n\r;]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const headerLine = headers.map(escapeCsv).join(",");
  const body = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  return `${headerLine}\n${body}\n`;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8"
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
