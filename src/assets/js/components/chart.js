/**
 * Accessible, dependency-free SVG charts: line, area, bar (grouped or
 * stacked), horizontal bar, donut and sparkline.
 *
 * Markup:
 *   <figure class="chart" data-viz="line" data-source="sales" data-path="monthly"
 *           data-x="month" data-x-format="short-month"
 *           data-series="revenue:Revenue,orders:Orders" data-format="currency-compact">
 *     <figcaption class="chart__caption">
 *       <span class="chart__title">Revenue</span>
 *       <span class="chart__subtitle">Last 12 months</span>
 *     </figcaption>
 *     <p class="chart__fallback">Optional server-rendered summary or table for no-JS.</p>
 *   </figure>
 *
 * Attributes:
 *   data-viz       line | area | bar | hbar | donut | sparkline
 *   data-source    data name, URL or #inline-json (see core/data.js)
 *   data-path      dotted path to the array inside the JSON
 *   data-x         key for the category / x value         (default "label")
 *   data-x-format  format for x labels (see core/format.js) (default "text")
 *   data-series    "key:Label[:colour 1-6]" comma-separated (default "value:Value")
 *   data-format    value format (number, currency, currency-compact, percent, …)
 *   data-height    plot height in px (default 260; sparkline 48)
 *   data-limit     show only the last N rows
 *   data-stacked   stack bar series
 *   data-currency  ISO currency code (default USD)
 *
 * Accessibility: the SVG is decorative (aria-hidden). Instead each chart
 * gets (1) an auto-generated text summary, (2) a keyboard-explorable region
 * (arrow keys, Home/End) that announces each data point through a live
 * region, (3) toggle buttons for series with aria-pressed, and (4) a full
 * data table in a <details> element. Line series are also distinguished by
 * dash pattern, not colour alone.
 *
 * Programmatic use:
 *   import { renderChart } from './components/chart.js';
 *   renderChart(figureElement, rows);
 *
 * @module components/chart
 */
import { qs, qsa, on, claim, createElement, uniqueId } from '../core/dom.js';
import { loadData } from '../core/data.js';
import { formatValue, percentChange } from '../core/format.js';

const NS = 'http://www.w3.org/2000/svg';
const states = new WeakMap();
let listening = false;

/* ---- Helpers ----------------------------------------------------------- */
function svg(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  return el;
}

function parseSeries(spec) {
  return spec.split(',').map((part, i) => {
    const [key, label, colour] = part.split(':').map((s) => s.trim());
    const n = Number(colour);
    return { key, label: label || key, colour: n >= 1 && n <= 6 ? n : (i % 6) + 1, index: i };
  });
}

function readConfig(figure) {
  const d = figure.dataset;
  const type = d.viz || 'line';
  return {
    type,
    source: d.source || '',
    path: d.path || '',
    x: d.x || 'label',
    xFormat: d.xFormat || 'text',
    series: parseSeries(d.series || 'value:Value'),
    format: d.format || 'number',
    height: Number(d.height) || (type === 'sparkline' ? 48 : 260),
    limit: Number(d.limit) || 0,
    stacked: d.stacked !== undefined,
    currency: d.currency || 'USD',
    title: (qs('.chart__title', figure) || qs('figcaption', figure) || { textContent: 'Chart' }).textContent.trim(),
  };
}

