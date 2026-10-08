#!/usr/bin/env node
/**
 * Browser smoke tests (optional). Uses Playwright if it is installed
 * locally or globally; otherwise skips with exit code 0 so the repository
 * keeps its zero-dependency promise. Pass --require to fail instead.
 *
 *   node tests/browser/smoke.mjs
 *
 * Covers, on every page: no console errors or CSP violations, progressive
 * enhancement actually runs, no horizontal scroll at 320 CSS px (WCAG
 * 1.4.10). Then keyboard and behaviour checks for the interactive
 * components: menu, tabs, dialog, forms, sortable table, charts, data grid,
 * chat and chat widget, theme panel, shop filters and cart, layout builder
 * and the gallery's copy buttons.
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { startServer } from '../lib/server.mjs';
import { ROOT, SRC, findFiles } from '../lib/util.mjs';

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    try {
      const globalRoot = execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      const require = createRequire(path.join(globalRoot, 'noop.js'));
      return require('playwright');
    } catch {
      return null;
    }
  }
}

/** Every complete page: templates, layouts, home and the gallery (not snippets or partials). */
const PAGES = findFiles(SRC, (n) => n.endsWith('.html'))
  .map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
  .filter((f) => !f.startsWith('src/layouts/partials/'))
  .filter((f) => !f.startsWith('src/components/') || f === 'src/components/index.html')
  .sort();

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
}

