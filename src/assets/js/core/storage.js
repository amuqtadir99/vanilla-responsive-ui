/**
 * localStorage wrapper that never throws (private mode, disabled storage,
 * quota errors, sandboxed iframes).
 * @module core/storage
 */

/**
 * @param {string} key
 * @returns {string | null}
 */
export function getItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {string} value
 * @returns {boolean} whether the value was stored
 */
export function setItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 */
export function removeItem(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable: nothing to remove */
  }
}
