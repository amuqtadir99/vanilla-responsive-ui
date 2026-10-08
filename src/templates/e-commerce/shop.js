/**
 * E-commerce template behaviour: instant filtering, sorting and a demo cart.
 *
 * Progressive enhancement: without JavaScript the filter form submits as a
 * normal GET request (?category=…&price=…) for the server to handle, and the
 * product list is rendered in its default order.
 */
import { qs, qsa, on } from '../../assets/js/core/dom.js';
import { getItem, setItem } from '../../assets/js/core/storage.js';
import { showToast } from '../../assets/js/components/toast.js';

const CART_KEY = 'vr-demo-cart';

const list = qs('[data-product-list]');
const filterForm = qs('[data-filter-form]');
const sortSelect = qs('[data-sort-products]');
const resultsCount = qs('[data-results-count]');
const emptyState = qs('[data-empty-state]');
const products = qsa('[data-product]');

/* ---- Filtering --------------------------------------------------------- */
function inPriceRange(price, range) {
  if (!range || range === 'any') return true;
  const [min, max] = range.split('-').map((n) => (n === '' ? undefined : Number(n)));
  return (min === undefined || price >= min) && (max === undefined || price < max);
}

function applyFilters() {
  const data = new FormData(filterForm);
  const categories = data.getAll('category');
  const price = data.get('price');
  let visible = 0;

  for (const item of products) {
    const match =
      (categories.length === 0 || categories.includes(item.dataset.category)) &&
      inPriceRange(Number(item.dataset.price), price);
    item.hidden = !match;
    if (match) visible += 1;
  }

  resultsCount.textContent = `Showing ${visible} of ${products.length} products`;
  emptyState.hidden = visible > 0;
}

/* ---- Sorting ----------------------------------------------------------- */
const sorters = {
  featured: (a, b) => a.dataset.order - b.dataset.order,
  'price-asc': (a, b) => a.dataset.price - b.dataset.price,
  'price-desc': (a, b) => b.dataset.price - a.dataset.price,
  rating: (a, b) => b.dataset.rating - a.dataset.rating,
};

function applySort() {
  const sorter = sorters[sortSelect.value] || sorters.featured;
  list.append(...[...products].sort(sorter));
}

/* ---- Cart (demo only: replace with your backend) ----------------------- */
function readCart() {
  try {
    const items = JSON.parse(getItem(CART_KEY) || '[]');
    return Array.isArray(items) ? items.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function renderCartCount(cart) {
  for (const badge of qsa('[data-cart-count]')) badge.textContent = String(cart.length);
}

if (list && filterForm && sortSelect && resultsCount && emptyState) {
  // Filters apply instantly, so the submit button is redundant with JS.
  const submit = qs('[data-filter-submit]', filterForm);
  if (submit) submit.hidden = true;

  on(filterForm, 'change', applyFilters);
  on(filterForm, 'submit', (event) => {
    event.preventDefault();
    applyFilters();
  });
  // The reset event fires before the controls are cleared.
  on(filterForm, 'reset', () => window.setTimeout(applyFilters));
  on(sortSelect, 'change', applySort);

  // Collapse the filter panel on small screens so products come first.
  const filters = filterForm.closest('details');
  if (filters && window.matchMedia('(max-width: 47.99em)').matches) filters.open = false;
}

let cart = readCart();
renderCartCount(cart);

for (const button of qsa('[data-add-to-cart]')) {
  on(button, 'click', () => {
    const name = button.dataset.addToCart || 'Item';
    cart = [...cart, name];
    setItem(CART_KEY, JSON.stringify(cart));
    renderCartCount(cart);
    showToast(`Added “${name}” to your cart.`, { variant: 'success' });
  });
}

const cartButton = qs('[data-cart-button]');
if (cartButton) {
  on(cartButton, 'click', () => {
    const count = cart.length;
    showToast(
      count === 0 ? 'Your cart is empty.' : `Your cart has ${count} item${count === 1 ? '' : 's'}.`
    );
  });
}
