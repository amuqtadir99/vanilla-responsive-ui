/**
 * Dashboard template behaviour (all pages):
 *   - "New report" dialog confirmation
 *   - Order detail dialog opened from data-grid row actions
 *   - Customer "Message" action
 *   - Analytics date range picker (re-renders charts marked data-range-chart)
 *   - Settings → Data sources form (points every chart and grid at your API)
 */
import { qs, qsa, on } from '../../assets/js/core/dom.js';
import { formatValue } from '../../assets/js/core/format.js';
import { getDataBase, setDataBase, loadData } from '../../assets/js/core/data.js';
import { announce } from '../../assets/js/core/announce.js';
import { showToast } from '../../assets/js/components/toast.js';

/* ---- Report dialog ----------------------------------------------------- */
const reportDialog = document.getElementById('report-dialog');
if (reportDialog instanceof HTMLDialogElement) {
  const form = qs('form', reportDialog);
  on(reportDialog, 'close', () => {
    if (reportDialog.returnValue === 'create' && form) {
      const name = new FormData(form).get('name');
      showToast(`Report “${name}” created.`, { variant: 'success' });
      form.reset();
      delete form.dataset.submitted;
    }
    reportDialog.returnValue = '';
  });
}

/* ---- Order details ----------------------------------------------------- */
const orderDialog = document.getElementById('order-dialog');
let currentOrder = null;

function showOrder(row) {
  currentOrder = row;
  const values = {
    id: `Order ${row.id}`,
    customer: row.customer,
    email: row.email,
    date: formatValue(row.date, 'date'),
    status: row.status,
    channel: row.channel,
    country: row.country,
    products: Array.isArray(row.products) ? row.products.join(', ') : '—',
    total: formatValue(row.total, 'currency'),
  };
  for (const el of qsa('[data-order-field]', orderDialog)) {
    el.textContent = values[el.dataset.orderField] ?? '—';
  }
  orderDialog.showModal();
}

on(document, 'grid:action', (event) => {
  const { action, row } = event.detail;
  if (action === 'view' && orderDialog instanceof HTMLDialogElement) showOrder(row);
  if (action === 'message') showToast(`Draft email to ${row.name} (${row.email}) opened.`);
});

if (orderDialog) {
  const ship = qs('[data-order-ship]', orderDialog);
  on(ship, 'click', () => {
    if (currentOrder) showToast(`Order ${currentOrder.id} marked as shipped.`, { variant: 'success' });
    orderDialog.close();
  });
}

/* ---- Analytics date range ---------------------------------------------- */
const rangePicker = qs('[data-range-picker]');
if (rangePicker) {
  rangePicker.hidden = false;
  const status = qs('[data-range-status]');
  on(rangePicker, 'submit', (event) => event.preventDefault());
  on(rangePicker, 'change', async () => {
    const months = new FormData(rangePicker).get('range');
    const { refresh } = await import('../../assets/js/components/chart.js');
    for (const figure of qsa('[data-range-chart]')) {
      figure.dataset.limit = String(months);
      refresh(figure);
    }
    if (status) status.textContent = `Showing the last ${months} months.`;
  });
}

/* ---- Settings: data sources -------------------------------------------- */
const sourceForm = qs('[data-source-form]');
if (sourceForm) {
  const input = qs('#data-base', sourceForm);
  const status = qs('[data-source-status]', sourceForm);
  const reset = qs('[data-source-reset]', sourceForm);
  input.value = getDataBase();

  const test = async () => {
    status.textContent = 'Testing connection…';
    try {
      const sales = await loadData('sales', { fresh: true });
      const months = Array.isArray(sales?.monthly) ? sales.monthly.length : 0;
      status.textContent = `Connected to ${getDataBase()}: sales.json returned ${months} months of data.`;
    } catch (error) {
      status.textContent = `Could not load ${getDataBase()}sales.json (${error.message}). Check the URL, CORS headers and your CSP connect-src.`;
    }
  };

  on(sourceForm, 'submit', (event) => {
    event.preventDefault();
    if (!setDataBase(input.value)) {
      status.textContent = 'Use a relative path or an http(s) URL.';
      announce(status.textContent, 'assertive');
      return;
    }
    input.value = getDataBase();
    test();
  });

  on(reset, 'click', () => {
    setDataBase('');
    input.value = getDataBase();
    test();
  });
}
