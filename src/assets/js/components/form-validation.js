/**
 * Accessible client-side form validation on top of the native Constraint
 * Validation API. Without JavaScript the browser's built-in validation still
 * runs, and the server must always re-validate.
 *
 * Markup:
 *   <form data-validate novalidate?> (novalidate is added by this script)
 *     <div class="field">
 *       <label for="email">Email</label>
 *       <input id="email" type="email" required aria-describedby="email-error"
 *              data-error-required="Enter your email address.">
 *       <p class="field__error" id="email-error"></p>
 *     </div>
 *   </form>
 *
 * Custom messages: data-error-required | data-error-type | data-error-pattern
 *   | data-error-minlength | data-error-match
 * Matching fields: data-match="password" (id of the field to match)
 * Demo forms: data-demo-submit="Message" prevents the real submit on success
 *   and writes the message into [data-form-status] (remove for production).
 *
 * @module components/form-validation
 */
import { qs, qsa, on, claim } from '../core/dom.js';
import { announce } from '../core/announce.js';

function labelText(field) {
  const label = field.labels && field.labels[0];
  const raw = label ? label.textContent : field.getAttribute('aria-label') || 'This field';
  return raw.replace(/\*|\(required\)|\(optional\)/gi, '').trim();
}

function errorElementFor(field) {
  const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && el.classList.contains('field__error')) return el;
  }
  const wrapper = field.closest('.field, .fieldset');
  return wrapper ? qs('.field__error', wrapper) : null;
}

function messageFor(field) {
  const v = field.validity;
  const d = field.dataset;
  const name = labelText(field);

  if (v.valueMissing) {
    if (d.errorRequired) return d.errorRequired;
    if (field.type === 'checkbox') return `Check "${name}" to continue.`;
    if (field.type === 'radio') return `Choose an option for ${name}.`;
    if (field.tagName === 'SELECT') return `Select ${name.toLowerCase()}.`;
    return `Enter ${name.toLowerCase()}.`;
  }
  if (v.typeMismatch) {
    if (d.errorType) return d.errorType;
    if (field.type === 'email') return 'Enter an email address in the format name@example.com.';
    if (field.type === 'url') return 'Enter a web address starting with https://.';
    return `Enter a valid ${name.toLowerCase()}.`;
  }
  if (v.tooShort) return d.errorMinlength || `${name} must be at least ${field.minLength} characters.`;
  if (v.tooLong) return `${name} must be ${field.maxLength} characters or fewer.`;
  if (v.patternMismatch) return d.errorPattern || `${name} is not in the expected format.`;
  if (v.rangeUnderflow) return `${name} must be ${field.min} or more.`;
  if (v.rangeOverflow) return `${name} must be ${field.max} or less.`;
  if (v.stepMismatch) return `Enter a valid value for ${name.toLowerCase()}.`;
  if (v.badInput) return `Enter a valid value for ${name.toLowerCase()}.`;
  if (v.customError) return field.validationMessage;
  return '';
}

/**
 * Validate one field, update its ARIA state and error text.
 * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} field
 * @returns {boolean} whether the field is valid
 */
export function validateField(field) {
  if (field.dataset.match) {
    const other = document.getElementById(field.dataset.match);
    const mismatch = other && field.value !== '' && field.value !== other.value;
    field.setCustomValidity(
      mismatch ? field.dataset.errorMatch || `${labelText(field)} does not match.` : ''
    );
  }

  const valid = field.checkValidity();
  const error = errorElementFor(field);

  if (valid) {
    field.removeAttribute('aria-invalid');
    if (error) error.textContent = '';
  } else {
    field.setAttribute('aria-invalid', 'true');
    if (error) error.textContent = messageFor(field);
  }
  return valid;
}

function validatableFields(form) {
  return Array.from(form.elements).filter(
    (el) => el.willValidate && !['submit', 'reset', 'button'].includes(el.type)
  );
}

/**
 * @param {ParentNode} [root=document]
 */
export function init(root = document) {
  for (const form of qsa('form[data-validate]', root)) {
    if (!claim(form, 'validate')) continue;

    form.noValidate = true;
    const status = qs('[data-form-status]', form);

    // Validate on blur only once the user has typed something (or after a
    // submit attempt), so errors never appear before the user had a chance.
    on(form, 'focusout', (event) => {
      const field = event.target;
      if (!field.willValidate) return;
      if (form.dataset.submitted === 'true' || field.value !== '') validateField(field);
    });

    // Clear errors as soon as the input becomes valid.
    on(form, 'input', (event) => {
      const field = event.target;
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      // Re-check a dependent "confirm" field when its source changes.
      for (const dependent of qsa(`[data-match="${field.id}"]`, form)) {
        if (dependent.value !== '') validateField(dependent);
      }
    });

    on(form, 'change', (event) => {
      const field = event.target;
      if (field.type === 'checkbox' || field.type === 'radio' || field.tagName === 'SELECT') {
        if (form.dataset.submitted === 'true') validateField(field);
      }
    });

    on(form, 'submit', (event) => {
      form.dataset.submitted = 'true';
      const invalid = validatableFields(form).filter((field) => !validateField(field));

      if (invalid.length > 0) {
        event.preventDefault();
        invalid[0].focus();
        announce(
          invalid.length === 1
            ? 'There is 1 error in the form.'
            : `There are ${invalid.length} errors in the form.`,
          'assertive'
        );
        return;
      }

      if (form.dataset.demoSubmit !== undefined) {
        event.preventDefault();
        const message = form.dataset.demoSubmit || 'Submitted successfully.';
        if (status) {
          status.textContent = message;
          status.hidden = false;
        }
        announce(message);
      }
    });
  }
}