/** Wait for a condition in the page; resolves false instead of throwing on timeout. */
async function waitFor(page, fn, arg, timeout = 5000) {
  try {
    await page.waitForFunction(fn, arg, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function openPage(browser, base, file, viewport = { width: 1280, height: 900 }, options = {}) {
  const context = await browser.newContext({ viewport, ...options });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  await page.goto(`${base}/${file}`, { waitUntil: 'networkidle' });
  return { page, context, problems };
}

async function main() {
  const playwright = await loadPlaywright();
  if (!playwright) {
    const msg = 'Playwright not found: skipping browser tests (install it globally to enable them).';
    if (process.argv.includes('--require')) {
      console.error(msg);
      process.exit(1);
    }
    console.log(msg);
    return;
  }

  const server = await startServer();
  const browser = await playwright.chromium.launch();

  try {
    /* ---- Every page: clean console, enhancement, reflow ------------- */
    for (const file of PAGES) {
      console.log(`\n${file}`);
      const { page, context, problems } = await openPage(browser, server.url, file);
      check('no console errors or CSP violations', problems.length === 0, problems.join(' | '));

      const hiddenControls = await page.evaluate(() =>
        [...document.querySelectorAll('[data-theme-toggle], [data-theme-panel-trigger], [data-chat-launcher]')]
          .filter((el) => el.hidden && !el.parentElement?.closest('[hidden], dialog:not([open])'))
          .map((el) => el.outerHTML.slice(0, 60)));
      check('JS enhancement ran (JS-only controls revealed)', hiddenControls.length === 0, hiddenControls.join(' | '));

      await page.setViewportSize({ width: 320, height: 800 });
      await page.waitForTimeout(100);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check('no horizontal scroll at 320px (WCAG 1.4.10)', overflow <= 0, `overflows by ${overflow}px`);

      await context.close();
    }

    /* ---- Disclosure menu at mobile width ---------------------------- */
    console.log('\nInteractions');
    {
      const { page, context } = await openPage(browser, server.url, 'src/templates/landing-page/index.html', { width: 375, height: 800 });
      const toggle = page.locator('.site-header__toggle');
      check('menu collapsed on mobile', !(await page.locator('#site-menu').isVisible()));
      await toggle.click();
      check('menu opens and sets aria-expanded', (await toggle.getAttribute('aria-expanded')) === 'true' && (await page.locator('#site-menu').isVisible()));
      await page.locator('#site-menu a').first().focus();
      await page.keyboard.press('Escape');
      check('Escape closes menu and restores focus', (await toggle.getAttribute('aria-expanded')) === 'false' && (await page.evaluate(() => document.activeElement.classList.contains('site-header__toggle'))));
      await context.close();
    }

    /* ---- Tabs keyboard support -------------------------------------- */
    {
      const { page, context } = await openPage(browser, server.url, 'src/templates/dashboard/index.html');
      const tabs = page.locator('[role="tab"]');
      check('tabs get ARIA roles', (await tabs.count()) === 3);
      await tabs.first().focus();
      await page.keyboard.press('ArrowRight');
      check('ArrowRight selects next tab', (await tabs.nth(1).getAttribute('aria-selected')) === 'true' && (await page.locator('#panel-tasks').isVisible()));
      await page.keyboard.press('End');
      check('End selects last tab', (await tabs.nth(2).getAttribute('aria-selected')) === 'true');
      await page.keyboard.press('ArrowRight');
      check('ArrowRight wraps to first tab', (await tabs.first().getAttribute('aria-selected')) === 'true');
      check('inactive panels hidden', !(await page.locator('#panel-notes').isVisible()));

      /* Dialog */
      const opener = page.locator('button[command="show-modal"][commandfor="report-dialog"]');
      await opener.click();
      const dialog = page.locator('#report-dialog');
      check('dialog opens', await dialog.evaluate((d) => d.open));
      await page.locator('#report-dialog button[type="submit"]').click();
      check('dialog validation keeps it open and marks field invalid', (await dialog.evaluate((d) => d.open)) && (await page.locator('#report-name').getAttribute('aria-invalid')) === 'true');
      check('focus moved to first invalid field', await page.evaluate(() => document.activeElement.id === 'report-name'));
      await page.locator('#report-name').fill('Weekly sales');
      await page.locator('#report-dialog button[type="submit"]').click();
      check('valid submit closes dialog', !(await dialog.evaluate((d) => d.open)));
      await page.waitForSelector('.toast');
      check('toast confirms creation', (await page.locator('.toast').textContent()).includes('Weekly sales'));
      await opener.click();
      await page.keyboard.press('Escape');
      check('Escape closes dialog and returns focus', !(await dialog.evaluate((d) => d.open)) && (await page.evaluate(() => document.activeElement.matches('[command="show-modal"][commandfor="report-dialog"]'))));

      /* SVG chart keyboard exploration */
      const area = page.locator('figure[data-viz="area"]');
      await area.locator('.chart__canvas svg').waitFor();
      const canvas = area.locator('.chart__canvas');
      check('chart plot is a focusable labelled group', (await canvas.getAttribute('role')) === 'group' && (await canvas.getAttribute('tabindex')) === '0');
      await canvas.focus();
      await page.keyboard.press('End');
      await page.waitForTimeout(50);
      const live = (await area.locator('[aria-live="polite"]').textContent()) || '';
      check('End announces the last data point', /Oct/.test(live) && /\$/.test(live), live);
      check('chart has a summary and data table', (await area.locator('details[data-chart-table] tbody tr').count()) === 12);
      const legend = area.locator('.chart__legend button').nth(1);
      await legend.click();
      check('legend button toggles series (aria-pressed)', (await legend.getAttribute('aria-pressed')) === 'false');
      await context.close();
    }

    /* ---- Sortable table + table chart (component gallery) ------------- */
    {
      const { page, context } = await openPage(browser, server.url, 'src/components/index.html', { width: 1280, height: 900 }, { permissions: ['clipboard-read', 'clipboard-write'] });
      const table = page.locator('table[data-sortable]').first();
      const amount = table.locator('th', { hasText: 'Amount' });
      await amount.locator('button').click();
      check('sort sets aria-sort ascending', (await amount.getAttribute('aria-sort')) === 'ascending');
      const values = await table.locator('tbody td.num').evaluateAll((tds) => tds.map((td) => Number(td.dataset.sortValue)));
      check('rows sorted by amount', values.every((v, i) => i === 0 || values[i - 1] <= v), values.join(','));
      await amount.locator('button').click();
      check('second click sorts descending', (await amount.getAttribute('aria-sort')) === 'descending');
      const bar = await page.locator('[data-chart] td[data-value]').first().evaluate((td) => td.style.getPropertyValue('--value'));
      check('table chart sets bar values', bar !== '');

      /* Copy path for AI / copy code */
      const copyPath = page.locator('#chart [data-copy][data-copy-text]').first();
      await copyPath.click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      check('"Copy path for AI" copies file paths', copied.includes('Markup: src/components/chart.html') && copied.includes('src/assets/js/components/chart.js'), copied.slice(0, 80));
      const copyCode = page.locator('#chart [data-copy][data-copy-target]').first();
      await copyCode.click();
      const code = await page.evaluate(() => navigator.clipboard.readText());
      check('"Copy code" copies the snippet markup', code.includes('data-viz=') && !code.includes('@component'), code.slice(0, 80));
      await context.close();
    }

    /* ---- Form validation & password toggle -------------------------- */
    {
      const { page, context } = await openPage(browser, server.url, 'src/templates/auth/register.html');
      await page.locator('button[type="submit"]').click();
      check('errors shown on empty submit', (await page.locator('#reg-first-name-error').textContent()).trim() === 'Enter your first name.');
      check('focus on first invalid field', await page.evaluate(() => document.activeElement.id === 'reg-first-name'));
      await page.fill('#reg-password', 'correct horse battery');
      await page.fill('#reg-password-confirm', 'something else');
      await page.locator('#reg-password-confirm').blur();
      check('confirm password mismatch reported', (await page.locator('#reg-password-confirm-error').textContent()).includes('do not match'));
      const toggle = page.locator('[data-password-toggle]');
      await toggle.click();
      check('password toggle reveals text', (await page.locator('#reg-password').getAttribute('type')) === 'text' && (await toggle.getAttribute('aria-pressed')) === 'true');
      await page.fill('#reg-first-name', 'Ada');
      await page.fill('#reg-last-name', 'Lovelace');
      await page.fill('#reg-email', 'ada@example.com');
      await page.fill('#reg-password-confirm', 'correct horse battery');
      await page.check('#reg-terms');
      await page.locator('button[type="submit"]').click();
      check('valid submit shows demo status', await page.locator('[data-form-status]').isVisible());
      check('password field reset to type=password on submit', (await page.locator('#reg-password').getAttribute('type')) === 'password');
      await context.close();
    }

    /* ---- E-commerce filters & theme toggle -------------------------- */
    {
      const { page, context } = await openPage(browser, server.url, 'src/templates/e-commerce/index.html');
      await page.check('input[name="category"][value="audio"]');
      check('category filter narrows results', (await page.locator('[data-results-count]').textContent()).includes('Showing 1 of 6'));
      await page.check('input[name="price"][value="250-"]');
      check('empty state shown when nothing matches', await page.locator('[data-empty-state]').isVisible());
      await page.locator('[data-empty-state] button').click();
      await page.waitForTimeout(50);
      check('reset restores all products', (await page.locator('[data-results-count]').textContent()).includes('Showing 6 of 6'));
      await page.selectOption('#sort', 'price-asc');
      const firstProduct = await page.locator('[data-product]:first-child .card__title').textContent();
      check('sort by price ascending', firstProduct.includes('Arc desk lamp'), firstProduct);
      await page.locator('[data-add-to-cart]').first().click();
      check('cart count updates', (await page.locator('[data-cart-count]').textContent()) === '1');

      const theme = page.locator('[data-theme-toggle]');
      const before = await theme.getAttribute('aria-pressed');
      await theme.click();
      const after = await theme.getAttribute('aria-pressed');
      const applied = await page.evaluate(() => document.documentElement.dataset.theme);
      check('theme toggle switches theme', before !== after && applied === (after === 'true' ? 'dark' : 'light'));
      await context.close();
    }

    /* ---- Product page → cart ---------------------------------------- */
    {
      const { page, context } = await openPage(browser, server.url, 'src/templates/e-commerce/product.html');
      await page.evaluate(() => localStorage.removeItem('vr-demo-cart'));
      await page.locator('[data-product-form] [data-step="1"]').click();
      check('quantity stepper increments', (await page.inputValue('#product-qty')) === '2');
      await page.locator('[data-product-form] button[type="submit"]').click();
      await page.waitForTimeout(50);
      check('add to cart updates the header count', (await page.locator('[data-cart-count]').first().textContent()).trim() === '2');
      await page.goto(`${server.url}/src/templates/e-commerce/cart.html`, { waitUntil: 'networkidle' });
      check('cart lists the added item', (await page.locator('[data-cart-items] .cart-item__name').count()) === 1);
      const subtotal = (await page.locator('[data-cart-subtotal]').textContent()).trim();
      check('cart subtotal = price × quantity', subtotal === '$358', subtotal);
      await page.fill('#promo-code', 'NOPE');
      await page.locator('[data-promo-form] button[type="submit"]').click();
      check('invalid promo code is reported', (await page.locator('#promo-code').getAttribute('aria-invalid')) === 'true');
      await page.fill('#promo-code', 'welcome10');
      await page.locator('[data-promo-form] button[type="submit"]').click();
      check('valid promo code applies a discount', (await page.locator('[data-cart-discount]').textContent()).includes('35.80'));
      await page.locator('[data-cart-items] button', { hasText: 'Remove' }).click();
      check('removing the last item shows the empty state', await page.locator('[data-cart-empty]').isVisible());
      await context.close();
    }

    /* ---- Data grid: search, filter, pagination ---------------------- */
    {
      const { page, context } = await openPage(browser, server.url, 'src/templates/dashboard/orders.html');
      const grid = page.locator('[data-grid]').first();
      const status = grid.locator('[data-grid-status]');
      await waitFor(page, () => /of 64 orders/.test(document.querySelector('[data-grid-status]').textContent));
      check('grid loads JSON data', /Showing 1–10 of 64 orders/.test(await status.textContent()), await status.textContent());
      await grid.locator('[data-grid-filter="status"]').selectOption('Refunded');
      await page.waitForTimeout(50);
      check('status filter narrows rows', (await grid.locator('tbody tr').count()) === 3 && /of 3 orders/.test(await status.textContent()), await status.textContent());
      await grid.locator('[data-grid-filter="status"]').selectOption('');
      await grid.locator('[data-grid-search]').fill('zzzz-no-match');
      await page.waitForTimeout(400);
      check('search with no match reports zero results', /No orders|0 orders/i.test(await status.textContent()), await status.textContent());
      await grid.locator('[data-grid-search]').fill('');
      await page.waitForTimeout(400);
      const next = grid.locator('[data-grid-pagination] button', { hasText: '2' });
      await next.click();
      check('pagination moves to page 2 (aria-current)', (await next.getAttribute('aria-current')) === 'page' && /11–20/.test(await status.textContent()));
      const header = grid.locator('th', { hasText: 'Total' });
      await header.locator('button').click();
      check('grid sorting sets aria-sort', ['ascending', 'descending'].includes(await header.getAttribute('aria-sort')));
      await context.close();
    }

    /* ---- Chat: send, stream, finish --------------------------------- */
    {
      const { page, context } = await openPage(browser, server.url, 'src/templates/ai/index.html');
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'networkidle' });
      const chat = page.locator('[data-chat]').first();
      const before = await chat.locator('.chat__message--assistant').count();
      await chat.locator('[data-chat-input]').fill('Write a debounce function in JavaScript');
      await page.keyboard.press('Enter');
      check('Enter sends the message', (await chat.locator('.chat__message--user').count()) >= 1);
      check('stop button shown while streaming', await chat.locator('[data-chat-stop]').isVisible());
      check('reply finishes streaming', await waitFor(page, () => document.querySelector('[data-chat-log]').getAttribute('aria-busy') === 'false', null, 15000));
      check('assistant reply rendered', (await chat.locator('.chat__message--assistant').count()) === before + 1);
      check('reply renders a code block safely', (await chat.locator('.chat__message--assistant pre code').count()) >= 1);
      check('focus stays usable after reply', await chat.locator('[data-chat-send]').isVisible());
      await context.close();
    }

    /* ---- Chat widget: open, Escape, focus return -------------------- */
    {
      const { page, context } = await openPage(browser, server.url, 'src/templates/website/index.html', { width: 375, height: 800 });
      const launcher = page.locator('[data-chat-launcher]');
      await launcher.click();
      check('widget opens (aria-expanded)', (await launcher.getAttribute('aria-expanded')) === 'true' && (await page.locator('#chat-widget-panel').isVisible()));
      check('focus moves into the widget composer', await page.evaluate(() => document.activeElement.matches('[data-chat-input]')));
      await page.keyboard.press('Escape');
      check('Escape closes widget and returns focus', !(await page.locator('#chat-widget-panel').isVisible()) && (await page.evaluate(() => document.activeElement.matches('[data-chat-launcher]'))));
      await context.close();
    }

    /* ---- Theme panel ------------------------------------------------- */
    {
      const { page, context } = await openPage(browser, server.url, 'src/templates/website/about.html');
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('[data-theme-panel-trigger]').click();
      check('theme panel opens', await page.locator('#theme-panel').evaluate((d) => d.open));
      await page.locator('#theme-panel input[name="brand"][value="teal"]').check();
      check('brand preset applied to <html>', (await page.evaluate(() => document.documentElement.dataset.brand)) === 'teal');
      await page.locator('#theme-panel input[name="density"][value="compact"]').check();
      check('density applied', (await page.evaluate(() => document.documentElement.dataset.density)) === 'compact');
      await page.locator('#theme-panel input[name="custom"]').evaluate((input) => {
        input.value = '#e11d48';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(50);
      const report = (await page.locator('[data-theme-contrast]').textContent()) || '';
      check('custom colour passes the live contrast report', report.includes('passes'), report);
      check('Copy CSS output contains the custom brand', (await page.inputValue('[data-theme-output]')).includes('--color-primary'));
      await page.keyboard.press('Escape');
      await page.goto(`${server.url}/src/templates/dashboard/index.html`, { waitUntil: 'networkidle' });
      check('settings persist across templates', (await page.evaluate(() => document.documentElement.dataset.density)) === 'compact');
      await context.close();
    }

    /* ---- Layout builder ---------------------------------------------- */
    {
      const { page, context } = await openPage(browser, server.url, 'src/layouts/index.html');
      await page.locator('input[name="layout"][value="holy-grail"]').check();
      check('choosing a layout updates the preview', await waitFor(page, () => document.querySelector('[data-builder-frame]').getAttribute('src').includes('holy-grail')));
      check('HTML output matches the chosen layout', await waitFor(page, () => document.querySelector('#builder-code-html').textContent.includes('data-layout="holy-grail"')));
      check('CLI command reflects the form', (await page.locator('#builder-code-cli').textContent()).includes('--layout holy-grail'));
      await page.locator('input[name="device"][value="mobile"]').check();
      check('device preview switches width', (await page.locator('[data-builder-viewport]').getAttribute('data-device')) === 'mobile');
      await context.close();
    }

    /* ---- No-JS baseline --------------------------------------------- */
    {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 800 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/src/templates/landing-page/index.html`);
      check('no-JS: navigation links visible on mobile', await page.locator('.site-nav a').first().isVisible());
      check('no-JS: JS-only toggle stays hidden', !(await page.locator('.site-header__toggle').isVisible()));
      await page.goto(`${server.url}/src/templates/dashboard/index.html`);
      check('no-JS: all tab panels readable', (await page.locator('.tabs__panel:visible').count()) === 3);
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length ? '✗ FAILED' : '✓ PASSED'}: ${results.length - failed.length}/${results.length} browser checks`);
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
