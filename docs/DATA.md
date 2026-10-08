# Data, charts and data grids

Charts, data grids and the AI analyst read **JSON**. Out of the box they use
the sample files in [`src/data/`](../src/data/); point them at your own API
with one attribute, one setting, or one function call.

| File | Shape | Used by |
| --- | --- | --- |
| `sales.json` | Object with `monthly`, `daily`, `channels`, `regions`, `categories`, `devices`, `segments` arrays | Dashboard charts, analyst |
| `orders.json` | Array of orders: `id, customer, email, date, status, items, products, total, channel, country` | Order grids, support and analyst assistants |
| `customers.json` | Array of customers: `id, name, email, segment, orders, spent, country, joined, lastOrder` | Customer grid, analyst |
| `products.json` | Array of products: `id, name, category, price, compareAt, rating, reviews, image, badge, stock` | Reference data for the shop |

## Choosing a data source

`data-source` on a chart or grid accepts:

| Value | Loads |
| --- | --- |
| `sales` | `<base>sales.json`, where `<base>` comes from `<meta name="vr-data-base" content="../../data/">` |
| `../../data/sales.json` | that URL |
| `https://api.example.com/v1/sales` | that URL (allow the host in your CSP `connect-src`) |
| `#sales-data` | inline JSON in `<script type="application/json" id="sales-data">` |

`data-path="monthly"` picks a nested array (dotted paths such as
`report.items` work too). Responses are cached per URL.

**Switch every named source at once:** Dashboard → Settings → Data sources
lets you enter a base URL (for example `https://api.example.com/v1/`), test
the connection and save it for this browser. In code:

```js
import { setDataBase } from './assets/js/core/data.js';
setDataBase('https://api.example.com/v1/'); // every chart and grid reloads
setDataBase('');                            // back to the page default
```

Your endpoints must return the same shapes as the sample files, send
`Content-Type: application/json`, and allow your origin (CORS) when they
live on another host.

## Charts

SVG charts drawn by [`components/chart.js`](../src/assets/js/components/chart.js):
`line`, `area`, `bar` (grouped, or `data-stacked`), `hbar`, `donut` and
`sparkline`.

```html
<figure class="chart" data-viz="area" data-source="sales" data-path="monthly"
        data-x="month" data-x-format="short-month"
        data-series="revenue:Revenue,target:Target" data-format="currency-compact">
  <figcaption class="chart__caption">
    <span class="chart__title">Revenue vs target</span>
    <span class="chart__subtitle">Last 12 months</span>
  </figcaption>
  <p class="chart__fallback">Revenue reached $48,290 in October 2026.</p>
</figure>
```

| Attribute | Meaning |
| --- | --- |
| `data-viz` | Chart type |
| `data-x` | Key for the category or x value (default `label`) |
| `data-x-format` | `text`, `month`, `short-month`, `date`, `date-short`, … |
| `data-series` | `key:Label[:colour]`, comma-separated; colour 1–6 picks `--chart-N` |
| `data-format` | `number`, `integer`, `compact`, `currency`, `currency-compact`, `percent` |
| `data-height` | Plot height in pixels (default 260) |
| `data-limit` | Show only the last N rows (the analytics range picker uses this) |
| `data-stacked` | Stack bar series |
| `data-currency` | ISO currency code (default USD) |

What you get automatically:

- **Responsive SVG** that redraws when its container resizes.
- **Tooltips** on hover, and **keyboard exploration**: focus the chart and
  use the arrow keys, Home and End; each point is announced.
- **Legend buttons** to show and hide series (`aria-pressed`).
- **A text summary** (highest, lowest, latest, change) for screen readers.
- **A data table** in a "Show data table" disclosure.
- **Theme-aware colours** from `--chart-1` … `--chart-6`, verified at 3:1
  against card backgrounds in light and dark mode.
- **No-JS fallback**: the `.chart__fallback` paragraph is shown until the
  chart renders.

Render from data you already have:

```js
import { renderChart, refresh } from './assets/js/components/chart.js';

renderChart(document.querySelector('#revenue-chart'), rows); // your rows
figure.dataset.limit = '6';
refresh(figure);                                             // reload data-source
```

## Data grids

[`components/data-grid.js`](../src/assets/js/components/data-grid.js) turns
a table into a searchable, filterable, sortable, paginated grid:

```html
<div class="data-grid" data-grid data-source="orders" data-page-size="10" data-label="orders">
  <form class="data-grid__toolbar" action="orders.html" method="get">
    <input class="input" type="search" name="q" data-grid-search aria-label="Search orders">
    <select class="select" name="status" data-grid-filter="status" aria-label="Status">…</select>
    <button type="button" class="btn btn--secondary" data-grid-export hidden>Export CSV</button>
  </form>
  <div class="table-wrapper" role="region" aria-labelledby="orders-caption" tabindex="0">
    <table class="table">
      <caption id="orders-caption">Orders</caption>
      <thead><tr>
        <th scope="col" data-key="id" data-sort="text">Order</th>
        <th scope="col" data-key="customer" data-sort="text" data-render="person">Customer</th>
        <th scope="col" data-key="status" data-render="badge">Status</th>
        <th scope="col" data-key="total" data-sort="number" data-format="currency" class="num">Total</th>
        <th scope="col" data-render="action" data-action="view" data-action-label="View"><span class="visually-hidden">Actions</span></th>
      </tr></thead>
      <tbody><!-- server-rendered first page for no-JS --></tbody>
    </table>
  </div>
  <p data-grid-status></p>
  <nav class="pagination" aria-label="Order pages" data-grid-pagination></nav>
</div>
```

- Column options: `data-key`, `data-format`, `data-sort` (`text`, `number`,
  `date`), `data-render` (`badge`, `person`, `action`).
- Row actions dispatch a `grid:action` event with `{ action, row }`; the
  dashboard uses it to open the order details dialog.
- Search reads `?q=` from the URL, so the top-bar search works across
  pages. Without JavaScript the toolbar submits as a normal GET form.
- CSV export escapes formulas (`=`, `+`, `-`, `@`) to prevent spreadsheet
  injection.
- Dispatch `grid:refresh` on the grid to reload its data.

## Inline data and server rendering

For pages rendered by a server, embed the data instead of fetching it:

```html
<script type="application/json" id="sales-data">{"monthly": […]}</script>
<figure class="chart" data-viz="line" data-source="#sales-data" data-path="monthly" …>
```

JSON data blocks are not executed, so they are allowed under the strict
CSP. Escape `</` in your serializer (for example with Razor's
`Json.Serialize` or Django's `json_script`).

## AI analyst

The dashboard's [AI assistant](../src/templates/dashboard/assistant.html)
answers questions from the same JSON and draws charts in its replies. To
connect a real model, see [AI-CHAT.md](AI-CHAT.md); the `chart` stream
event takes the same options as `data-viz` charts.
