/**
 * Screen-reader announcements through a shared, visually hidden live region.
 * @module core/announce
 */

const regions = new Map();

function getRegion(politeness) {
  let region = regions.get(politeness);
  if (region && region.isConnected) return region;

  region = document.createElement('div');
  region.className = 'visually-hidden';
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  if (politeness === 'assertive') region.setAttribute('role', 'alert');
  document.body.append(region);
  regions.set(politeness, region);
  return region;
}

/**
 * Announce a message to assistive technology.
 * The live region is created up front and the text is inserted on the next
 * frame, which is what screen readers need to pick up the change reliably.
 *
 * @param {string} message - Plain text (assigned via textContent).
 * @param {'polite' | 'assertive'} [politeness='polite']
 */
export function announce(message, politeness = 'polite') {
  const region = getRegion(politeness);
  region.textContent = '';
  window.requestAnimationFrame(() => {
    region.textContent = message;
  });
}
