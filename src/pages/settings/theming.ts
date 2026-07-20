export const cssFilter = (file: string) => file.endsWith(".css");

/**
 * Create an "options header" (disabled option) based on a bit of text
 * @param text of the header
 * @returns
 */
export const getOptionsHeader = (text: string): HTMLOptionElement => {
  const opt = new Option(text, undefined, false, false);
  opt.disabled = true;
  return opt;
};

/**
 * Maps a list of filenames to a list of HTMLOptionElements
 * Will strip ".css" from the name but keeps it in the value
 * @param array array of filenames
 * @param source optional prefix to prepend to the value (e.g. "builtin" or "user")
 * @returns
 */
export const getOptions = (array: string[], source?: "builtin" | "user") => {
  return array.map((name) => {
    const value = source ? `${source}:${name}` : name;
    return new Option(name.replace(".css", ""), value);
  });
};
