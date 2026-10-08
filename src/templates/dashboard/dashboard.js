/**
 * Dashboard template behaviour: confirm report creation.
 * The dialog's <form method="dialog"> closes it natively on a valid submit
 * and sets dialog.returnValue to the submit button's value.
 */
import { showToast } from '../../assets/js/components/toast.js';

const dialog = document.getElementById('report-dialog');

if (dialog instanceof HTMLDialogElement) {
  const form = dialog.querySelector('form');

  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'create' && form) {
      const name = new FormData(form).get('name');
      showToast(`Report “${name}” created.`, { variant: 'success' });
      form.reset();
      delete form.dataset.submitted;
    }
    dialog.returnValue = '';
  });
}
