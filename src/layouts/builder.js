/**
 * Layout builder (src/layouts/index.html): choose a layout and page details,
 * preview the layout in an iframe at different widths and brand colours,
 * and generate the HTML, a pages.js CLI command and an AI agent prompt.
 *
 * Without JavaScript the page still lists every layout as a plain link.
 */
import { qs, qsa, on } from '../assets/js/core/dom.js';

const controls = qs('[data-layout-builder]');
const previewControls = qs('[data-builder-preview-controls]');
const codeTabs = qs('[data-builder-code]');
const frame = qs('[data-builder-frame]');
const viewport = qs('[data-builder-viewport]');
const openLink = qs('[data-builder-open]');
const pathChip = qs('[data-builder-path]');
const copyPath = qs('[data-builder-copy-path]');
const filename = qs('[data-builder-filename]');
const codeHtml = qs('#builder-code-html');
const codeCli = qs('#builder-code-cli');
const codeAi = qs('#builder-code-ai');

const FAMILY_DIRS = {
  website: 'src/templates/website',
  dashboard: 'src/templates/dashboard',
  'e-commerce': 'src/templates/e-commerce',
  auth: 'src/templates/auth',
  ai: 'src/templates/ai',
};

const sourceCache = new Map();

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'new-page';
}

function state() {
  const layout = qs('input[name="layout"]:checked', controls)?.value || 'stacked';
  const family = qs('select[name="family"]', controls).value;
  const title = qs('input[name="title"]', controls).value.trim() || 'New page';
  const name = slugify(qs('input[name="name"]', controls).value || title);
  const device = qs('input[name="device"]:checked', previewControls)?.value || 'desktop';
  const brand = qs('select[name="brand"]', previewControls).value;
  return { layout, family, title, name, device, brand };
}

async function layoutSource(layout) {
  if (!sourceCache.has(layout)) {
    const response = await fetch(`${layout}.html`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    sourceCache.set(layout, await response.text());
  }
  return sourceCache.get(layout);
}

function applyBrandToFrame(brand) {
  try {
    const root = frame.contentDocument?.documentElement;
    if (!root) return;
    if (brand === 'indigo') delete root.dataset.brand;
    else root.dataset.brand = brand;
  } catch {
    /* cross-origin frame: nothing to do */
  }
}

async function render() {
  const s = state();
  const layoutPath = `src/layouts/${s.layout}.html`;
  const targetPath = `${FAMILY_DIRS[s.family]}/${s.name}.html`;

  if (!frame.src.endsWith(`/${s.layout}.html`)) frame.src = `${s.layout}.html`;
  else applyBrandToFrame(s.brand);
  viewport.dataset.device = s.device;
  openLink.href = `${s.layout}.html`;
  pathChip.textContent = layoutPath;
  copyPath.dataset.copyText = layoutPath;
  filename.textContent = `${s.name}.html`;

  const safeTitle = s.title.replace(/["\\$`]/g, '');
  codeCli.textContent = `node .claude/skills/pages.js new --family ${s.family} --layout ${s.layout} --name ${s.name} --title "${safeTitle}"`;

  codeAi.textContent = [
    `Create a new page "${s.title}" at ${targetPath}.`,
    '',
    `- Start from the layout ${layoutPath} (run: ${codeCli.textContent}).`,
    `- Use the ${s.family} family partials from src/layouts/partials/ and keep them in sync with: node .claude/skills/pages.js sync`,
    '- Build the content from components in src/components/ (see catalog.json and docs/COMPONENTS.md); reuse existing CSS tokens and classes.',
    '- Link the page from the family navigation partial, then run node .claude/skills/generate-doc.js.',
    '- Follow CLAUDE.md: no dependencies, no inline scripts or styles, WCAG 2.2 AA.',
    '- Validate with bash .claude/skills/validate-w3c.sh and bash .claude/skills/audit-a11y.sh before finishing.',
  ].join('\n');

  try {
    let source = (await layoutSource(s.layout)).replace(/^\s*<!--[\s\S]*?-->\s*/, '');
    if (s.brand !== 'indigo') source = source.replace('<html lang="en">', `<html lang="en" data-brand="${s.brand}">`);
    codeHtml.textContent = source;
  } catch (error) {
    codeHtml.textContent = `Could not load ${layoutPath} (${error.message}). Serve the repository over HTTP to use the builder.`;
  }
}

if (controls && previewControls && frame) {
  controls.hidden = false;
  previewControls.hidden = false;
  codeTabs.hidden = false;

  on(controls, 'submit', (event) => event.preventDefault());
  on(controls, 'change', render);
  on(previewControls, 'change', render);

  // Keep the file name in step with the title until the user edits it.
  const titleInput = qs('input[name="title"]', controls);
  const nameInput = qs('input[name="name"]', controls);
  let nameEdited = false;
  on(nameInput, 'input', () => {
    nameEdited = true;
    render();
  });
  on(titleInput, 'input', () => {
    if (!nameEdited) nameInput.value = slugify(titleInput.value);
    render();
  });

  on(frame, 'load', () => applyBrandToFrame(state().brand));

  // Deep link: index.html?layout=docs
  const requested = new URLSearchParams(location.search).get('layout');
  const match = requested && qsa('input[name="layout"]', controls).find((input) => input.value === requested);
  if (match) match.checked = true;

  render();
}
