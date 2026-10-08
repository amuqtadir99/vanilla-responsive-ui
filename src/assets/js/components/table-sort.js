/**
 * Sortable data table — WAI-ARIA APG "Sortable Table".
 *
 * Markup:
 *   <table class="table" data-sortable>
 *     <thead><tr>
 *       <th scope="col" data-sort="text">Customer</th>
 *       <th scope="col" data-sort="number" class="num">Amount</th>
 *       <th scope="col" data-sort="date">Date</th>
 *       <th scope="col">Actions</th>            (no data-sort: not sortable)
 *     </tr></thead>
 *     <tbody>… <td data-sort-value="1250.5">$1,250.50</td> …</tbody>
 *   </table>
 *
 * Header text is wrapped in a <button>; the sorted column gets aria-sort.
 * Existing DOM nodes are moved (never re-created from strings).
 *
 * @module components/table-sort
 */
import { qsa, on, claim, createElement } from '../core/dom.js';
import { announce } from '../core/announce.js';

const ARROW = 'M12 19V5M5 12l7-7 7 7';

function arrowIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'icon table__sort-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', ARROW);
  svg.append(path);
  return svg;
}

function cellValue(row, index, type) {
  const cell = row.cells[index];
  if (!cell) return '';
  const raw = cell.dataset.sortValue ?? cell.textContent.trim();
  if (type === 'number') {
    const n = Number.parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
    return Number.isNaN(n) ? Number.NEGATIVE_INFINITY : n;
  }
  if (type === 'date') {
    const t = Date.parse(raw);
    return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
  }
  return String(raw);
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const table of qsa('table[data-sortable]', root)) {
    if (!claim(table, 'sortable')) continue;

    const tbody = table.tBodies[0];
    const headers = qsa('thead th[data-sort]', table);
    if (!tbody || headers.length === 0) continue;

    for (const th of headers) {
      const label = th.textContent.trim();
      const button = createElement('button', {
        className: 'table__sort',
        attrs: { type: 'button' },
      });
      button.append(...th.childNodes, arrowIcon());
      th.append(button);

      on(button, 'click', () => {
        const ascending = th.getAttribute('aria-sort') !== 'ascending';
        const index = th.cellIndex;
        const type = th.dataset.sort;

        const rows = Array.from(tbody.rows);
        rows.sort((a, b) => {
          const va = cellValue(a, index, type);
          const vb = cellValue(b, index, type);
          const result = type === 'text' ? collator.compare(va, vb) : va - vb;
          return ascending ? result : -result;
        });
        tbody.append(...rows);

        for (const other of headers) other.removeAttribute('aria-sort');
        th.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
        announce(`Sorted by ${label}, ${ascending ? 'ascending' : 'descending'}.`);
      });
    }
  }
}
