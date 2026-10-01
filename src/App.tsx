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
      setError(toDisplayError(caught));
    }
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError(".csv ファイルを選択してください。");
      return;
    }

    if (file.size > maxFileSize) {
      setError("選択したCSVがデモ上限の5MBを超えています。");
      return;
    }

    try {
      const text = await file.text();
      loadText(file.name, text);
    } catch {
      setError("選択したCSVファイルを読み込めませんでした。");
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
        setError(toDisplayError(caught));
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
        <a className="brand" href="/" aria-label="CSV Workflow ホーム">
          CSV Workflow
        </a>
        <span>デモプロジェクト — Ayato Inami</span>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">ブラウザ完結型CSV整形・集計ツール</p>
            <h1 id="hero-title">毎回のCSV作業を、ワンクリックに。</h1>
          </div>
          <div className="hero-copy">
            <p>
              CSVを選ぶだけで、不要データの除外・形式統一・計算・集計まで自動化します。
            </p>
            <p className="privacy-line">ファイルは外部に送信されません。</p>
          </div>
        </section>

        <section className="section how-to" aria-labelledby="how-to-title">
          <div className="section-heading">
            <p className="eyebrow">使い方</p>
            <h2 id="how-to-title">4ステップで処理できます</h2>
          </div>
          <ol className="step-grid">
            <li><span>01</span><strong>CSVを選択</strong></li>
            <li><span>02</span><strong>内容を確認</strong></li>
            <li><span>03</span><strong>自動処理</strong></li>
            <li><span>04</span><strong>結果をダウンロード</strong></li>
          </ol>
        </section>

        <section className="section" aria-labelledby="select-title">
          <div className="section-heading">
            <p className="eyebrow">CSV選択</p>
            <h2 id="select-title">処理したいCSVを選択してください</h2>
          </div>
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
              <span>ここにCSVをドロップ</span>
              <span>または</span>
              <span className="button-like">CSVを選択</span>
              <small>.csv · 最大5MB</small>
            </label>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => loadText("sample-event-sales.csv", sampleCsv)}
          >
            サンプルデータで試す
          </button>
        </section>

        <section className="section rules" aria-labelledby="rules-title">
          <div className="section-heading">
            <p className="eyebrow">自動化される処理</p>
            <h2 id="rules-title">このワークフローで行うこと</h2>
          </div>
          <ol className="rule-grid">
            <li><span>01</span><strong>キャンセル注文を除外</strong>status = Cancelled を除外。</li>
            <li><span>02</span><strong>不要な列を削除</strong>customer_note を削除。</li>
            <li><span>03</span><strong>日付形式を統一</strong>2026/09/21 10:32 → 2026-09-21 10:32</li>
            <li><span>04</span><strong>売上を計算</strong>total = quantity × unit_price</li>
            <li><span>05</span><strong>結果を集計</strong>注文数、販売点数、売上を計算。</li>
          </ol>
        </section>

        <div aria-live="polite">
          {error && (
            <section className="section message error" role="alert">
              <strong>CSVを確認してください</strong>
              <span>{error}</span>
            </section>
          )}

          {loadedCsv && (
            <section className="section panel" aria-labelledby="preview-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{loadedCsv.name}</p>
                  <h2 id="preview-title">{loadedCsv.detectedRows}行を検出しました</h2>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={processCsv}
                  disabled={isProcessing}
                >
                  {isProcessing ? "処理中..." : "CSVを処理する"}
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>注文ID</th>
                      <th>商品</th>
                      <th>数量</th>
                      <th>単価</th>
                      <th>ステータス</th>
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
            <section className="section panel result-panel" aria-labelledby="result-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">処理が完了しました</p>
                  <h2 id="result-title">処理結果</h2>
                </div>
                <button className="secondary-button compact-button" type="button" onClick={reset}>
                  別のCSVを処理する
                </button>
              </div>

              <div className="summary-grid">
                <SummaryValue value={String(result.orders)} label="注文数" />
                <SummaryValue value={String(result.units)} label="販売点数" />
                <SummaryValue value={formatCurrency(result.sales)} label="売上" />
              </div>

              <p className="change-note">
                キャンセル注文を{result.cancelledRows}行除外し、customer_note 列を削除しました。
              </p>

              <h3>商品別集計</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>商品</th>
                      <th>販売点数</th>
                      <th>売上</th>
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
                処理済みCSVをダウンロード
              </button>
            </section>
          )}
        </div>
      </main>

      <footer className="privacy-footer">
        <strong>データはブラウザ内で処理されます。</strong>
        <span>CSVファイルは外部サーバーに送信されません。</span>
        <span>ログイン、データベース、外部APIは使用していません。</span>
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

function toDisplayError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught);

  if (message === "The selected CSV file is empty.") return "選択したCSVファイルが空です。";
  if (message === "The CSV contains no data rows.") return "CSVにデータ行がありません。";
  if (message === "No valid orders remain after removing cancelled rows.") {
    return "キャンセル注文を除外した結果、有効な注文が残りませんでした。";
  }

  const missingColumn = message.match(/^Required column "(.+)" was not found\.$/);
  if (missingColumn) return `必須列 "${missingColumn[1]}" が見つかりません。`;

  const emptyValue = message.match(/^Row (\d+) contains an empty "(.+)" value\.$/);
  if (emptyValue) return `${emptyValue[1]}行目の "${emptyValue[2]}" が空欄です。`;

  const invalidQuantity = message.match(/^Row (\d+) contains an invalid quantity\.$/);
  if (invalidQuantity) return `${invalidQuantity[1]}行目の quantity が数値として正しくありません。`;

  const invalidUnitPrice = message.match(/^Row (\d+) contains an invalid unit_price\.$/);
  if (invalidUnitPrice) return `${invalidUnitPrice[1]}行目の unit_price が数値として正しくありません。`;

  const invalidDate = message.match(/^Row (\d+) contains an invalid purchased_at date\.$/);
  if (invalidDate) return `${invalidDate[1]}行目の purchased_at の日付形式が正しくありません。`;

  const parseError = message.match(/^CSV could not be parsed near row (.+): (.+)$/);
  if (parseError) {
    return `CSVを解析できませんでした。${parseError[1]}行目付近を確認してください。${parseError[2]}`;
  }

  return "CSVを処理できませんでした。内容を確認してください。";
}