function niceScale(min, max, ticks = 4) {
  if (max === min) max = min + 1;
  const rough = (max - min) / ticks;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const n = rough / pow;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
  return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step };
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ---- Setup ------------------------------------------------------------- */
function setup(figure) {
  const cfg = readConfig(figure);
  const interactive = cfg.type !== 'sparkline';
  figure.classList.add('chart', 'chart--enhanced', `chart--${cfg.type}`);

  const canvas = qs('[data-chart-canvas]', figure) || createElement('div', { attrs: { 'data-chart-canvas': '' } });
  canvas.classList.add('chart__canvas');
  if (!canvas.isConnected) {
    const caption = qs('figcaption', figure);
    if (caption) caption.after(canvas);
    else figure.prepend(canvas);
  }

  const state = { cfg, canvas, rows: [], hidden: new Set(), index: -1, geo: null, drawnWidth: 0, animated: false };
  states.set(figure, state);

  if (!interactive) {
    canvas.setAttribute('aria-hidden', 'true');
    return state;
  }

  state.summary = createElement('p', { className: 'visually-hidden', attrs: { id: uniqueId('chart-summary') } });
  state.hint = createElement('p', {
    className: 'visually-hidden',
    attrs: { id: uniqueId('chart-hint') },
    text: 'Use the arrow keys to move between data points. A data table follows the chart.',
  });
  state.live = createElement('p', { className: 'visually-hidden', attrs: { 'aria-live': 'polite', 'aria-atomic': 'true' } });
  state.tooltip = createElement('div', { className: 'chart__tooltip', attrs: { 'aria-hidden': 'true' } });
  state.tooltip.hidden = true;

  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'group');
  canvas.setAttribute('aria-label', `${cfg.title}, interactive chart`);
  canvas.setAttribute('aria-describedby', `${state.summary.id} ${state.hint.id}`);
  canvas.after(state.summary, state.hint, state.live);

  state.legend = createElement('div', { className: 'chart__legend' });
  canvas.before(state.legend);

  state.table = qs('details[data-chart-table]', figure) || createElement('details', { className: 'chart__table', attrs: { 'data-chart-table': '' } });
  if (!state.table.isConnected) figure.append(state.table);

  on(canvas, 'pointermove', (event) => {
    const i = indexAt(state, event);
    if (i !== -1) setActive(figure, i, { announce: false });
  });
  on(canvas, 'pointerleave', () => {
    if (document.activeElement !== canvas) clearActive(state);
  });
  on(canvas, 'focus', () => {
    if (state.rows.length) setActive(figure, state.index >= 0 ? state.index : 0, { announce: true });
  });
  on(canvas, 'blur', () => clearActive(state));
  on(canvas, 'keydown', (event) => {
    const n = state.rows.length;
    if (!n) return;
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = Math.min(n - 1, state.index + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(0, state.index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = n - 1;
    else if (event.key === 'Escape') {
      clearActive(state);
      return;
    }
    if (next !== null) {
      event.preventDefault();
      setActive(figure, next, { announce: true });
    }
  });

  return state;
}

/* ---- Text alternatives ------------------------------------------------- */
function fmt(state, value) {
  return formatValue(value, state.cfg.format, { currency: state.cfg.currency });
}

function xLabel(state, row) {
  return formatValue(row[state.cfg.x], state.cfg.xFormat);
}

function visibleSeries(state) {
  return state.cfg.series.filter((s) => !state.hidden.has(s.key));
}

function describe(state, i) {
  const row = state.rows[i];
  const { cfg } = state;
  if (cfg.type === 'donut') {
    const key = cfg.series[0].key;
    const total = state.rows.reduce((sum, r) => sum + num(r[key]), 0);
    const share = total ? Math.round((num(row[key]) / total) * 1000) / 10 : 0;
    return `${xLabel(state, row)}: ${fmt(state, row[key])}, ${share}% of total. ${i + 1} of ${state.rows.length}.`;
  }
  const values = visibleSeries(state).map((s) => `${s.label} ${fmt(state, row[s.key])}`).join(', ');
  return `${xLabel(state, row)}: ${values}. ${i + 1} of ${state.rows.length}.`;
}

function summarize(state) {
  const { cfg, rows } = state;
  if (!rows.length) return `${cfg.title}: no data.`;
  const s = visibleSeries(state)[0] || cfg.series[0];
  const values = rows.map((r) => num(r[s.key]));

  if (cfg.type === 'donut' || cfg.type === 'hbar') {
    const total = values.reduce((a, b) => a + b, 0);
    const maxI = values.indexOf(Math.max(...values));
    const share = total ? Math.round((values[maxI] / total) * 100) : 0;
    return `${cfg.title}. ${rows.length} categories totalling ${fmt(state, total)}. Largest: ${xLabel(state, rows[maxI])} with ${fmt(state, values[maxI])} (${share}%).`;
  }

  const maxI = values.indexOf(Math.max(...values));
  const minI = values.indexOf(Math.min(...values));
  const last = values.length - 1;
  let text = `${cfg.title}, ${s.label} from ${xLabel(state, rows[0])} to ${xLabel(state, rows[last])}. Highest ${xLabel(state, rows[maxI])} (${fmt(state, values[maxI])}), lowest ${xLabel(state, rows[minI])} (${fmt(state, values[minI])}).`;
  if (last > 0) {
    const change = percentChange(values[last], values[last - 1]);
    text += ` Latest ${fmt(state, values[last])}, ${change >= 0 ? 'up' : 'down'} ${Math.abs(change)}% on the previous period.`;
  }
  return text;
}

function buildTable(state) {
  const { cfg, rows, table } = state;
  const head = createElement('tr', {
    children: [
      createElement('th', { text: cfg.type === 'donut' || cfg.type === 'hbar' ? 'Category' : 'Period', attrs: { scope: 'col' } }),
      ...cfg.series.map((s) => createElement('th', { className: 'num', text: s.label, attrs: { scope: 'col' } })),
    ],
  });
  const body = rows.map((row) =>
    createElement('tr', {
      children: [
        createElement('th', { text: xLabel(state, row), attrs: { scope: 'row' } }),
        ...cfg.series.map((s) => createElement('td', { className: 'num', text: fmt(state, row[s.key]) })),
      ],
    })
  );
  const tableEl = createElement('table', {
    className: 'table',
    children: [
      createElement('caption', { className: 'visually-hidden', text: cfg.title }),
      createElement('thead', { children: [head] }),
      createElement('tbody', { children: body }),
    ],
  });
  const wrapper = createElement('div', {
    className: 'table-wrapper',
    attrs: { role: 'region', tabindex: '0', 'aria-label': `${cfg.title} data` },
    children: [tableEl],
  });
  table.replaceChildren(createElement('summary', { text: 'Show data table' }), wrapper);
}

function buildLegend(figure, state) {
  const { cfg, legend } = state;
  if (!legend) return;
  legend.replaceChildren();

  if (cfg.type === 'donut') {
    const key = cfg.series[0].key;
    const total = state.rows.reduce((sum, r) => sum + num(r[key]), 0);
    const list = createElement('ul', { className: 'chart__legend-list', attrs: { role: 'list' } });
    state.rows.forEach((row, i) => {
      const share = total ? Math.round((num(row[key]) / total) * 100) : 0;
      list.append(
        createElement('li', {
          className: 'chart__legend-entry',
          children: [
            createElement('span', { className: `chart__swatch chart__series--${(i % 6) + 1}`, attrs: { 'aria-hidden': 'true' } }),
            createElement('span', { className: 'chart__legend-label', text: xLabel(state, row) }),
            createElement('span', { className: 'chart__legend-value', text: `${fmt(state, row[key])} · ${share}%` }),
          ],
        })
      );
    });
    legend.append(list);
    return;
  }

  if (cfg.series.length < 2) return;
  for (const s of cfg.series) {
    const button = createElement('button', {
      className: 'chart__legend-item',
      attrs: { type: 'button', 'aria-pressed': String(!state.hidden.has(s.key)) },
      children: [
        createElement('span', { className: `chart__swatch chart__series--${s.colour}${s.index > 0 && cfg.type !== 'bar' ? ' chart__swatch--dashed' : ''}`, attrs: { 'aria-hidden': 'true' } }),
        createElement('span', { text: s.label }),
      ],
    });
    on(button, 'click', () => {
      const showing = !state.hidden.has(s.key);
      if (showing && visibleSeries(state).length === 1) return; // keep one series visible
      if (showing) state.hidden.add(s.key);
      else state.hidden.delete(s.key);
      button.setAttribute('aria-pressed', String(!showing));
      state.summary.textContent = summarize(state);
      draw(figure, state);
    });
    legend.append(button);
  }
}

/* ---- Drawing ----------------------------------------------------------- */
function draw(figure, state) {
  const { cfg, canvas, rows } = state;
  const width = Math.max(Math.round(canvas.clientWidth), cfg.type === 'sparkline' ? 80 : 240);
  state.drawnWidth = width;

  if (!rows.length) {
    canvas.replaceChildren(createElement('p', { className: 'chart__empty', text: 'No data to display.' }));
    return;
  }

  let height = cfg.height;
  if (cfg.type === 'hbar') height = rows.length * 40 + 12;
  if (cfg.type === 'donut') height = Math.min(cfg.height, 240);

  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height, class: 'chart__svg', 'aria-hidden': 'true' });
  if (!state.animated) root.classList.add('chart__svg--animate');
  state.animated = true;

  if (cfg.type === 'bar') drawBars(state, root, width, height);
  else if (cfg.type === 'hbar') drawHBars(state, root, width, height);
  else if (cfg.type === 'donut') drawDonut(state, root, width, height);
  else if (cfg.type === 'sparkline') drawSparkline(state, root, width, height);
  else drawXY(state, root, width, height, cfg.type === 'area');

  const children = [root];
  if (state.tooltip) children.push(state.tooltip);
  canvas.replaceChildren(...children);
  if (state.index >= 0 && state.tooltip && !state.tooltip.hidden) setActive(figure, state.index, { announce: false });
}

