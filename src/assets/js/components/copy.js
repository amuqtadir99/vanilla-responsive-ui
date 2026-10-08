/**
 * Copy-to-clipboard buttons.
 *
 * Markup:
 *   <button type="button" class="btn btn--sm" data-copy data-copy-target="#code-tabs" hidden>
 *     <span data-copy-label>Copy code</span>
 *   </button>
 *   <pre id="code-tabs"><code>…</code></pre>
 *
 *   <button type="button" data-copy data-copy-text="src/components/tabs.html" hidden>Copy path</button>
 *
 * The button ships `hidden` because it needs JavaScript. After copying, the
 * visible label briefly reads "Copied" and the result is announced.
 *
 * @module components/copy
 */
import { qs, qsa, on, claim } from '../core/dom.js';
import { copyText } from '../core/clipboard.js';
import { announce } from '../core/announce.js';

function textFor(button) {
  if (button.dataset.copyText !== undefined) return button.dataset.copyText;
  const target = button.dataset.copyTarget ? qs(button.dataset.copyTarget) : null;
  if (!target) return '';
  return 'value' in target && typeof target.value === 'string' ? target.value : target.textContent;
}

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const button of qsa('[data-copy]', root)) {
    if (!claim(button, 'copy')) continue;
    button.hidden = false;
    const label = qs('[data-copy-label]', button) || button;
    const original = label.textContent;
    let timer = 0;

    on(button, 'click', async () => {
      const ok = await copyText(textFor(button));
      const message = ok ? button.dataset.copySuccess || 'Copied' : 'Copy failed';
      label.textContent = message;
      announce(ok ? `${message} to clipboard.` : 'Copy failed. Select the text and copy it manually.');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        label.textContent = original;
      }, 2000);
    });
  }
}
