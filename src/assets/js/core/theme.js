/**
 * Theme engine: colour mode, brand preset, custom brand colour, density and
 * corner radius. Everything is expressed as attributes on <html> (handled by
 * tokens.css + themes.css) or, for a custom brand colour, as CSS custom
 * properties set through the CSSOM (allowed under a strict CSP).
 *
 *   import { initTheme, getSettings, applySettings, setMode } from './core/theme.js';
 *   applySettings({ ...getSettings(), brand: 'teal', density: 'compact' });
 *
 * main.js calls initTheme() on every page so stored choices apply before
 * components initialise.
 *
 * @module core/theme
 */
import { getItem, setItem, removeItem } from './storage.js';

export const BRANDS = ['indigo', 'teal', 'violet', 'rose', 'amber', 'slate'];
export const DENSITIES = ['default', 'compact', 'comfortable'];
export const RADII = ['default', 'sharp', 'round'];
export const MODES = ['system', 'light', 'dark'];

const MODE_KEY = 'vr-theme';
const SETTINGS_KEY = 'vr-theme-settings';
const CUSTOM_PROPS = ['primary', 'primary-hover', 'primary-soft', 'on-primary', 'link', 'focus', 'selection'];
const HEX = /^#[0-9a-f]{6}$/i;

// Reference surfaces from tokens.css used to guarantee contrast.
const SURFACES = {
  light: { bg: '#ffffff', surface: '#f5f7fa', text: '#161a21' },
  dark: { bg: '#0e1116', surface: '#161a21', text: '#e8ebf0' },
};

export const DEFAULT_SETTINGS = Object.freeze({
  brand: 'indigo',
  custom: null,
  density: 'default',
  radius: 'default',
});

/* ---- Colour maths ------------------------------------------------------ */
const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;

/** Mix two colours; amount 0 = a, 1 = b. */
export function mix(a, b, amount) {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex(ca.map((c, i) => c + (cb[i] - c) * amount));
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Move `color` towards `target` until it reaches `min` contrast against every background. */
function ensureContrast(color, backgrounds, min, target) {
  let result = color;
  for (let step = 0; step <= 20; step += 1) {
    if (backgrounds.every((bg) => contrast(result, bg) >= min)) return result;
    result = mix(color, target, step / 20);
  }
  return target;
}

/**
 * Derive a full, accessible brand palette (light + dark) from one colour.
 * Every text/background pair is pushed until it meets WCAG AA.
 * @param {string} hex - e.g. "#0f766e"
 * @returns {{ light: Record<string, string>, dark: Record<string, string> }}
 */
export function generateBrand(hex) {
  if (!HEX.test(hex)) throw new Error(`generateBrand: "${hex}" is not a #rrggbb colour`);
  const L = SURFACES.light;
  const D = SURFACES.dark;

  const lp = ensureContrast(hex, [L.bg, L.surface], 4.5, '#000000');
  const lSoft = ensureContrast(mix(lp, L.bg, 0.9), [lp], 4.5, L.bg);
  const light = {
    primary: lp,
    'primary-hover': mix(lp, '#000000', 0.18),
    'primary-soft': lSoft,
    'on-primary': '#ffffff',
    link: lp,
    focus: lp,
    selection: ensureContrast(mix(lp, L.bg, 0.75), [L.text], 4.5, L.bg),
  };

  const dp = ensureContrast(hex, [D.bg, D.surface], 4.5, '#ffffff');
  const dOn = ensureContrast(mix(dp, '#000000', 0.85), [dp, mix(dp, '#ffffff', 0.25)], 4.5, '#000000');
  const dark = {
    primary: dp,
    'primary-hover': mix(dp, '#ffffff', 0.25),
    'primary-soft': ensureContrast(mix(dp, D.bg, 0.82), [dp], 4.5, D.bg),
    'on-primary': dOn,
    link: ensureContrast(mix(dp, '#ffffff', 0.2), [D.bg, D.surface], 4.5, '#ffffff'),
    focus: mix(dp, '#ffffff', 0.2),
    selection: ensureContrast(mix(dp, D.bg, 0.6), [D.text], 4.5, D.bg),
  };
  return { light, dark };
}

/* ---- Mode (light / dark / system) -------------------------------------- */
const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)');

