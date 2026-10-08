/**
 * Table-driven bar chart. The data stays in an accessible <table>; this
 * script only draws proportional bars behind the value cells, so screen
 * readers, copy/paste and no-JS users all get the real numbers.
 *
 * Markup:
 *   <table class="table" data-chart>
 *     …<td class="num" data-value="48200">$48,200</td>…
 *   </table>
 *
 * Uses the CSSOM (style.setProperty), which is allowed under a strict
 * Content-Security-Policy without 'unsafe-inline'.
 *
 * @module components/data-chart
 */
import { qsa, claim } from '../core/dom.js';

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const table of qsa('table[data-chart]', root)) {
    if (!claim(table, 'chart')) continue;

    const cells = qsa('td[data-value]', table);
    const values = cells.map((cell) => Number.parseFloat(cell.dataset.value || '0') || 0);
    const max = Math.max(...values, 0);
    if (max <= 0) continue;

    cells.forEach((cell, i) => {
      cell.style.setProperty('--value', String(Math.max(values[i], 0) / max));
    });
    table.classList.add('data-chart--enhanced');
  }
}
