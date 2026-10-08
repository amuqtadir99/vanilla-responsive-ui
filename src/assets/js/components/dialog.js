/**
 * Dialog — enhancements for the native <dialog> element.
 *
 * Markup uses HTML Invoker Commands, so modern browsers open and close the
 * dialog with no JavaScript at all:
 *
 *   <button type="button" commandfor="report-dialog" command="show-modal">New report</button>
 *   <dialog id="report-dialog" class="dialog" aria-labelledby="report-dialog-title" closedby="any">
 *     <h2 id="report-dialog-title">…</h2>
 *     <button type="button" commandfor="report-dialog" command="close">Cancel</button>
 *   </dialog>
 *
 * This module polyfills, only where missing:
 *   - `commandfor` / `command` (show-modal, close, request-close)
 *   - `closedby="any"` (light dismiss: click on the backdrop closes)
 *
 * Focus containment, Escape-to-close, inert background and focus return are
 * provided natively by showModal().
 *
 * @module components/dialog
 */
import { qsa, on, claim } from '../core/dom.js';

const supportsInvokers =
  typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype;
const supportsClosedBy =
  typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;

/**
 * Open a dialog as modal.
 * @param {HTMLDialogElement} dialog
 */
export function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}

/**
 * Close a dialog.
 * @param {HTMLDialogElement} dialog
 * @param {string} [returnValue]
 */
export function closeDialog(dialog, returnValue) {
  if (dialog.open) dialog.close(returnValue);
}

function handleCommand(button) {
  const dialog = document.getElementById(button.getAttribute('commandfor') || '');
  if (!(dialog instanceof HTMLDialogElement)) return;

  const command = button.getAttribute('command');
  if (command === 'show-modal') openDialog(dialog);
  else if (command === 'close') closeDialog(dialog, button.value);
  else if (command === 'request-close') {
    if (typeof dialog.requestClose === 'function') dialog.requestClose(button.value);
    else closeDialog(dialog, button.value);
  }
}

let documentBound = false;

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  if (!supportsInvokers && !documentBound) {
    documentBound = true;
    // One delegated listener covers buttons added later, too.
    on(document, 'click', (event) => {
      const button = /** @type {Element} */ (event.target).closest('button[commandfor]');
      if (button && !button.disabled) handleCommand(button);
    });
  }

  if (supportsClosedBy) return;

  for (const dialog of qsa('dialog[closedby="any"]', root)) {
    if (!claim(dialog, 'dialog')) continue;

    on(dialog, 'click', (event) => {
      // Clicks on the ::backdrop are dispatched to the <dialog> itself with
      // coordinates outside its box.
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) closeDialog(dialog);
    });
  }
}
