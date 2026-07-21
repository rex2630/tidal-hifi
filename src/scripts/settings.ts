import path from "node:path";
import { app, BrowserWindow, shell } from "electron";

import { settings } from "../constants/settings";
import { injectThemeCss, injectThemeCssIfChanged } from "../features/theming/theming";
import { isSandboxDisabled } from "./sandbox";
import { settingsStore } from "./settingsStore";

let settingsWindow: BrowserWindow | null;

const log = (msg: string) => {
  try {
    console.log(msg);
  } catch {
    // ignore for now since console.log is all we support
  }
};

export { settingsStore };

export const createSettingsWindow = () => {
  settingsWindow = new BrowserWindow({
    width: 650,
    height: 700,
    resizable: true,
    show: false,
    transparent: true,
    frame: false,
    title: "TIDAL Hi-Fi settings",
    webPreferences: {
      preload: path.join(__dirname, "../pages/settings/preload.js"),
      plugins: true,
      // The settings preload is esbuild-bundled (see the bundle-settings-preload
      // script), so it can run sandboxed. The sandbox follows the same
      // --no-sandbox / disableSandbox control as the main window.
      sandbox: !isSandboxDisabled(),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  settingsWindow.on("close", (event: Electron.Event) => {
    if (settingsWindow != null) {
      event.preventDefault();
      settingsWindow.hide();
    }
  });

  settingsWindow.loadURL(`file://${__dirname}/../pages/settings/settings.html`);

  settingsWindow.webContents.on("did-finish-load", () => {
    if (settingsWindow) injectThemeCss(app, settingsWindow.webContents);
  });

  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
};

export const showSettingsWindow = (tab = "general") => {
  if (!settingsWindow) {
    log("Settings window is not initialized. Attempting to create it.");
    createSettingsWindow();
  }
  settingsWindow?.webContents.send("goToTab", tab);

  // refresh data just before showing the window
  settingsWindow?.webContents.send("refreshData");
  settingsWindow?.show();
};
export const hideSettingsWindow = () => {
  settingsWindow?.hide();
};

export const closeSettingsWindow = () => {
  settingsWindow = null;
};

/**
 * Re-inject the theme/custom CSS into the settings window when it has actually
 * changed, so theme changes preview live without flickering on unrelated
 * setting updates.
 */
export const refreshSettingsWindowTheme = () => {
  if (settingsWindow) {
    injectThemeCssIfChanged(app, settingsWindow.webContents);
  }
};

/**
 * add artists to the list of skipped artists
 * @param artists list of artists to append
 */
export const addSkippedArtists = (artists: string[]) => {
  const { skippedArtists } = settings;
  const previousStoreValue = settingsStore.get<string, string[]>(skippedArtists);
  settingsStore.set(skippedArtists, Array.from(new Set([...previousStoreValue, ...artists])));
};

/**
 * Remove artists from the list of skipped artists
 * @param artists list of artists to remove
 */
export const removeSkippedArtists = (artists: string[]) => {
  const { skippedArtists } = settings;
  const previousStoreValue = settingsStore.get<string, string[]>(skippedArtists);
  const filteredArtists = previousStoreValue.filter((value) => ![...artists].includes(value));

  settingsStore.set(skippedArtists, filteredArtists);
};

/**
 * Add track keywords to the list of skipped tracks. Each entry is matched
 * against track titles using case-insensitive substring matching, so e.g.
 * "live" will skip any track whose title contains "live" / "Live" / "LIVE".
 * @param tracks list of track keywords to append
 */
export const addSkippedTracks = (tracks: string[]) => {
  const { skippedTracks } = settings;
  const previousStoreValue = settingsStore.get<string, string[]>(skippedTracks);
  settingsStore.set(skippedTracks, Array.from(new Set([...previousStoreValue, ...tracks])));
};

/**
 * Remove track keywords from the list of skipped tracks
 * @param tracks list of track keywords to remove
 */
export const removeSkippedTracks = (tracks: string[]) => {
  const { skippedTracks } = settings;
  const previousStoreValue = settingsStore.get<string, string[]>(skippedTracks);
  const filteredTracks = previousStoreValue.filter((value) => ![...tracks].includes(value));

  settingsStore.set(skippedTracks, filteredTracks);
};