/** @returns {'system' | 'light' | 'dark'} */
export function getMode() {
  const stored = getItem(MODE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/** @returns {'light' | 'dark'} the scheme currently in effect */
export function effectiveScheme() {
  const mode = getMode();
  if (mode !== 'system') return mode;
  return prefersDark().matches ? 'dark' : 'light';
}

function notify() {
  applyCustomBrand(getSettings());
  document.dispatchEvent(new CustomEvent('vr:themechange', { detail: { scheme: effectiveScheme(), mode: getMode() } }));
}

/**
 * @param {'system' | 'light' | 'dark'} mode
 */
export function setMode(mode) {
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') {
    root.dataset.theme = mode;
    setItem(MODE_KEY, mode);
    document.cookie = `vr_theme=${mode}; path=/; max-age=31536000; SameSite=Lax`;
  } else {
    delete root.dataset.theme;
    removeItem(MODE_KEY);
    document.cookie = 'vr_theme=; path=/; max-age=0; SameSite=Lax';
  }
  notify();
}

/* ---- Settings (brand, density, radius) --------------------------------- */
function sanitize(raw) {
  const s = { ...DEFAULT_SETTINGS };
  if (raw && typeof raw === 'object') {
    if (BRANDS.includes(raw.brand)) s.brand = raw.brand;
    if (typeof raw.custom === 'string' && HEX.test(raw.custom)) s.custom = raw.custom.toLowerCase();
    if (DENSITIES.includes(raw.density)) s.density = raw.density;
    if (RADII.includes(raw.radius)) s.radius = raw.radius;
  }
  return s;
}

/** @returns {{ brand: string, custom: string | null, density: string, radius: string }} */
export function getSettings() {
  try {
    return sanitize(JSON.parse(getItem(SETTINGS_KEY) || 'null'));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function applyCustomBrand(settings) {
  const style = document.documentElement.style;
  if (!settings.custom) {
    for (const name of CUSTOM_PROPS) style.removeProperty(`--color-${name}`);
    return;
  }
  const palette = generateBrand(settings.custom)[effectiveScheme()];
  for (const name of CUSTOM_PROPS) style.setProperty(`--color-${name}`, palette[name]);
}

/**
 * Apply settings to the page (and persist them unless persist is false).
 * @param {object} settings
 * @param {{ persist?: boolean }} [options]
 */
export function applySettings(settings, { persist = true } = {}) {
  const s = sanitize(settings);
  const data = document.documentElement.dataset;
  const set = (key, value, fallback) => {
    if (value === fallback) delete data[key];
    else data[key] = value;
  };
  set('brand', s.custom ? 'indigo' : s.brand, 'indigo');
  set('density', s.density, 'default');
  set('radius', s.radius, 'default');
  applyCustomBrand(s);
  if (persist) {
    const isDefault = JSON.stringify(s) === JSON.stringify(DEFAULT_SETTINGS);
    if (isDefault) removeItem(SETTINGS_KEY);
    else setItem(SETTINGS_KEY, JSON.stringify(s));
  }
  document.dispatchEvent(new CustomEvent('vr:settingschange', { detail: s }));
  return s;
}

/**
 * CSS a developer can paste into brand.css (loaded after tokens.css) to make
 * the current settings permanent without JavaScript.
 */
export function toCss(settings) {
  const s = sanitize(settings);
  const attrs = [];
  if (!s.custom && s.brand !== 'indigo') attrs.push(`data-brand="${s.brand}"`);
  if (s.density !== 'default') attrs.push(`data-density="${s.density}"`);
  if (s.radius !== 'default') attrs.push(`data-radius="${s.radius}"`);

  const lines = ['/* brand.css: load after tokens.css and themes.css */'];
  if (attrs.length) lines.push(`/* Add to <html>: ${attrs.join(' ')} */`);
  if (s.custom) {
    const { light, dark } = generateBrand(s.custom);
    const block = (palette, indent) =>
      CUSTOM_PROPS.map((name) => `${indent}--color-${name}: ${palette[name]};`).join('\n');
    lines.push(
      `:root {\n${block(light, '  ')}\n}`,
      `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${block(dark, '    ')}\n  }\n}`,
      `:root[data-theme="dark"] {\n${block(dark, '  ')}\n}`
    );
  } else if (!attrs.length) {
    lines.push('/* Default theme: nothing to override. */');
  }
  return lines.join('\n\n');
}

let initialised = false;

/** Apply stored mode and settings. Safe to call more than once. */
export function initTheme() {
  const mode = getMode();
  if (mode !== 'system') document.documentElement.dataset.theme = mode;
  applySettings(getSettings(), { persist: false });

  if (initialised) return;
  initialised = true;
  prefersDark().addEventListener('change', () => {
    if (getMode() === 'system') notify();
  });
}