function valueRange(state, series) {
  let min = 0;
  let max = 0;
  state.rows.forEach((row) => {
    if (state.cfg.stacked && state.cfg.type === 'bar') {
      const total = series.reduce((sum, s) => sum + num(row[s.key]), 0);
      max = Math.max(max, total);
    } else {
      for (const s of series) {
        max = Math.max(max, num(row[s.key]));
        min = Math.min(min, num(row[s.key]));
      }
    }
  });
  return niceScale(min, max);
}

function drawAxes(state, root, scale, pad, width, height, xPositions) {
  const plotH = height - pad.top - pad.bottom;
  const y = (v) => pad.top + plotH * (1 - (v - scale.min) / (scale.max - scale.min));
  const axis = svg('g', { class: 'chart__axes' });
  for (let t = scale.min; t <= scale.max + scale.step / 2; t += scale.step) {
    const yy = Math.round(y(t)) + 0.5;
    axis.append(svg('line', { x1: pad.left, x2: width - pad.right, y1: yy, y2: yy, class: 'chart__grid' }));
    const label = svg('text', { x: pad.left - 8, y: yy, class: 'chart__axis-label', 'text-anchor': 'end', 'dominant-baseline': 'middle' });
    label.textContent = formatValue(t, state.cfg.format.replace('currency', 'currency-compact').replace('compact-compact', 'compact'), { currency: state.cfg.currency });
    axis.append(label);
  }
  const minGap = state.cfg.type === 'bar' ? 44 : 64;
  const maxLabels = Math.max(2, Math.floor((width - pad.left - pad.right) / minGap));
  const every = Math.ceil(xPositions.length / maxLabels);
  xPositions.forEach((x, i) => {
    if (i % every !== 0 && i !== xPositions.length - 1) return;
    if (i === xPositions.length - 1 && i % every !== 0 && xPositions.length > 1 && x - xPositions[i - (i % every)] < 48) return;
    const label = svg('text', { x, y: height - 8, class: 'chart__axis-label', 'text-anchor': 'middle' });
    // Truncate long category labels to the space available; the tooltip,
    // summary and data table always carry the full text.
    const full = xLabel(state, state.rows[i]);
    const room = Math.max(3, Math.floor(((width - pad.left - pad.right) / xPositions.length) * every / 6.8));
    label.textContent = full.length > room ? `${full.slice(0, room - 1).trimEnd()}…` : full;
    axis.append(label);
  });
  root.append(axis);
  return y;
}

