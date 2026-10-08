/**
 * Demo cart stored in localStorage, shared by the shop pages.
 * Replace with calls to your commerce backend in production.
 *
 *   import { addItem, getCart, subtotal } from './cart-store.js';
 *   addItem({ id: 'watch', name: 'Field smartwatch', price: 249, image: '…' });
 *
 * Every change dispatches "cart:change" on document and updates every
 * [data-cart-count] badge.
 */
import { getItem, setItem } from '../../assets/js/core/storage.js';

const KEY = 'vr-demo-cart';
const MAX_QTY = 10;

function valid(item) {
  return (
    item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    Number.isFinite(item.price) &&
    Number.isInteger(item.qty) &&
    item.qty > 0
  );
}

/** @returns {Array<{ id: string, name: string, price: number, qty: number, image?: string, variant?: string }>} */
export function getCart() {
  try {
    const items = JSON.parse(getItem(KEY) || '[]');
    return Array.isArray(items) ? items.filter(valid) : [];
  } catch {
    return [];
  }
}

function save(items) {
  setItem(KEY, JSON.stringify(items));
  renderCount(items);
  document.dispatchEvent(new CustomEvent('cart:change', { detail: { items } }));
  return items;
}

const keyOf = (item) => `${item.id}|${item.variant || ''}`;

export function addItem(product, qty = 1) {
  const items = getCart();
  const existing = items.find((i) => keyOf(i) === keyOf(product));
  if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
  else items.push({ id: product.id, name: product.name, price: Number(product.price), image: product.image || '', variant: product.variant || '', qty: Math.min(MAX_QTY, qty) });
  return save(items);
}

export function setQty(key, qty) {
  const items = getCart();
  const item = items.find((i) => keyOf(i) === key);
  if (item) item.qty = Math.max(1, Math.min(MAX_QTY, Math.round(qty) || 1));
  return save(items);
}

export function removeItem(key) {
  return save(getCart().filter((i) => keyOf(i) !== key));
}

export function clearCart() {
  return save([]);
}

export function itemKey(item) {
  return keyOf(item);
}

export function count(items = getCart()) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function subtotal(items = getCart()) {
  return Math.round(items.reduce((sum, i) => sum + i.price * i.qty, 0) * 100) / 100;
}

export function renderCount(items = getCart()) {
  for (const badge of document.querySelectorAll('[data-cart-count]')) badge.textContent = String(count(items));
}
