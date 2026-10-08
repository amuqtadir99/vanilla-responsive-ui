/**
 * Data grid: renders a table from JSON with search, filters, sorting,
 * pagination, CSV export and row actions.
 *
 * Markup (abridged; see src/components/data-grid.html):
 *   <div class="data-grid" data-grid data-source="orders" data-page-size="8" data-label="orders">
 *     <input type="search" data-grid-search>
 *     <select data-grid-filter="status">…</select>
 *     <table class="table">
 *       <thead><tr>
 *         <th scope="col" data-key="id" data-sort="text">Order</th>
 *         <th scope="col" data-key="total" data-sort="number" data-format="currency" class="num">Total</th>
 *         <th scope="col" data-key="status" data-render="badge">Status</th>
 *         <th scope="col" data-render="action" data-action="view" data-action-label="View">
 *           <span class="visually-hidden">Actions</span></th>
 *       </tr></thead>
 *       <tbody>…server-rendered rows for no-JS…</tbody>
 *     </table>
 *     <p data-grid-status></p>
 *     <nav data-grid-pagination aria-label="Orders pages"></nav>
 *   </div>
 *
 * Column options: data-key, data-format (core/format.js), data-sort
 * (text | number | date), data-render (badge | person | action), and for
 * actions data-action / data-action-label. Clicking an action dispatches a
 * "grid:action" CustomEvent on the grid with { action, row }.
 *
 * All cells are written with textContent. CSV export neutralises formula
 * injection. Search is pre-filled from ?q= in the URL.
 *
 * @module components/data-grid
 */
import { qs, qsa, on, claim, createElement } from '../core/dom.js';
import { loadData } from '../core/data.js';
import { formatValue } from '../core/format.js';
import { announce } from '../core/announce.js';

const BADGES = {
  paid: 'success', delivered: 'success', active: 'success', completed: 'success',
  pending: 'warning', processing: 'warning', trial: 'warning', 'at risk': 'warning',
  failed: 'danger', cancelled: 'danger', churned: 'danger', overdue: 'danger',
  shipped: 'primary', new: 'primary', vip: 'primary',
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function columnsOf(table) {
  return qsa('thead th', table).map((th) => ({
    th,
    key: th.dataset.key || '',
    label: th.textContent.trim(),
    format: th.dataset.format || 'text',
    sort: th.dataset.sort || '',
    render: th.dataset.render || '',
    action: th.dataset.action || '',
    actionLabel: th.dataset.actionLabel || 'View',
    numeric: th.classList.contains('num'),
  }));
}

function sortValue(row, col) {
  const v = row[col.key];
  if (col.sort === 'number') return Number(v) || 0;
  if (col.sort === 'date') return Date.parse(v) || 0;
  return String(v ?? '');
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

function renderCell(col, row, grid) {
  const td = createElement('td', { className: col.numeric ? 'num' : '' });
  const value = row[col.key];

  if (col.render === 'badge') {
    const variant = BADGES[String(value).toLowerCase()] || '';
    td.append(createElement('span', { className: `badge${variant ? ` badge--${variant}` : ''}`, text: String(value) }));
  } else if (col.render === 'person') {
    td.append(
      createElement('span', {
        className: 'person',
        children: [
          createElement('span', { className: 'avatar avatar--sm avatar--soft', text: initials(value), attrs: { 'aria-hidden': 'true' } }),
          createElement('span', {
            className: 'person__text',
            children: [
              createElement('span', { className: 'person__name', text: String(value ?? '') }),
              createElement('span', { className: 'person__meta', text: String(row.email ?? '') }),
            ],
          }),
        ],
      })
    );
  } else if (col.render === 'action') {
    const id = row.id ?? '';
    const button = createElement('button', {
      className: 'btn btn--ghost btn--sm',
      attrs: { type: 'button' },
      children: [
        createElement('span', { text: col.actionLabel }),
        createElement('span', { className: 'visually-hidden', text: ` ${grid.dataset.label ? grid.dataset.label.replace(/s$/, '') : 'row'} ${id}` }),
      ],
    });
    on(button, 'click', () => {
      grid.dispatchEvent(new CustomEvent('grid:action', { bubbles: true, detail: { action: col.action, row, trigger: button } }));
    });
    td.append(button);
  } else {
    td.textContent = col.format === 'text' ? String(value ?? '') : formatValue(value, col.format, { currency: grid.dataset.currency || 'USD' });
  }
  return td;
}

function csvEscape(value) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formulas
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const grid of qsa('[data-grid]', root)) {
    if (!claim(grid, 'grid')) continue;
    setupGrid(grid);
  }
}

