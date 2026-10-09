/**
 * E-commerce template behaviour (listing, product and cart pages).
 *
 * Progressive enhancement: without JavaScript the filter form submits a GET
 * request for the server to handle, the product form posts to cart.html and
 * the product gallery still switches images with CSS only.
 */
import { qs, qsa, on, createElement } from '../../assets/js/core/dom.js';
import { formatValue } from '../../assets/js/core/format.js';
import { announce } from '../../assets/js/core/announce.js';
import { showToast } from '../../assets/js/components/toast.js';
import { addItem, getCart, setQty, removeItem, itemKey, subtotal, renderCount } from './cart-store.js';

const money = (n) => formatValue(n, 'currency');

renderCount();

/* ---- Listing: filters and sorting -------------------------------------- */
const list = qs('[data-product-list]');
const filterForm = qs('[data-filter-form]');
const sortSelect = qs('[data-sort-products]');
const resultsCount = qs('[data-results-count]');
const emptyState = qs('[data-empty-state]');
const products = qsa('[data-product]');

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
    const match = (categories.length === 0 || categories.includes(item.dataset.category)) && inPriceRange(Number(item.dataset.price), price);
    item.hidden = !match;
    if (match) visible += 1;
  }
  resultsCount.textContent = `Showing ${visible} of ${products.length} products`;
  emptyState.hidden = visible > 0;
}

const sorters = {
  featured: (a, b) => a.dataset.order - b.dataset.order,
  'price-asc': (a, b) => a.dataset.price - b.dataset.price,
  'price-desc': (a, b) => b.dataset.price - a.dataset.price,
  rating: (a, b) => b.dataset.rating - a.dataset.rating,
};

if (list && filterForm && sortSelect && resultsCount && emptyState) {
  const submit = qs('[data-filter-submit]', filterForm);
  if (submit) submit.hidden = true;
  on(filterForm, 'change', applyFilters);
  on(filterForm, 'submit', (event) => {
    event.preventDefault();
    applyFilters();
  });
  on(filterForm, 'reset', () => window.setTimeout(applyFilters));
  on(sortSelect, 'change', () => list.append(...[...products].sort(sorters[sortSelect.value] || sorters.featured)));
  const filters = filterForm.closest('details');
  if (filters && window.matchMedia('(max-width: 47.99em)').matches) filters.open = false;

  // Honour ?category=…&price=… (category tiles and shared links), the same
  // query a server would receive from the no-JS form.
  const params = new URLSearchParams(window.location.search);
  if (params.has('category') || params.has('price')) {
    const wanted = new Set(params.getAll('category'));
    for (const box of qsa('input[name="category"]', filterForm)) box.checked = wanted.has(box.value);
    const price = params.get('price');
    if (price) {
      const radio = qsa('input[name="price"]', filterForm).find((r) => r.value === price);
      if (radio) radio.checked = true;
    }
    applyFilters();
  }
}

for (const button of qsa('[data-add-to-cart]')) {
  on(button, 'click', () => {
    const name = button.dataset.addToCart;
    addItem({ id: button.dataset.productId || name, name, price: Number(button.dataset.price) || 0, image: button.dataset.image });
    showToast(`Added “${name}” to your cart.`, { variant: 'success' });
  });
}

/* ---- Product page ------------------------------------------------------ */
const productForm = qs('[data-product-form]');
if (productForm) {
  const qty = qs('input[name="qty"]', productForm);
  for (const stepper of qsa('[data-step]', productForm)) {
    stepper.hidden = false;
    on(stepper, 'click', () => {
      const next = Math.min(10, Math.max(1, (Number(qty.value) || 1) + Number(stepper.dataset.step)));
      qty.value = String(next);
      announce(`Quantity ${next}`);
    });
  }
  on(productForm, 'submit', (event) => {
    event.preventDefault();
    const data = new FormData(productForm);
    const amount = Math.min(10, Math.max(1, Number(data.get('qty')) || 1));
    const d = productForm.dataset;
    addItem({ id: d.productId, name: d.productName, price: Number(d.price), image: d.image, variant: String(data.get('variant') || '') }, amount);
    showToast(`Added ${amount} × ${d.productName} (${data.get('variant')}) to your cart.`, { variant: 'success' });
  });
}

