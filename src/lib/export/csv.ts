const FORMULA_PREFIXES = ["=", "+", "-", "@"];

/** Защита от формул (Excel/Таблицы): значение, начинающееся с =, +, - или @, получает апостроф впереди. */
function guardFormula(value: string): string {
  return FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value;
}

function escapeCell(raw: string): string {
  const guarded = guardFormula(raw);
  return /["\n\r,]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

/** CSV в UTF-8 с BOM (Excel не ломает кириллицу), разделитель запятая, переводы строк CRLF. */
export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
