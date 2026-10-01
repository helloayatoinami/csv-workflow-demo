import Papa from "papaparse";

export const requiredColumns = [
  "order_id",
  "product_name",
  "quantity",
  "unit_price",
  "purchased_at",
  "payment_method",
  "status",
  "customer_note"
] as const;

export type RequiredColumn = (typeof requiredColumns)[number];

export type RawRow = Record<RequiredColumn, string>;

export type ProcessedRow = Omit<RawRow, "customer_note"> & {
  total: number;
};

export type ProductSummary = {
  productName: string;
  units: number;
  sales: number;
};

export type WorkflowResult = {
  rows: ProcessedRow[];
  detectedRows: number;
  cancelledRows: number;
  orders: number;
  units: number;
  sales: number;
  products: ProductSummary[];
  csv: string;
};

type ParsedCsv = {
  rows: RawRow[];
  detectedRows: number;
};

const outputColumns = [
  "order_id",
  "product_name",
  "quantity",
  "unit_price",
  "purchased_at",
  "payment_method",
  "status",
  "total"
] as const;

export function parseCsvText(csvText: string): ParsedCsv {
  if (csvText.trim().length === 0) {
    throw new Error("The selected CSV file is empty.");
  }

  const normalizedText = csvText.replace(/^\uFEFF/, "");
  const parsed = Papa.parse<Record<string, string>>(normalizedText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });

  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0];
    throw new Error(
      `CSV could not be parsed near row ${firstError.row ?? "unknown"}: ${firstError.message}`
    );
  }

  const fields = parsed.meta.fields ?? [];
  for (const column of requiredColumns) {
    if (!fields.includes(column)) {
      throw new Error(`Required column "${column}" was not found.`);
    }
  }

  if (parsed.data.length === 0) {
    throw new Error("The CSV contains no data rows.");
  }

  const rows = parsed.data.map((row, index) => {
    const normalizedRow = {} as RawRow;
    for (const column of requiredColumns) {
      const value = row[column];
      if (
        column !== "customer_note" &&
        (value === undefined || value === null || String(value).trim() === "")
      ) {
        throw new Error(`Row ${index + 2} contains an empty "${column}" value.`);
      }
      normalizedRow[column] = String(value ?? "").trim();
    }
    return normalizedRow;
  });

  return {
    rows,
    detectedRows: rows.length
  };
}

export function processCsvText(csvText: string): WorkflowResult {
  const parsed = parseCsvText(csvText);
  return processRows(parsed.rows, parsed.detectedRows);
}

export function processRows(rows: RawRow[], detectedRows = rows.length): WorkflowResult {
  const processedRows: ProcessedRow[] = [];
  let cancelledRows = 0;

  rows.forEach((row, index) => {
    const displayRow = index + 2;
    const quantity = parsePositiveNumber(row.quantity, "quantity", displayRow);
    const unitPrice = parsePositiveNumber(row.unit_price, "unit_price", displayRow);
    const purchasedAt = normalizeDate(row.purchased_at, displayRow);

    if (row.status.toLowerCase() === "cancelled") {
      cancelledRows += 1;
      return;
    }

    processedRows.push({
      order_id: row.order_id,
      product_name: row.product_name,
      quantity: String(quantity),
      unit_price: String(unitPrice),
      purchased_at: purchasedAt,
      payment_method: row.payment_method,
      status: row.status,
      total: quantity * unitPrice
    });
  });

  if (processedRows.length === 0) {
    throw new Error("No valid orders remain after removing cancelled rows.");
  }

  const productsByName = new Map<string, ProductSummary>();
  let units = 0;
  let sales = 0;

  for (const row of processedRows) {
    const quantity = Number(row.quantity);
    units += quantity;
    sales += row.total;

    const existing = productsByName.get(row.product_name) ?? {
      productName: row.product_name,
      units: 0,
      sales: 0
    };
    existing.units += quantity;
    existing.sales += row.total;
    productsByName.set(row.product_name, existing);
  }

  const products = Array.from(productsByName.values()).sort((a, b) =>
    a.productName.localeCompare(b.productName)
  );

  return {
    rows: processedRows,
    detectedRows,
    cancelledRows,
    orders: processedRows.length,
    units,
    sales,
    products,
    csv: exportProcessedCsv(processedRows)
  };
}

export function exportProcessedCsv(rows: ProcessedRow[]): string {
  return Papa.unparse(rows, {
    columns: [...outputColumns],
    newline: "\r\n"
  });
}

export function normalizeDate(value: string, rowNumber: number): string {
  const match = value.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/
  );

  if (!match) {
    throw new Error(`Row ${rowNumber} contains an invalid purchased_at date.`);
  }

  const [, year, month, day, hour = "00", minute = "00"] = match;
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const numericHour = Number(hour);
  const numericMinute = Number(minute);
  const date = new Date(
    Number(year),
    numericMonth - 1,
    numericDay,
    numericHour,
    numericMinute
  );

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== numericMonth - 1 ||
    date.getDate() !== numericDay ||
    numericHour > 23 ||
    numericMinute > 59
  ) {
    throw new Error(`Row ${rowNumber} contains an invalid purchased_at date.`);
  }

  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

function parsePositiveNumber(value: string, field: "quantity" | "unit_price", rowNumber: number): number {
  const normalized = value.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Row ${rowNumber} contains an invalid ${field}.`);
  }

  const number = Number(normalized);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`Row ${rowNumber} contains an invalid ${field}.`);
  }

  return number;
}

function pad(value: string): string {
  return value.padStart(2, "0");
}
