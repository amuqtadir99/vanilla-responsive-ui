/**
 * Tiny DOM helpers. No globals, no dependencies.
 * @module core/dom
 */

/**
 * Query a single element.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {Element | null}
 */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Query all matching elements as a real array.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {Element[]}
 */
export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Add an event listener and return a function that removes it.
 * @param {EventTarget} target
 * @param {string} type
 * @param {EventListener} handler
 * @param {AddEventListenerOptions | boolean} [options]
 * @returns {() => void}
 */
export function on(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

/**
 * Create an element safely. Text is always assigned with textContent, so
 * untrusted strings can never be parsed as HTML (XSS-safe).
 *
 * @example
 *   createElement('p', { className: 'toast__message', text: userInput });
 *
 * @param {string} tag
 * @param {object} [options]
 * @param {string} [options.className]
 * @param {string} [options.text]
 * @param {Record<string, string>} [options.attrs]
 * @param {Node[]} [options.children]
 * @returns {HTMLElement}
 */
export function createElement(tag, { className, text, attrs = {}, children = [] } = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  for (const [name, value] of Object.entries(attrs)) {
    if (/^on/i.test(name)) {
      throw new Error(`createElement: inline event handler "${name}" is not allowed`);
    }
    el.setAttribute(name, value);
  }
  el.append(...children);
  return el;
}

let idCounter = 0;

/**
 * Return a document-unique id with the given prefix.
 * @param {string} [prefix='vr']
 * @returns {string}
 */
export function uniqueId(prefix = 'vr') {
  let id;
  do {
    idCounter += 1;
    id = `${prefix}-${idCounter}`;
  } while (document.getElementById(id));
  return id;
}

/**
 * Ensure an element has an id and return it.
 * @param {Element} el
 * @param {string} [prefix]
 * @returns {string}
 */
export function ensureId(el, prefix) {
  if (!el.id) el.id = uniqueId(prefix);
  return el.id;
}

/**
 * Mark an element as initialised so a component never binds twice
 * (safe for frameworks that re-run init after client-side navigation).
 * @param {HTMLElement} el
 * @param {string} name
 * @returns {boolean} true the first time, false afterwards
 */
export function claim(el, name) {
  const key = `vr${name.charAt(0).toUpperCase()}${name.slice(1)}Ready`;
  if (el.dataset[key] === 'true') return false;
  el.dataset[key] = 'true';
  return true;
}
