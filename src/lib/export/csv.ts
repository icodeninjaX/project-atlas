type CsvValue = unknown;
type CsvRecord = Record<string, CsvValue>;

function safeCell(value: CsvValue): string {
  if (value == null) return "";

  let text = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;

  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function createCsv(rows: CsvRecord[], columns: string[]): string {
  const lines = [
    columns.map(safeCell).join(","),
    ...rows.map((row) =>
      columns.map((column) => safeCell(row[column])).join(","),
    ),
  ];

  return lines.join("\r\n");
}
