# CSV Workflow Tool

Concept Project by Ayato Inami

## Overview

CSV Workflow Tool is a browser-only demo for turning a repeated CSV cleanup and summary task into a one-click workflow.

It demonstrates how a small custom tool can automate:

- removing unnecessary data
- normalizing date formats
- removing unused columns
- calculating sales
- summarizing results
- downloading a processed CSV

## Demo

Use **Try with sample data** to load fictional event sales data, or select a local `.csv` file that matches the expected columns.

No account, backend, database, cloud storage, API, or AI service is used.

## Features

- CSV selection with file picker
- Drag and drop CSV selection
- File validation for `.csv` and 5 MB demo limit
- Required column validation with specific error messages
- Preview of the first 5 rows before processing
- One-click CSV processing
- Result summary for orders, units, and sales
- Product summary table
- Processed CSV download as `event_sales_processed.csv`
- Reset flow with **Process another file**
- Sample event sales data
- Responsive desktop, tablet, and smartphone layout

## Processing Rules

The demo expects these columns:

- `order_id`
- `product_name`
- `quantity`
- `unit_price`
- `purchased_at`
- `payment_method`
- `status`
- `customer_note`

When processing, the tool:

- removes rows where `status = Cancelled`
- removes the `customer_note` column
- normalizes dates from formats like `2026/09/21 10:32` to `2026-09-21 10:32`
- adds `total = quantity × unit_price`
- summarizes orders, units sold, total sales, and product-level totals

The exported CSV contains:

- `order_id`
- `product_name`
- `quantity`
- `unit_price`
- `purchased_at`
- `payment_method`
- `status`
- `total`

## Privacy

Your data stays private.

CSV processing happens entirely in your browser. Your file is not uploaded to a server.

Implementation notes:

- files are read with the browser File API
- parsing and processing run in client-side JavaScript
- downloads are generated with `Blob` and object URLs
- there is no backend endpoint in this project
- there are no API keys or secrets
- no analytics or telemetry package is included

## Development

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Build for static hosting:

```bash
npm run build
```

## Testing

Run the test suite:

```bash
npm test
```

The tests cover:

- sample CSV
- Japanese product names
- one-row CSV
- roughly 5,000 rows
- missing required columns
- empty CSV
- invalid quantity
- invalid date
- cancelled-only CSV
- quoted comma fields
- quoted newline fields
- UTF-8 BOM
- output columns and totals

## Limitations

This is an MVP concept demo. It intentionally does not include:

- Excel editing
- PDF
- OCR
- AI
- CSV column mapping UI
- custom rule configuration
- accounts
- saved history
- cloud storage
- database
- external API
- automatic scheduled runs
- Google Drive or Google Sheets integration
- complex charts
- billing
- language switching

## About

CSV Workflow Tool is a concept project by Ayato Inami.

It is not presented as a fictional client project. It exists to demonstrate how repeated CSV work can be turned into a small, reusable browser-based tool.
