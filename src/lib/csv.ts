import fs from "node:fs/promises";
import path from "node:path";

type CsvRow = Record<string, string>;

export async function readCsv(fileName: string): Promise<CsvRow[]> {
  const filePath = path.join(process.cwd(), "synthetic_data", fileName);
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.trim().split("\n");
  if (!lines.length) return [];

  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const parts = line.split(",");
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = parts[idx] ?? "";
    });
    return row;
  });
}

export function calcAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