/* ---- Cart page --------------------------------------------------------- */
const cartList = qs('[data-cart-items]');
if (cartList) {
  const empty = qs('[data-cart-empty]');
  const promoForm = qs('[data-promo-form]');
  const promoInput = qs('#promo-code');
  const promoError = qs('#promo-error');
  const status = qs('[data-cart-status]');
  let discountRate = 0;

  const field = (name) => qs(`[data-cart-${name}]`);

  function renderSummary(items) {
    const sub = subtotal(items);
    const discount = Math.round(sub * discountRate * 100) / 100;
    const shipping = sub === 0 || sub - discount >= 50 ? 0 : 6.95;
    const tax = Math.round((sub - discount) * 0.08 * 100) / 100;
    field('subtotal').textContent = money(sub);
    field('discount').textContent = `−${money(discount)}`;
    field('discount-row').hidden = discount === 0;
    field('shipping').textContent = shipping ? money(shipping) : 'Free';
    field('tax').textContent = money(tax);
    field('total').textContent = money(sub - discount + shipping + tax);
  }

  function render() {
    const items = getCart();
    empty.hidden = items.length > 0;
    cartList.hidden = items.length === 0;
    cartList.replaceChildren(
      ...items.map((item) => {
        const key = itemKey(item);
        const label = `${item.name}${item.variant ? ` (${item.variant})` : ''}`;
        const inputId = `qty-${key.replace(/[^a-z0-9]/gi, '-')}`;
        const qtyInput = createElement('input', {
          className: 'input stepper__input',
          attrs: { id: inputId, type: 'number', min: '1', max: '10', inputmode: 'numeric', value: String(item.qty) },
        });
        on(qtyInput, 'change', () => {
          setQty(key, Number(qtyInput.value));
          announce(`${label}: quantity ${getCart().find((i) => itemKey(i) === key)?.qty ?? ''}.`);
        });
        const remove = createElement('button', {
          className: 'btn btn--ghost btn--sm',
          attrs: { type: 'button' },
          children: [createElement('span', { text: 'Remove' }), createElement('span', { className: 'visually-hidden', text: ` ${label}` })],
        });
        on(remove, 'click', () => {
          removeItem(key);
          announce(`${label} removed from cart.`);
          const firstInput = qs('input', cartList);
          (firstInput || qs('a', empty)).focus();
        });
        const media = item.image
          ? [createElement('img', { className: 'cart-item__image', attrs: { src: item.image, alt: '', width: '400', height: '300', loading: 'lazy' } })]
          : [];
        return createElement('li', {
          className: 'cart-item',
          children: [
            ...media,
            createElement('div', {
              className: 'cart-item__body',
              children: [
                createElement('p', { className: 'cart-item__name', text: item.name }),
                createElement('p', { className: 'text-sm text-muted', text: [item.variant, `${money(item.price)} each`].filter(Boolean).join(' · ') }),
                createElement('div', {
                  className: 'cart-item__controls',
                  children: [
                    createElement('label', { className: 'text-sm', text: 'Quantity', attrs: { for: inputId } }),
                    qtyInput,
                    remove,
                  ],
                }),
              ],
            }),
            createElement('p', { className: 'cart-item__total', text: money(item.price * item.qty) }),
          ],
        });
      })
    );
    renderSummary(items);
  }

  on(promoForm, 'submit', (event) => {
    event.preventDefault();
    const code = promoInput.value.trim().toUpperCase();
    if (code === 'WELCOME10') {
      discountRate = 0.1;
      promoInput.removeAttribute('aria-invalid');
      promoError.textContent = '';
      status.textContent = 'Promo code WELCOME10 applied: 10% off.';
    } else {
      discountRate = 0;
      promoInput.setAttribute('aria-invalid', 'true');
      promoError.textContent = code ? `“${code}” is not a valid promo code.` : 'Enter a promo code.';
      promoInput.focus();
    }
    renderSummary(getCart());
  });

  on(qs('[data-checkout]'), 'click', (event) => {
    if (!getCart().length) {
      event.preventDefault();
      status.textContent = 'Add something to your cart before checking out.';
    }
  });

  on(document, 'cart:change', render);
  render();
}
