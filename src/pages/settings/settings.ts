function triggerInputEvent(element: HTMLElement) {
  const event = new Event("input", {
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
}

/**
 * Wires up a "skip list" UI: a textarea storing newline-separated values, an
 * input + button to add new entries, and a tag container rendering each entry
 * as a clickable pill that removes itself on click. Used by both the
 * skip-artists and skip-tracks settings sections.
 */
function setupSkipList(opts: { inputId: string; textareaId: string; tagsContainerId: string }) {
  const input = document.getElementById(opts.inputId) as HTMLInputElement | null;
  const textarea = document.getElementById(opts.textareaId) as HTMLTextAreaElement | null;
  const tagsContainer = document.getElementById(opts.tagsContainerId);

  const readValues = (): string[] =>
    (textarea?.value ?? "")
      .split("\n")
      .map((value) => value.trim())
      .filter((value) => value !== "");

  const writeValues = (values: string[]) => {
    if (!textarea) return;
    textarea.value = values.join("\n") + (values.length > 0 ? "\n" : "");
    triggerInputEvent(textarea);
  };

  const createTag = (value: string) => {
    const tag = document.createElement("div");
    tag.className = "tags__tag";
    tag.textContent = value;
    tag.title = `Remove ${value}`;
    tag.tabIndex = 0;

    tag.addEventListener("click", () => {
      writeValues(readValues().filter((existing) => existing !== value));
      render();
    });

    tag.addEventListener("keypress", (event: Event) => {
      const key = (event as KeyboardEvent).key;
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        tag.click();
      }
    });

    return tag;
  };

  const render = () => {
    if (!tagsContainer || !textarea) return;
    tagsContainer.innerHTML = "";
    for (const value of readValues()) {
      tagsContainer.appendChild(createTag(value));
    }
  };

  const add = () => {
    if (!input) return;
    const value = input.value.trim();
    if (value === "") return;
    input.value = "";

    const existing = readValues();
    if (existing.includes(value)) return;

    writeValues([...existing, value]);
    render();
  };

  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  });
  textarea?.addEventListener("input", () => render());
  setTimeout(render, 100);

  return { add };
}

const artistsSkipList = setupSkipList({
  inputId: "add-artist",
  textareaId: "skippedArtists",
  tagsContainerId: "artist-tags",
});

const tracksSkipList = setupSkipList({
  inputId: "add-track",
  textareaId: "skippedTracks",
  tagsContainerId: "track-tags",
});

// Exposed for the inline `onclick="skipArtist()"` / `onclick="skipTrack()"` handlers in settings.html.
type typedWindow = { skipArtist: () => void; skipTrack: () => void };
(window as unknown as typedWindow).skipArtist = () => artistsSkipList.add();
(window as unknown as typedWindow).skipTrack = () => tracksSkipList.add();