function leftPad(state, scale) {
  const sample = formatValue(scale.max, state.cfg.format.replace('currency', 'currency-compact').replace('compact-compact', 'compact'), { currency: state.cfg.currency });
  return Math.max(36, sample.length * 7.5 + 14);
}

function drawXY(state, root, width, height, area) {
  const series = visibleSeries(state);
  const scale = valueRange(state, series);
  const pad = { top: 14, right: 16, bottom: 30, left: leftPad(state, scale) };
  const n = state.rows.length;
  const plotW = width - pad.left - pad.right;
  const xs = state.rows.map((_, i) => (n === 1 ? pad.left + plotW / 2 : pad.left + (plotW * i) / (n - 1)));
  const y = drawAxes(state, root, scale, pad, width, height, xs);

  const guide = svg('line', { x1: 0, x2: 0, y1: pad.top, y2: height - pad.bottom, class: 'chart__guide' });
  root.append(guide);

  const pointGroups = [];
  for (const s of series) {
    const pts = state.rows.map((row, i) => [xs[i], y(num(row[s.key]))]);
    const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
    const g = svg('g', { class: `chart__series chart__series--${s.colour}` });
    if (area && s === series[0]) {
      const base = y(Math.max(scale.min, 0));
      g.append(svg('path', { d: `${d} L${xs[n - 1].toFixed(1)},${base} L${xs[0].toFixed(1)},${base} Z`, class: 'chart__area' }));
    }
    // pathLength normalises the draw-in animation; dashed lines skip it so
    // their dash pattern stays in pixels.
    g.append(svg('path', s.index > 0 ? { d, class: 'chart__line chart__line--dashed' } : { d, class: 'chart__line', pathLength: 1 }));
    const points = pts.map(([px, py]) => svg('circle', { cx: px, cy: py, r: n > 40 ? 2 : 3.5, class: 'chart__point' }));
    g.append(...points);
    pointGroups.push(points);
    root.append(g);
  }
  state.geo = { kind: 'x', xs, pad, guide, pointGroups, width, height, tooltipY: () => pad.top };
}

