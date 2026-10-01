import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import {
  RawRow,
  WorkflowResult,
  parseCsvText,
  processCsvText
} from "./csvWorkflow";
import { sampleCsv } from "./sampleData";

const maxFileSize = 5 * 1024 * 1024;

type LoadedCsv = {
  name: string;
  text: string;
  rows: RawRow[];
  detectedRows: number;
};

export default function App() {
  const [loadedCsv, setLoadedCsv] = useState<LoadedCsv | null>(null);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewRows = useMemo(() => loadedCsv?.rows.slice(0, 5) ?? [], [loadedCsv]);

  function reset() {
    setLoadedCsv(null);
    setResult(null);
    setError("");
    setIsProcessing(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function loadText(name: string, text: string) {
    try {
      const parsed = parseCsvText(text);
      setLoadedCsv({
        name,
        text,
        rows: parsed.rows,
        detectedRows: parsed.detectedRows
      });
      setResult(null);
      setError("");
    } catch (caught) {
      setLoadedCsv(null);
      setResult(null);
      setError(toErrorMessage(caught));
    }
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a .csv file.");
      return;
    }

    if (file.size > maxFileSize) {
      setError("The selected CSV is larger than the 5 MB demo limit.");
      return;
    }

    try {
      const text = await file.text();
      loadText(file.name, text);
    } catch {
      setError("The selected CSV file could not be read.");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void loadFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void loadFile(event.dataTransfer.files[0]);
  }

  function processCsv() {
    if (!loadedCsv) return;

    setIsProcessing(true);
    setError("");
    window.requestAnimationFrame(() => {
      try {
        setResult(processCsvText(loadedCsv.text));
      } catch (caught) {
        setResult(null);
        setError(toErrorMessage(caught));
      } finally {
        setIsProcessing(false);
      }
    });
  }

  function downloadCsv() {
    if (!result) return;

    const blob = new Blob([`\uFEFF${result.csv}`], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "event_sales_processed.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="CSV Workflow home">
          CSV Workflow
        </a>
        <span>Demo Project — Ayato Inami</span>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">Browser-only CSV workflow demo</p>
            <h1 id="hero-title">Turn repetitive CSV work into one click.</h1>
            <p className="lead">毎回繰り返しているCSV作業を、ワンクリックに。</p>
          </div>
          <div className="hero-copy">
            <p>
              CSVを選択すると、不要データの除外・形式統一・売上計算・集計までブラウザ上で自動処理します。
            </p>
            <p className="privacy-line">Your file stays in your browser. Nothing is uploaded.</p>
          </div>
        </section>

        <section className="workspace" aria-label="CSV workflow">
          <div className="input-column">
            <div
              className={`drop-zone ${isDragging ? "is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                id="csv-file"
                className="file-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
              />
              <label htmlFor="csv-file" className="drop-label">
                <span>Drop CSV here</span>
                <span>or</span>
                <span className="button-like">Select CSV</span>
                <small>.csv · max 5 MB</small>
              </label>
            </div>

            <button
              className="secondary-button"
              type="button"
              onClick={() => loadText("sample-event-sales.csv", sampleCsv)}
            >
              Try with sample data
            </button>

            <div className="rules" aria-labelledby="rules-title">
              <h2 id="rules-title">This workflow will:</h2>
              <ol>
                <li>
                  <span>01</span>
                  <strong>Remove cancelled orders</strong>
                  status = Cancelled を除外。
                </li>
                <li>
                  <span>02</span>
                  <strong>Remove unnecessary columns</strong>
                  customer_note を削除。
                </li>
                <li>
                  <span>03</span>
                  <strong>Normalize dates</strong>
                  2026/09/21 10:32 → 2026-09-21 10:32
                </li>
                <li>
                  <span>04</span>
                  <strong>Calculate sales</strong>
                  total = quantity × unit_price
                </li>
                <li>
                  <span>05</span>
                  <strong>Summarize results</strong>
                  Orders, Units sold, Total sales を計算。
                </li>
              </ol>
            </div>
          </div>

          <div className="output-column">
            <div aria-live="polite">
              {error && (
                <div className="message error" role="alert">
                  <strong>Check the CSV</strong>
                  <span>{error}</span>
                </div>
              )}

              {loadedCsv && (
                <section className="panel" aria-labelledby="preview-title">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">{loadedCsv.name}</p>
                      <h2 id="preview-title">{loadedCsv.detectedRows} rows detected</h2>
                    </div>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={processCsv}
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Processing..." : "Process CSV"}
                    </button>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row) => (
                          <tr key={row.order_id}>
                            <td>{row.order_id}</td>
                            <td>{row.product_name}</td>
                            <td>{row.quantity}</td>
                            <td>{formatCurrency(Number(row.unit_price))}</td>
                            <td>{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {result && (
                <section className="panel result-panel" aria-labelledby="result-title">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Processing complete</p>
                      <h2 id="result-title">Result Summary</h2>
                    </div>
                    <button className="secondary-button" type="button" onClick={reset}>
                      Process another file
                    </button>
                  </div>

                  <div className="summary-grid">
                    <SummaryValue value={String(result.orders)} label="Orders" />
                    <SummaryValue value={String(result.units)} label="Units" />
                    <SummaryValue value={formatCurrency(result.sales)} label="Sales" />
                  </div>

                  <p className="change-note">
                    {result.cancelledRows} cancelled rows removed. customer_note removed.
                  </p>

                  <h3>Product Summary</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Units</th>
                          <th>Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.products.map((product) => (
                          <tr key={product.productName}>
                            <td>{product.productName}</td>
                            <td>{product.units}</td>
                            <td>{formatCurrency(product.sales)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button className="primary-button download-button" type="button" onClick={downloadCsv}>
                    Download Processed CSV
                  </button>
                </section>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="privacy-footer">
        <strong>Your data stays private.</strong>
        <span>CSV processing happens entirely in your browser.</span>
        <span>Your file is not uploaded to a server.</span>
      </footer>
    </div>
  );
}

function SummaryValue({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(value);
}

function toErrorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : "The CSV could not be processed.";
}
