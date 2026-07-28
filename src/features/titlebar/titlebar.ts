import { readFileSync } from "node:fs";
import path from "node:path";
import type { WebContents } from "electron";

import { Logger } from "../logger";

/**
 * Read titlebar.css from disk once and cache it. The stylesheet is produced by
 * the `sass` build step (see package.json) directly into
 * `ts-dist/features/titlebar/`, right next to this compiled module.
 */
let cachedCss: string | null = null;
const getTitlebarCss = (): string => {
  cachedCss ??= readFileSync(path.join(__dirname, "titlebar.css"), "utf-8");
  return cachedCss;
};

/**
 * Track the inserted-CSS key per webContents so repeated injections (each
 * `did-finish-load` — OAuth redirects, hard reloads, …) replace rather than
 * stack stylesheets, mirroring the theming injector.
 */
const insertedCssKey = new WeakMap<WebContents, string>();

/**
 * Serialise injections per webContents. `did-finish-load` can fire again before
 * a previous (async) injection settles; without this, two overlapping runs read
 * the same previous key, both insert, and one stylesheet leaks.
 */
const injectionChain = new WeakMap<WebContents, Promise<void>>();

/**
 * Inject the custom titlebar stylesheet via Chromium-level `insertCSS`, so it
 * survives SPA DOM replacement. The titlebar element itself is built in the
 * preload (see titlebarView.ts) — no `executeJavaScript` needed. Attach this to
 * `did-finish-load`, exactly like the theme injector.
 */
export const injectTitlebarStyles = (webContents: WebContents): Promise<void> => {
  const run = async (): Promise<void> => {
    try {
      const previousKey = insertedCssKey.get(webContents);
      if (previousKey) {
        try {
          await webContents.removeInsertedCSS(previousKey);
        } catch {
          Logger.log("stylesheet already cleaned, nothing to do...");
        }
      }
      insertedCssKey.set(webContents, await webContents.insertCSS(getTitlebarCss()));
    } catch (error) {
      Logger.log("Failed to inject custom titlebar styles", { error });
    }
  };

  // Chain onto any in-flight injection so runs never overlap (run on both
  // fulfillment and rejection so a single failure can't wedge the chain).
  const next = (injectionChain.get(webContents) ?? Promise.resolve()).then(run, run);
  injectionChain.set(webContents, next);
  return next;
};
