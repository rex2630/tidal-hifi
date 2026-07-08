import { UI_SELECTORS } from "./constants";

/**
 * Get an element from the dom
 * @param key of the object selector
 */
export function getElement(key: keyof typeof UI_SELECTORS): HTMLElement | null {
  return globalThis.document.querySelector(UI_SELECTORS[key]);
}

/**
 * Get the media element that is currently the active playback buffer.
 *
 * TIDAL double-buffers audio across multiple `<video>` elements (`video-one`, `video-two`, …)
 * and alternates between them for gapless/crossfade transitions, so the active element is not
 * always the same id. Reading a hardcoded `#video-one` therefore returns a dead buffer
 * (`duration = NaN`, `currentTime = 0`, `volume = 0`) whenever playback has moved to another
 * element — which is what breaks timestamps, seek position and volume. Instead pick the element
 * that is actually playing, falling back to any element that has loaded a real duration, then
 * to the legacy `player` selector.
 */
export function getActivePlayer(): HTMLMediaElement | null {
  const players = Array.from(
    globalThis.document.querySelectorAll<HTMLMediaElement>("video, audio"),
  );
  return (
    players.find((p) => !p.paused && Number.isFinite(p.duration) && p.duration > 0) ??
    players.find((p) => Number.isFinite(p.duration) && p.duration > 0) ??
    (getElement("player") as HTMLMediaElement | null)
  );
}

/**
 * Shorthand function to get the text of a dom element
 * @param key of the object selector
 */
export function getElementText(key: keyof typeof UI_SELECTORS): string {
  const element = getElement(key);
  return element ? element.textContent : "";
}

/**
 * Shorthand function to get the attribute of a dom element
 * @param key of the object selector
 * @param attribute name of the attribute
 */
export function getElementAttribute(
  key: keyof typeof UI_SELECTORS,
  attribute: string,
): string | null {
  const element = getElement(key);
  return element ? element.getAttribute(attribute) : null;
}

/**
 * Shorthand function to click a dom element
 * @param key of the object selector
 */
export function clickElement(key: keyof typeof UI_SELECTORS): void {
  getElement(key)?.click();
}

/**
 * Shorthand function to focus a dom element
 * @param key of the object selector
 */
export function focusElement(key: keyof typeof UI_SELECTORS): void {
  getElement(key)?.focus();
}