function drawBars(state, root, width, height) {
  const series = visibleSeries(state);
  const scale = valueRange(state, series);
  const pad = { top: 14, right: 12, bottom: 30, left: leftPad(state, scale) };
  const n = state.rows.length;
  const band = (width - pad.left - pad.right) / n;
  const inner = band * 0.72;
  const centers = state.rows.map((_, i) => pad.left + band * i + band / 2);
  const y = drawAxes(state, root, scale, pad, width, height, centers);
  const zero = y(Math.max(0, scale.min));

  const bands = state.rows.map((_, i) =>
    svg('rect', { x: pad.left + band * i, y: pad.top, width: band, height: height - pad.top - pad.bottom, class: 'chart__band' })
  );
  root.append(...bands);

  const barGroups = state.rows.map(() => []);
  series.forEach((s, si) => {
    const g = svg('g', { class: `chart__series chart__series--${s.colour}` });
    state.rows.forEach((row, i) => {
      const value = num(row[s.key]);
      let x;
      let w;
      let top;
      let bottom;
      if (state.cfg.stacked) {
        const below = series.slice(0, si).reduce((sum, p) => sum + num(row[p.key]), 0);
        x = centers[i] - inner / 2;
        w = inner;
        top = y(below + value);
        bottom = y(below);
      } else {
        w = inner / series.length;
        x = centers[i] - inner / 2 + w * si;
        top = Math.min(y(value), zero);
        bottom = Math.max(y(value), zero);
      }
      const rect = svg('rect', { x: x + 1, y: top, width: Math.max(1, w - 2), height: Math.max(0, bottom - top), rx: 3, class: 'chart__bar' });
      g.append(rect);
      barGroups[i].push(rect);
    });
    root.append(g);
  });
  state.geo = { kind: 'band', band, pad, centers, bands, barGroups, width, height };
}

