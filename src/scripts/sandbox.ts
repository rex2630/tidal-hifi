import { settings } from "../constants/settings";
import { settingsStore } from "./settingsStore";

/**
 * Whether Chromium's renderer sandbox should be turned off.
 *
 * Honours both the explicit `--no-sandbox` command-line switch and the
 * persisted `disableSandbox` flag (which also drives the `--no-sandbox`
 * Chromium switch). Tying the BrowserWindow `sandbox` preference to the same
 * control lets users who hit a blank window (broken /dev/shm, missing setuid
 * sandbox helper, etc.) recover by launching with `--no-sandbox` or toggling
 * the setting.
 */
export function isSandboxDisabled(): boolean {
  return (
    process.argv.includes("--no-sandbox") ||
    Boolean(settingsStore.get(settings.flags.disableSandbox))
  );
}
