/**
 * Page builder canvas (canvas.html, generated). The builder inserts, moves
 * and edits blocks here; this module re-initialises components (accordions,
 * tabs, forms, charts) whenever new markup arrives.
 */
import { initAll } from '../assets/js/main.js';

const targets = ['[data-canvas]', '[data-canvas-header]', '[data-canvas-footer]']
  .map((selector) => document.querySelector(selector))
  .filter(Boolean);

let pending = 0;
const observer = new MutationObserver(() => {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(() => targets.forEach((el) => initAll(el)));
});
for (const el of targets) observer.observe(el, { childList: true });
