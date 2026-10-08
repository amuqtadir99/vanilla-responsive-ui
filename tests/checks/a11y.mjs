/**
 * Static accessibility audit (WCAG 2.2 AA oriented). Complements, but does
 * not replace, manual testing with a keyboard and screen readers.
 */
import {
  parse, elements, attr, hasAttr, idMap, closest, ancestors, accessibleName, isAriaHidden, isFocusable, classes,
} from '../lib/html.mjs';
import { SRC, findFiles, read } from '../lib/util.mjs';

export const name = 'Accessibility (static)';

const LABELLABLE = new Set(['input', 'select', 'textarea']);
const NO_LABEL_INPUT_TYPES = new Set(['hidden', 'submit', 'reset', 'button', 'image']);
const BOOLEAN_ARIA = ['aria-expanded', 'aria-pressed', 'aria-selected', 'aria-checked', 'aria-hidden', 'aria-disabled', 'aria-invalid', 'aria-modal', 'aria-atomic', 'aria-busy', 'aria-required'];
const INTERACTIVE = new Set(['a', 'button', 'input', 'select', 'textarea', 'details', 'summary']);
const AUTOCOMPLETE_HINT = { email: 'email', password: 'current-password or new-password', tel: 'tel' };

export function run(report) {
  const files = findFiles(SRC, (n) => n.endsWith('.html'));

  for (const file of files) {
    const { root } = parse(read(file));
    const all = elements(root);
    const ids = idMap(root);

    for (const el of all) {
      const line = el.line;

      /* ---- Images ------------------------------------------------------ */
      if (el.tag === 'img') {
        report.assert(hasAttr(el, 'alt'), file, line, 'img-alt', '<img> needs an alt attribute (alt="" if decorative).');
        report.assert(hasAttr(el, 'width') && hasAttr(el, 'height'), file, line, 'img-dimensions', '<img> needs width and height to prevent layout shift.');
        if (!hasAttr(el, 'loading') && attr(el, 'fetchpriority') !== 'high') {
          report.warn(file, line, 'img-lazy', 'Add loading="lazy" to below-the-fold images (or fetchpriority="high" to the hero).');
        }
      }

      /* ---- Inline SVG must be decorative or labelled ------------------ */
      if (el.tag === 'svg' && !closest(el.parent, (n) => n.tag === 'svg')) {
        const decorative = attr(el, 'aria-hidden') === 'true';
        const labelled = attr(el, 'role') === 'img' && (hasAttr(el, 'aria-label') || hasAttr(el, 'aria-labelledby'));
        report.assert(decorative || labelled, file, line, 'svg-a11y', 'Inline <svg> needs aria-hidden="true" (decorative) or role="img" with a label.');
      }

      /* ---- Buttons ------------------------------------------------------ */
      if (el.tag === 'button') {
        report.assert(hasAttr(el, 'type'), file, line, 'button-type', '<button> needs an explicit type (button, submit or reset).');
        report.assert(accessibleName(el, ids), file, line, 'button-name', '<button> has no accessible name.');
      }

      /* ---- Links -------------------------------------------------------- */
      if (el.tag === 'a' && hasAttr(el, 'href')) {
        const label = accessibleName(el, ids);
        report.assert(label, file, line, 'link-name', '<a> has no accessible name.');
        if (/^(click here|here|read more|more|link)$/i.test(label)) {
          report.error(file, line, 'link-purpose', `Link text "${label}" is not descriptive (WCAG 2.4.4).`);
        }
      }

      /* ---- Form controls need labels ---------------------------------- */
      if (LABELLABLE.has(el.tag) && !NO_LABEL_INPUT_TYPES.has(attr(el, 'type') || '')) {
        const id = attr(el, 'id');
        const explicit = id && all.some((l) => l.tag === 'label' && attr(l, 'for') === id);
        const implicit = Boolean(closest(el.parent, (n) => n.tag === 'label'));
        const aria = hasAttr(el, 'aria-label') || hasAttr(el, 'aria-labelledby');
        report.assert(explicit || implicit || aria, file, line, 'label', `<${el.tag}${id ? ` id="${id}"` : ''}> has no associated label.`);

        const type = attr(el, 'type');
        if (AUTOCOMPLETE_HINT[type] && !hasAttr(el, 'autocomplete')) {
          report.warn(file, line, 'autocomplete', `Add autocomplete (${AUTOCOMPLETE_HINT[type]}) to type="${type}" (WCAG 1.3.5).`);
        }
        if (hasAttr(el, 'placeholder') && !explicit && !implicit && !aria) {
          report.error(file, line, 'placeholder-label', 'Placeholder text is not a label.');
        }
      }

      /* ---- ARIA attribute values -------------------------------------- */
      for (const a of BOOLEAN_ARIA) {
        const value = attr(el, a);
        if (value !== undefined && !['true', 'false', 'mixed'].includes(value) && !(a === 'aria-invalid' && ['grammar', 'spelling'].includes(value))) {
          report.error(file, line, 'aria-value', `${a}="${value}" must be "true" or "false".`);
        }
      }

      /* ---- Positive tabindex ------------------------------------------ */
      const tabindex = attr(el, 'tabindex');
      if (tabindex !== undefined) {
        report.assert(Number(tabindex) <= 0, file, line, 'tabindex', 'Positive tabindex breaks the natural focus order.');
      }

      /* ---- No focusable content inside aria-hidden ------------------- */
      if (isFocusable(el) && isAriaHidden(el) && !closest(el, (n) => hasAttr(n, 'hidden'))) {
        report.error(file, line, 'aria-hidden-focus', 'Focusable element inside aria-hidden="true".');
      }

      /* ---- No nested interactive elements ----------------------------- */
      if ((el.tag === 'a' && hasAttr(el, 'href')) || el.tag === 'button') {
        const nested = ancestors(el).find((n) => (n.tag === 'a' && hasAttr(n, 'href')) || n.tag === 'button');
        if (nested) report.error(file, line, 'nested-interactive', `<${el.tag}> is nested inside <${nested.tag}>.`);
      }
      if (el.tag === 'summary') {
        const inner = elements(el).find((n) => INTERACTIVE.has(n.tag) && isFocusable(n));
        if (inner) report.error(file, inner.line, 'nested-interactive', 'Interactive element inside <summary>.');
      }

      /* ---- Fieldsets need a legend ------------------------------------ */
      if (el.tag === 'fieldset') {
        const first = el.children.find((c) => c.type === 'element');
        report.assert(first && first.tag === 'legend', file, line, 'fieldset-legend', '<fieldset> must start with a <legend>.');
      }

      /* ---- Tables ------------------------------------------------------- */
      if (el.tag === 'table') {
        const hasCaption = el.children.some((c) => c.type === 'element' && c.tag === 'caption');
        report.assert(hasCaption || hasAttr(el, 'aria-label') || hasAttr(el, 'aria-labelledby'), file, line, 'table-caption', 'Data tables need a <caption> (or aria-label).');
      }
      if (el.tag === 'th') {
        report.assert(hasAttr(el, 'scope') || hasAttr(el, 'id'), file, line, 'th-scope', '<th> needs scope="col" or scope="row".');
      }

      /* ---- Scrollable regions must be keyboard reachable -------------- */
      if (classes(el).has('table-wrapper')) {
        report.assert(attr(el, 'tabindex') === '0' && attr(el, 'role') === 'region' && (hasAttr(el, 'aria-labelledby') || hasAttr(el, 'aria-label')), file, line, 'scroll-region', 'Scrollable .table-wrapper needs role="region", a label and tabindex="0".');
      }

      /* ---- Dialogs must be labelled ----------------------------------- */
      if (el.tag === 'dialog') {
        report.assert(hasAttr(el, 'aria-labelledby') || hasAttr(el, 'aria-label'), file, line, 'dialog-name', '<dialog> needs aria-labelledby or aria-label.');
      }

      /* ---- Landmarks: multiple navs must be distinguishable ----------- */
      if (el.tag === 'nav') {
        const navs = all.filter((n) => n.tag === 'nav');
        if (navs.length > 1) report.assert(hasAttr(el, 'aria-label') || hasAttr(el, 'aria-labelledby'), file, line, 'landmark-name', 'When a page has several <nav> elements, label each one.');
      }

      /* ---- Repository patterns: progressive enhancement --------------- */
      if (hasAttr(el, 'data-disclosure')) {
        report.assert(hasAttr(el, 'aria-expanded') && hasAttr(el, 'aria-controls'), file, line, 'disclosure', 'Disclosure buttons need aria-expanded and aria-controls.');
      }
      for (const jsOnly of ['data-disclosure', 'data-password-toggle', 'data-theme-toggle']) {
        if (hasAttr(el, jsOnly)) {
          report.assert(hasAttr(el, 'hidden'), file, line, 'progressive-enhancement', `[${jsOnly}] controls only work with JavaScript: ship them with the hidden attribute.`);
        }
      }
      if (hasAttr(el, 'data-tabs-list')) {
        report.assert(hasAttr(el, 'hidden'), file, line, 'progressive-enhancement', 'The tab list must ship hidden so all panels show without JavaScript.');
      }
      if (attr(el, 'aria-pressed') !== undefined && el.tag !== 'button') {
        report.error(file, line, 'aria-pressed', 'aria-pressed is only valid on buttons.');
      }
    }
  }

  return files.length;
}
