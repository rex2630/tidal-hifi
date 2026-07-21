import hotkeyjs, { type HotkeysEvent } from "hotkeys-js";

export const addHotkey = (
  keys: string,
  func: (event?: KeyboardEvent, args?: HotkeysEvent) => void,
) => {
  hotkeyjs(keys, (event, args) => {
    event.preventDefault();
    func(event, args);
  });
};

/**
 * Unbind every hotkey previously registered via {@link addHotkey}. Used to
 * re-register hotkeys after the configuration changes so updates apply without
 * a restart.
 */
export const removeHotkeys = () => {
  hotkeyjs.unbind();
};
