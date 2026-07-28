import { ipcRenderer } from "electron";

import { globalEvents } from "../../constants/globalEvents";
import { Logger } from "../logger";

const BAR_ID = "tidal-hifi-titlebar";
let titlebarObserver: MutationObserver | null = null;
// The maximize/restore button of the currently mounted bar, so its icon can be
// swapped when the window is (un)maximized. Refreshed on every (re)mount.
let maximizeButton: HTMLButtonElement | null = null;
let maximizeStateListenerAttached = false;

const svgIcon = (paths: string): string =>
  `<svg viewBox="0 0 12 12" fill="none" aria-hidden="true">${paths}</svg>`;

const ICONS = {
  minimize: svgIcon(
    '<line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  ),
  maximize: svgIcon(
    '<rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/>',
  ),
  restore: svgIcon(
    '<rect x="2" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M4 4V3a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
  ),
  close: svgIcon(
    '<line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
      '<line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  ),
};

const createButton = (
  label: string,
  icon: string,
  channel: string,
  extraClass = "",
): HTMLButtonElement => {
  const button = document.createElement("button");
  button.className = extraClass ? `thf-btn ${extraClass}` : "thf-btn";
  button.title = label;
  button.setAttribute("aria-label", label);
  // `icon` is always a trusted, static SVG constant from ICONS above (no user
  // input), so assigning it via innerHTML is safe.
  button.innerHTML = icon;
  button.addEventListener("click", () => ipcRenderer.send(channel));
  return button;
};

// Reflect the window's maximized state on the maximize/restore button.
const applyMaximizeState = (isMaximized: boolean): void => {
  if (!maximizeButton) return;
  const label = isMaximized ? "Restore" : "Maximize";
  maximizeButton.innerHTML = isMaximized ? ICONS.restore : ICONS.maximize;
  maximizeButton.title = label;
  maximizeButton.setAttribute("aria-label", label);
};

const build = (): HTMLElement => {
  const bar = document.createElement("div");
  bar.id = BAR_ID;

  const isMac = process.platform === "darwin";
  if (isMac) {
    bar.classList.add("thf-macos");
  }

  const title = document.createElement("span");
  title.className = "thf-title";
  title.textContent = "TIDAL Hi-Fi";

  const controls = document.createElement("div");
  if (!isMac) {
    controls.className = "thf-controls";
    maximizeButton = createButton("Maximize", ICONS.maximize, globalEvents.titlebarMaximizeToggle);
    controls.append(
      createButton("Minimize", ICONS.minimize, globalEvents.titlebarMinimize),
      maximizeButton,
      createButton("Close", ICONS.close, globalEvents.titlebarClose, "thf-close"),
    );
    bar.append(title, controls);
    // Reflect the current window state on (re)mount; the main process pushes
    // later changes via `titlebarMaximizeChanged`.
    ipcRenderer
      .invoke(globalEvents.titlebarGetMaximized)
      .then((isMaximized) => applyMaximizeState(Boolean(isMaximized)))
      .catch(() => {
        Logger.log("window may be gone already");
      });
  } else {
    bar.append(title);
  }

  // Double-clicking the drag area toggles maximize, matching native titlebars.
  bar.addEventListener("dblclick", (event) => {
    if (event.target instanceof Element && event.target.closest(".thf-controls")) return;
    if (!isMac) {
      ipcRenderer.send(globalEvents.titlebarMaximizeToggle);
    }
  });

  return bar;
};

const mount = (): void => {
  if (!document.body || document.getElementById(BAR_ID)) return;
  document.body.prepend(build());
};

/**
 * Build and mount the custom titlebar into the current page, re-mounting it if
 * Tidal's SPA hydration strips it out.
 *
 * This runs entirely in the preload's isolated world: the buttons call
 * `ipcRenderer` directly, so nothing is exposed to page scripts and there is no
 * `executeJavaScript` string evaluation. Styling is applied separately from the
 * main process (see titlebar.ts) so it survives DOM replacement.
 */
export const mountCustomTitlebar = (): void => {
  // Keep the maximize/restore icon in sync with the window (registered once).
  if (!maximizeStateListenerAttached) {
    ipcRenderer.on(globalEvents.titlebarMaximizeChanged, (_event, isMaximized: boolean) => {
      applyMaximizeState(Boolean(isMaximized));
    });
    maximizeStateListenerAttached = true;
  }

  const start = () => {
    mount();
    // Tidal is a React SPA that re-renders <body>; re-mount if it's stripped out.
    if (!titlebarObserver && document.body) {
      titlebarObserver = new MutationObserver(() => {
        mount();
      });
      titlebarObserver.observe(document.body, { childList: true });
    }
  };

  if (document.body) {
    start();
  } else {
    window.addEventListener("DOMContentLoaded", start, { once: true });
  }
};
