import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { processCsvText } from "./csvWorkflow";
import { sampleCsv } from "./sampleData";

const header =
  "order_id,product_name,quantity,unit_price,purchased_at,payment_method,status,customer_note";

function csv(rows: string[]): string {
  return [header, ...rows].join("\n");
}

describe("csv workflow", () => {
  it("processes sample CSV and summarizes results", () => {
    const result = processCsvText(sampleCsv);

    expect(result.detectedRows).toBe(24);
    expect(result.cancelledRows).toBe(2);
    expect(result.orders).toBe(22);
    expect(result.units).toBe(45);
    expect(result.sales).toBe(58600);
    expect(result.csv).not.toContain("customer_note");
    expect(result.rows.some((row) => row.status === "Cancelled")).toBe(false);
    expect(result.rows[0].purchased_at).toBe("2026-09-21 10:32");
  });

  it("keeps Japanese product names intact", () => {
    const result = processCsvText(
      csv(["EV-001,日本語商品,2,1200,2026/09/21 10:32,Card,Completed,メモ"])
    );

    expect(result.products[0]).toEqual({
      productName: "日本語商品",
      units: 2,
      sales: 2400
    });
    expect(result.csv).toContain("日本語商品");
  });

  it("handles one data row", () => {
    const result = processCsvText(
      csv(["EV-001,T-Shirt,1,2500,2026/09/21 10:32,Card,Completed,note"])
    );

    expect(result.orders).toBe(1);
    expect(result.units).toBe(1);
    expect(result.sales).toBe(2500);
  });

  it("handles roughly 5000 rows", () => {
    const rows = Array.from({ length: 5000 }, (_, index) => {
      const status = index % 10 === 0 ? "Cancelled" : "Completed";
      return `EV-${String(index + 1).padStart(4, "0")},T-Shirt,2,2500,2026/09/21 10:32,Card,${status},note`;
    });
    const result = processCsvText(csv(rows));

    expect(result.detectedRows).toBe(5000);
    expect(result.cancelledRows).toBe(500);
    expect(result.orders).toBe(4500);
    expect(result.sales).toBe(22500000);
  });

  it("reports missing required columns", () => {
    expect(() =>
      processCsvText("order_id,product_name\nEV-001,T-Shirt")
    ).toThrow('Required column "quantity" was not found.');
  });

  it("reports empty CSV", () => {
    expect(() => processCsvText("")).toThrow("The selected CSV file is empty.");
  });

  it("reports invalid quantity", () => {
    expect(() =>
      processCsvText(csv(["EV-001,T-Shirt,abc,2500,2026/09/21 10:32,Card,Completed,note"]))
    ).toThrow("Row 2 contains an invalid quantity.");
  });

  it("reports invalid date", () => {
    expect(() =>
      processCsvText(csv(["EV-001,T-Shirt,1,2500,2026/99/21 10:32,Card,Completed,note"]))
    ).toThrow("Row 2 contains an invalid purchased_at date.");
  });

  it("reports when only cancelled rows remain", () => {
    expect(() =>
      processCsvText(csv(["EV-001,T-Shirt,1,2500,2026/09/21 10:32,Card,Cancelled,note"]))
    ).toThrow("No valid orders remain after removing cancelled rows.");
  });

  it("handles quoted comma fields", () => {
    const result = processCsvText(
      csv(['EV-001,"Poster, Limited",1,1200,2026/09/21 10:32,Card,Completed,"memo, ok"'])
    );

    expect(result.products[0].productName).toBe("Poster, Limited");
    expect(result.sales).toBe(1200);
  });

  it("handles quoted newline fields", () => {
    const result = processCsvText(
      csv(['EV-001,"Mug\nTall",1,1600,2026/09/21 10:32,Card,Completed,"line\nmemo"'])
    );

    expect(result.products[0].productName).toBe("Mug\nTall");
    expect(result.sales).toBe(1600);
  });

  it("handles UTF-8 BOM", () => {
    const result = processCsvText(
      `\uFEFF${csv(["EV-001,T-Shirt,1,2500,2026/09/21 10:32,Card,Completed,note"])}`
    );

    expect(result.orders).toBe(1);
  });

  it("exports no cancelled rows, no customer_note, correct totals, and normalized dates", () => {
    const result = processCsvText(
      csv([
        "EV-001,T-Shirt,2,2500,2026/09/21 10:32,Card,Completed,note",
        "EV-002,T-Shirt,1,2500,2026/09/21 11:32,Card,Cancelled,note"
      ])
    );
    const parsed = Papa.parse<Record<string, string>>(result.csv, {
      header: true,
      skipEmptyLines: true
    });

    expect(parsed.meta.fields).toEqual([
      "order_id",
      "product_name",
      "quantity",
      "unit_price",
      "purchased_at",
      "payment_method",
      "status",
      "total"
    ]);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].status).toBe("Completed");
    expect(parsed.data[0].total).toBe("5000");
    expect(result.sales).toBe(5000);
    expect(parsed.data[0].purchased_at).toBe("2026-09-21 10:32");
  });
});