function setupGrid(grid) {
  const table = qs('table', grid);
  const tbody = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
  const columns = columnsOf(table);
  const search = qs('[data-grid-search]', grid);
  const filters = qsa('[data-grid-filter]', grid);
  const status = qs('[data-grid-status]', grid);
  const pagination = qs('[data-grid-pagination]', grid);
  const exportButton = qs('[data-grid-export]', grid);
  const pageSize = Number(grid.dataset.pageSize) || 10;
  const label = grid.dataset.label || 'rows';

  const state = { rows: [], view: [], page: 1, sortKey: '', sortDir: 1, query: '' };

  // Sortable headers become buttons (existing text nodes are moved).
  for (const col of columns.filter((c) => c.sort)) {
    const button = createElement('button', { className: 'table__sort', attrs: { type: 'button' } });
    button.append(...col.th.childNodes);
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'icon table__sort-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 19V5M5 12l7-7 7 7');
    icon.append(path);
    button.append(icon);
    col.th.append(button);
    on(button, 'click', () => {
      state.sortDir = state.sortKey === col.key ? -state.sortDir : 1;
      state.sortKey = col.key;
      for (const c of columns) c.th.removeAttribute('aria-sort');
      col.th.setAttribute('aria-sort', state.sortDir === 1 ? 'ascending' : 'descending');
      apply({ resetPage: false });
      announce(`Sorted by ${col.label}, ${state.sortDir === 1 ? 'ascending' : 'descending'}.`);
    });
  }

  function apply({ resetPage = true } = {}) {
    const q = state.query.toLowerCase();
    const active = filters.map((f) => [f.dataset.gridFilter, f.value]).filter(([, v]) => v);

    state.view = state.rows.filter((row) => {
      if (active.some(([key, v]) => String(row[key]).toLowerCase() !== v.toLowerCase())) return false;
      if (!q) return true;
      return Object.values(row).some((v) => String(v).toLowerCase().includes(q));
    });

    if (state.sortKey) {
      const col = columns.find((c) => c.key === state.sortKey);
      state.view.sort((a, b) => {
        const va = sortValue(a, col);
        const vb = sortValue(b, col);
        const r = typeof va === 'number' ? va - vb : collator.compare(va, vb);
        return r * state.sortDir;
      });
    }
    if (resetPage) state.page = 1;
    render();
  }

  function render() {
    const total = state.view.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * pageSize;
    const slice = state.view.slice(start, start + pageSize);

    if (!slice.length) {
      const cell = createElement('td', { className: 'data-grid__empty', text: `No ${label} match your search or filters.`, attrs: { colspan: String(columns.length) } });
      tbody.replaceChildren(createElement('tr', { children: [cell] }));
    } else {
      tbody.replaceChildren(...slice.map((row) => createElement('tr', { children: columns.map((col) => renderCell(col, row, grid)) })));
    }

    if (status) {
      status.textContent = total
        ? `Showing ${start + 1}–${start + slice.length} of ${total} ${label}`
        : `No ${label} found`;
    }
    renderPagination(pages);
  }

  function renderPagination(pages) {
    if (!pagination) return;
    pagination.replaceChildren();
    if (pages <= 1) return;
    const list = createElement('ul', { className: 'pagination__list' });
    const go = (page) => {
      state.page = page;
      render();
      announce(`Page ${page} of ${pages}.`);
    };
    const button = (text, page, { current = false, disabled = false, hiddenText = '' } = {}) => {
      const b = createElement('button', {
        className: 'pagination__link',
        attrs: { type: 'button' },
        children: [
          ...(hiddenText ? [createElement('span', { className: 'visually-hidden', text: hiddenText })] : []),
          createElement('span', { text }),
        ],
      });
      if (current) b.setAttribute('aria-current', 'page');
      if (disabled) b.disabled = true;
      else on(b, 'click', () => go(page));
      return createElement('li', { children: [b] });
    };

    list.append(button('‹', state.page - 1, { disabled: state.page === 1, hiddenText: 'Previous page' }));
    const first = Math.max(1, Math.min(state.page - 2, pages - 4));
    for (let p = first; p <= Math.min(pages, first + 4); p += 1) {
      list.append(button(String(p), p, { current: p === state.page, hiddenText: 'Page ' }));
    }
    list.append(button('›', state.page + 1, { disabled: state.page === pages, hiddenText: 'Next page' }));
    pagination.append(list);
  }

  // Toolbar forms submit to the server without JavaScript; filter in place with it.
  for (const form of qsa('form', grid)) on(form, 'submit', (event) => event.preventDefault());

  if (search) {
    const fromUrl = new URLSearchParams(location.search).get('q');
    if (fromUrl) search.value = fromUrl.slice(0, 100);
    state.query = search.value.trim();
    let timer = 0;
    on(search, 'input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        state.query = search.value.trim();
        apply();
        if (status) announce(status.textContent);
      }, 200);
    });
  }
  for (const filter of filters) {
    on(filter, 'change', () => {
      apply();
      if (status) announce(status.textContent);
    });
  }

  if (exportButton) {
    exportButton.hidden = false;
    on(exportButton, 'click', () => {
      const cols = columns.filter((c) => c.key);
      const lines = [cols.map((c) => csvEscape(c.label)).join(',')];
      for (const row of state.view) lines.push(cols.map((c) => csvEscape(row[c.key])).join(','));
      const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = createElement('a', { attrs: { href: url, download: `${label}.csv` } });
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      announce(`Exported ${state.view.length} ${label} as CSV.`);
    });
  }

  async function load(fresh = false) {
    grid.setAttribute('aria-busy', 'true');
    try {
      const data = await loadData(grid.dataset.source, { path: grid.dataset.path || '', fresh });
      state.rows = Array.isArray(data) ? data : [];
      grid.classList.add('data-grid--ready');
      apply({ resetPage: false });
    } catch (error) {
      if (status) status.textContent = `Couldn't load ${label} (${error.message}). Showing the rows rendered by the server.`;
    } finally {
      grid.removeAttribute('aria-busy');
    }
  }

  // Expose a refresh hook for page scripts.
  grid.addEventListener('grid:refresh', () => load(true));
  on(document, 'vr:datachange', () => load(true));
  load();
}
