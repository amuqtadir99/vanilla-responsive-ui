#!/usr/bin/env node
/**
 * Browser smoke tests (optional). Uses Playwright if it is installed
 * locally or globally; otherwise skips with exit code 0 so the repository
 * keeps its zero-dependency promise. Pass --require to fail instead.
 *
 *   node tests/browser/smoke.mjs
 *
 * Covers: no console errors or CSP violations, progressive enhancement
 * actually runs, no horizontal scroll at 320 CSS px (WCAG 1.4.10), and
 * keyboard behaviour of the interactive components.
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { startServer } from '../lib/server.mjs';

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

const PAGES = [
  'src/index.html',
  'src/components/index.html',
  'src/templates/landing-page/index.html',
  'src/templates/dashboard/index.html',
  'src/templates/e-commerce/index.html',
  'src/templates/auth/index.html',
  'src/templates/auth/register.html',
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
}

async function openPage(browser, base, file, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
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

      const toggleShown = await page.evaluate(() => {
        const t = document.querySelector('[data-theme-toggle]');
        return !t || !t.hidden;
      });
      check('JS enhancement ran (theme toggle revealed)', toggleShown);

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
      const opener = page.locator('button[command="show-modal"]');
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
      check('Escape closes dialog and returns focus', !(await dialog.evaluate((d) => d.open)) && (await page.evaluate(() => document.activeElement.getAttribute('command') === 'show-modal')));

      /* Sortable table */
      const amount = page.locator('#orders th', { hasText: 'Amount' });
      await amount.locator('button').click();
      check('sort sets aria-sort ascending', (await amount.getAttribute('aria-sort')) === 'ascending');
      const first = await page.locator('#orders tbody tr:first-child td.num').textContent();
      check('rows sorted by amount', first.trim() === '$64.00', first);
      await amount.locator('button').click();
      check('second click sorts descending', (await amount.getAttribute('aria-sort')) === 'descending');

      /* Chart */
      const value = await page.locator('[data-chart] td[data-value]').first().evaluate((td) => td.style.getPropertyValue('--value'));
      check('table chart sets bar values', value === '1');
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
