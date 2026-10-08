/**
 * Theme customizer panel: colour mode, brand preset or custom brand colour,
 * density and corner radius, with live contrast feedback and copyable CSS.
 *
 * Markup: see src/components/theme-customizer.html. The trigger button and
 * the panel ship `hidden`/closed and are revealed by this module.
 *
 * All logic lives in core/theme.js, so you can drive the same settings from
 * your own UI or from server-rendered attributes.
 *
 * @module components/theme-customizer
 */
import { qs, qsa, on, claim } from '../core/dom.js';
import {
  DEFAULT_SETTINGS, applySettings, contrast, getMode, getSettings, setMode, toCss, effectiveScheme,
} from '../core/theme.js';

function readToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function syncForm(form) {
  const s = getSettings();
  const mode = getMode();
  for (const input of qsa('input[type="radio"]', form)) {
    if (input.name === 'mode') input.checked = input.value === mode;
    if (input.name === 'brand') input.checked = !s.custom && input.value === s.brand;
    if (input.name === 'density') input.checked = input.value === s.density;
    if (input.name === 'radius') input.checked = input.value === s.radius;
  }
  const custom = qs('input[name="custom"]', form);
  if (custom && s.custom) custom.value = s.custom;
  update(form, s);
}

function update(form, settings) {
  const output = qs('[data-theme-output]', form);
  if (output) output.value = toCss(settings);

  const report = qs('[data-theme-contrast]', form);
  if (!report) return;
  // Wait a frame so computed styles reflect the new attributes.
  window.requestAnimationFrame(() => {
    const primary = readToken('--color-primary');
    const onPrimary = readToken('--color-on-primary');
    const link = readToken('--color-link');
    const bg = readToken('--color-bg');
    if (![primary, onPrimary, link, bg].every((c) => /^#[0-9a-f]{6}$/i.test(c))) return;
    const button = contrast(onPrimary, primary);
    const links = contrast(link, bg);
    const pass = button >= 4.5 && links >= 4.5;
    report.textContent = `${effectiveScheme() === 'dark' ? 'Dark' : 'Light'} theme: button text ${button.toFixed(1)}:1, links ${links.toFixed(1)}:1 — ${pass ? 'passes' : 'fails'} WCAG AA.`;
  });
}

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const trigger of qsa('[data-theme-panel-trigger]', root)) trigger.hidden = false;

  for (const form of qsa('form[data-theme-customizer]', root)) {
    if (!claim(form, 'themeCustomizer')) continue;
    syncForm(form);

    on(form, 'submit', (event) => event.preventDefault());

    on(form, 'change', (event) => {
      const field = /** @type {HTMLInputElement} */ (event.target);
      const settings = getSettings();

      if (field.name === 'mode') {
        setMode(field.value);
      } else if (field.name === 'brand') {
        settings.brand = field.value;
        settings.custom = null;
      } else if (field.name === 'custom') {
        settings.custom = field.value;
        for (const radio of qsa('input[name="brand"]', form)) radio.checked = false;
      } else if (field.name === 'density' || field.name === 'radius') {
        settings[field.name] = field.value;
      } else {
        return;
      }
      update(form, applySettings(settings));
    });

    // Colour inputs fire "input" continuously while dragging.
    const custom = qs('input[name="custom"]', form);
    if (custom) {
      on(custom, 'input', () => {
        for (const radio of qsa('input[name="brand"]', form)) radio.checked = false;
        update(form, applySettings({ ...getSettings(), custom: custom.value }, { persist: false }));
      });
    }

    const reset = qs('[data-theme-reset]', form);
    if (reset) {
      on(reset, 'click', () => {
        setMode('system');
        applySettings({ ...DEFAULT_SETTINGS });
        syncForm(form);
      });
    }

    on(document, 'vr:themechange', () => syncForm(form));
  }
}
