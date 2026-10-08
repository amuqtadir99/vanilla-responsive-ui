/**
 * Data layer: load JSON for charts, data grids and the AI assistant from a
 * file, an API endpoint or an inline <script type="application/json"> block.
 *
 *   <meta name="vr-data-base" content="../../data/">      (per page, optional)
 *   <figure data-viz="line" data-source="sales" data-path="monthly">
 *
 * data-source accepts:
 *   "sales"                          → `${base}sales.json` (base from the meta tag,
 *                                      overridable at runtime, see setDataBase)
 *   "../../data/sales.json"          → that URL
 *   "https://api.example.com/sales"  → that URL (allow it in your CSP connect-src)
 *   "#sales-data"                    → JSON inside <script type="application/json" id="sales-data">
 *
 * Responses are cached per URL. Call setDataBase() to point every named
 * source at your own API; components listening for "vr:datachange" reload.
 *
 * @module core/data
 */
import { getItem, setItem, removeItem } from './storage.js';

const BASE_KEY = 'vr-data-base';
const cache = new Map();
const TIMEOUT_MS = 10000;

/** Base URL for named sources: stored override → <meta name="vr-data-base"> → "data/". */
export function getDataBase() {
  const stored = getItem(BASE_KEY);
  if (stored) return stored;
  const meta = document.querySelector('meta[name="vr-data-base"]');
  return meta ? meta.getAttribute('content') || '' : 'data/';
}

/**
 * Point named sources at another base URL (e.g. "https://api.example.com/v1/").
 * Pass an empty value to restore the page default. Only http(s) and relative
 * URLs are accepted.
 * @param {string} base
 * @returns {boolean} whether the value was accepted
 */
export function setDataBase(base) {
  const value = (base || '').trim();
  if (!value) {
    removeItem(BASE_KEY);
  } else {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return false;
    setItem(BASE_KEY, value.endsWith('/') ? value : `${value}/`);
  }
  cache.clear();
  document.dispatchEvent(new CustomEvent('vr:datachange', { detail: { base: getDataBase() } }));
  return true;
}

/** Resolve a data-source value to a URL (or an inline element id). */
export function resolveSource(source) {
  if (source.startsWith('#')) return source;
  const isName = /^[\w-]+$/.test(source);
  return isName ? `${getDataBase()}${source}.json` : source;
}

/** Read a dotted path ("monthly", "regions.0.revenue") from an object. */
export function getPath(data, path) {
  if (!path) return data;
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), data);
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Load JSON data.
 * @param {string} source - name, URL or "#inline-id" (see module docs)
 * @param {{ path?: string, fresh?: boolean }} [options]
 * @returns {Promise<any>}
 */
export async function loadData(source, { path, fresh = false } = {}) {
  const resolved = resolveSource(source);

  if (resolved.startsWith('#')) {
    const el = document.getElementById(resolved.slice(1));
    if (!el) throw new Error(`No inline data element ${resolved}`);
    return getPath(JSON.parse(el.textContent || 'null'), path);
  }

  if (fresh || !cache.has(resolved)) {
    const promise = fetchJson(resolved);
    cache.set(resolved, promise);
    promise.catch(() => cache.delete(resolved));
  }
  return getPath(await cache.get(resolved), path);
}