function drawHBars(state, root, width, height) {
  const s = visibleSeries(state)[0];
  const values = state.rows.map((r) => num(r[s.key]));
  const max = Math.max(...values, 0) || 1;
  const labelW = Math.min(width * 0.38, Math.max(...state.rows.map((r) => xLabel(state, r).length)) * 7.5 + 12);
  const valueW = 64;
  const rowH = 40;
  const barArea = width - labelW - valueW;
  const g = svg('g', { class: `chart__series chart__series--${s.colour}` });
  const bars = [];
  const bands = [];
  state.rows.forEach((row, i) => {
    const yTop = 6 + i * rowH;
    bands.push(svg('rect', { x: 0, y: yTop, width, height: rowH, class: 'chart__band' }));
    const label = svg('text', { x: 0, y: yTop + rowH / 2, class: 'chart__axis-label chart__axis-label--strong', 'dominant-baseline': 'middle' });
    label.textContent = xLabel(state, row);
    const w = Math.max(2, (values[i] / max) * barArea);
    const bar = svg('rect', { x: labelW, y: yTop + 10, width: w, height: rowH - 20, rx: 4, class: 'chart__bar' });
    const value = svg('text', { x: labelW + w + 8, y: yTop + rowH / 2, class: 'chart__axis-label', 'dominant-baseline': 'middle' });
    value.textContent = fmt(state, values[i]);
    g.append(label, bar, value);
    bars.push([bar]);
  });
  root.append(...bands, g);
  state.geo = { kind: 'row', rowH, bands, barGroups: bars, width, height, labelW };
}

function drawDonut(state, root, width, height) {
  const key = state.cfg.series[0].key;
  const values = state.rows.map((r) => Math.max(0, num(r[key])));
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const r = Math.min(width, height) / 2 - 6;
  const cx = width / 2;
  const cy = height / 2;
  const thickness = Math.max(18, r * 0.32);
  let angle = -Math.PI / 2;
  const slices = [];

  values.forEach((v, i) => {
    const sweep = (v / total) * Math.PI * 2;
    const a0 = angle;
    const a1 = angle + Math.max(sweep - 0.012, 0.001);
    angle += sweep;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const ro = r;
    const ri = r - thickness;
    const p = (rad, a) => `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
    const d = `M${p(ro, a0)} A${ro},${ro} 0 ${large} 1 ${p(ro, a1)} L${p(ri, a1)} A${ri},${ri} 0 ${large} 0 ${p(ri, a0)} Z`;
    const slice = svg('path', { d, class: `chart__slice chart__series--${(i % 6) + 1}` });
    slices.push({ el: slice, a0, a1: a0 + sweep });
    root.append(slice);
  });

  const totalLabel = svg('text', { x: cx, y: cy - 6, class: 'chart__donut-value', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
  totalLabel.textContent = fmt(state, total);
  const caption = svg('text', { x: cx, y: cy + 16, class: 'chart__axis-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
  caption.textContent = 'Total';
  root.append(totalLabel, caption);
  state.geo = { kind: 'donut', slices, cx, cy, r, thickness, totalLabel, caption, total, width, height };
}

function drawSparkline(state, root, width, height) {
  const s = state.cfg.series[0];
  const values = state.rows.map((r) => num(r[s.key]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 4;
  const n = values.length;
  const x = (i) => pad + ((width - pad * 2) * i) / Math.max(1, n - 1);
  const y = (v) => pad + (height - pad * 2) * (1 - (v - min) / (max - min || 1));
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const g = svg('g', { class: `chart__series chart__series--${s.colour}` });
  g.append(
    svg('path', { d: `${d} L${x(n - 1)},${height} L${x(0)},${height} Z`, class: 'chart__area' }),
    svg('path', { d, class: 'chart__line', pathLength: 1 }),
    svg('circle', { cx: x(n - 1), cy: y(values[n - 1]), r: 3, class: 'chart__point chart__point--end' })
  );
  root.append(g);
}

/* ---- Interaction ------------------------------------------------------- */
function indexAt(state, event) {
  const geo = state.geo;
  if (!geo) return -1;
  const rect = state.canvas.getBoundingClientRect();
  const scale = geo.width / rect.width;
  const px = (event.clientX - rect.left) * scale;
  const py = (event.clientY - rect.top) * scale;
  const n = state.rows.length;

  if (geo.kind === 'x') {
    let best = 0;
    geo.xs.forEach((x, i) => {
      if (Math.abs(x - px) < Math.abs(geo.xs[best] - px)) best = i;
    });
    return best;
  }
  if (geo.kind === 'band') {
    const i = Math.floor((px - geo.pad.left) / geo.band);
    return i >= 0 && i < n ? i : -1;
  }
  if (geo.kind === 'row') {
    const i = Math.floor((py - 6) / geo.rowH);
    return i >= 0 && i < n ? i : -1;
  }
  if (geo.kind === 'donut') {
    const dx = px - geo.cx;
    const dy = py - geo.cy;
    const dist = Math.hypot(dx, dy);
    if (dist > geo.r || dist < geo.r - geo.thickness) return -1;
    let a = Math.atan2(dy, dx);
    if (a < -Math.PI / 2) a += Math.PI * 2;
    return geo.slices.findIndex((s) => a >= s.a0 && a < s.a1);
  }
  return -1;
}

function clearActive(state) {
  if (state.tooltip) state.tooltip.hidden = true;
  const svgEl = qs('svg', state.canvas);
  if (svgEl) svgEl.classList.remove('has-active');
  for (const el of qsa('.is-active', state.canvas)) el.classList.remove('is-active');
  if (state.geo && state.geo.guide) state.geo.guide.classList.remove('is-visible');
  if (state.geo && state.geo.kind === 'donut') {
    state.geo.totalLabel.textContent = fmt(state, state.geo.total);
    state.geo.caption.textContent = 'Total';
  }
}

function setActive(figure, i, { announce }) {
  const state = states.get(figure);
  const { geo, tooltip, cfg } = state;
  if (!geo || !tooltip) return;
  clearActive(state);
  state.index = i;
  const svgEl = qs('svg', state.canvas);
  svgEl.classList.add('has-active');
  const row = state.rows[i];

  let anchorX = 0;
  let anchorY = 0;
  if (geo.kind === 'x') {
    anchorX = geo.xs[i];
    geo.guide.setAttribute('x1', anchorX);
    geo.guide.setAttribute('x2', anchorX);
    geo.guide.classList.add('is-visible');
    geo.pointGroups.forEach((points) => points[i].classList.add('is-active'));
    anchorY = Math.min(...geo.pointGroups.map((points) => Number(points[i].getAttribute('cy'))));
  } else if (geo.kind === 'band' || geo.kind === 'row') {
    geo.bands[i].classList.add('is-active');
    geo.barGroups[i].forEach((bar) => bar.classList.add('is-active'));
    anchorX = geo.kind === 'band' ? geo.centers[i] : Math.min(geo.width - 80, geo.labelW + Number(geo.barGroups[i][0].getAttribute('width')) / 2);
    anchorY = Math.min(...geo.barGroups[i].map((bar) => Number(bar.getAttribute('y'))));
  } else if (geo.kind === 'donut') {
    geo.slices[i].el.classList.add('is-active');
    geo.totalLabel.textContent = fmt(state, row[cfg.series[0].key]);
    geo.caption.textContent = xLabel(state, row);
    anchorX = geo.cx;
    anchorY = geo.cy - geo.r;
  }

  // Tooltip: plain text built with textContent.
  const lines = [createElement('p', { className: 'chart__tooltip-title', text: xLabel(state, row) })];
  if (geo.kind === 'donut') {
    lines.push(createElement('p', { text: describe(state, i).split(': ')[1].replace(/ \d+ of \d+\.$/, '') }));
  } else {
    for (const s of visibleSeries(state)) {
      lines.push(
        createElement('p', {
          className: 'chart__tooltip-row',
          children: [
            createElement('span', { className: `chart__swatch chart__series--${s.colour}` }),
            createElement('span', { text: `${s.label}: ` }),
            createElement('strong', { text: fmt(state, row[s.key]) }),
          ],
        })
      );
    }
  }
  tooltip.replaceChildren(...lines);
  tooltip.hidden = false;
  const rect = state.canvas.getBoundingClientRect();
  const ratio = rect.width / geo.width;
  const left = Math.min(Math.max(anchorX * ratio, 70), rect.width - 70);
  tooltip.style.setProperty('left', `${left}px`);
  tooltip.style.setProperty('top', `${Math.max(anchorY * ratio, 0)}px`);

  if (announce) state.live.textContent = describe(state, i);
}

/* ---- Public API -------------------------------------------------------- */

/**
 * Render a chart from rows you already have (e.g. from your own API call).
 * @param {HTMLElement} figure - element with data-viz and other attributes
 * @param {Array<object>} rows
 */
export function renderChart(figure, rows) {
  let state = states.get(figure);
  if (!state) {
    claim(figure, 'viz');
    state = setup(figure);
  }
  state.cfg = { ...readConfig(figure) };
  const data = Array.isArray(rows) ? rows : [];
  state.rows = state.cfg.limit ? data.slice(-state.cfg.limit) : data.slice();
  state.index = -1;
  if (state.summary) state.summary.textContent = summarize(state);
  if (state.legend) buildLegend(figure, state);
  if (state.table) buildTable(state);
  draw(figure, state);
  figure.removeAttribute('aria-busy');
}

/**
 * Reload a chart's data-source (after changing data-limit, data-source, …).
 * @param {HTMLElement} figure
 * @param {{ fresh?: boolean }} [options]
 */
export async function refresh(figure, { fresh = false } = {}) {
  const state = states.get(figure) || setup(figure);
  const cfg = readConfig(figure);
  if (!cfg.source) return;
  figure.setAttribute('aria-busy', 'true');
  try {
    const data = await loadData(cfg.source, { path: cfg.path, fresh });
    renderChart(figure, data);
  } catch (error) {
    figure.removeAttribute('aria-busy');
    const retry = createElement('button', { className: 'btn btn--sm btn--secondary', text: 'Try again', attrs: { type: 'button' } });
    on(retry, 'click', () => refresh(figure, { fresh: true }));
    state.canvas.replaceChildren(
      createElement('div', {
        className: 'chart__empty',
        children: [createElement('p', { text: `Couldn't load chart data (${error.message}).` }), retry],
      })
    );
  }
}

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const figure of qsa('[data-viz]', root)) {
    if (!claim(figure, 'viz')) continue;
    const state = setup(figure);
    refresh(figure);

    if ('ResizeObserver' in window) {
      let frame = 0;
      const observer = new ResizeObserver(() => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          if (state.rows.length && Math.abs(state.canvas.clientWidth - state.drawnWidth) > 4) draw(figure, state);
        });
      });
      observer.observe(state.canvas);
    }
  }

  if (listening) return;
  listening = true;
  on(document, 'vr:datachange', () => {
    for (const figure of qsa('[data-viz][data-source]')) refresh(figure, { fresh: true });
  });
}
