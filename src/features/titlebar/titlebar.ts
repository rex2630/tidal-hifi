import { WebContents } from "electron";

const TITLEBAR_HEIGHT = 36;

export const injectTitlebar = (
  webContents: WebContents,
  transparent = false
) => {
  const titlebarBg = transparent
  ? "linear-gradient(to bottom, rgba(32,38,44,.82), rgba(32,38,44,.58))"
  : "rgb(20, 24, 28)";
  const backdropFilter = transparent ? "blur(10px)" : "none";

  webContents.insertCSS(`
  :root {
    color-scheme: dark;
    --bar-height: ${TITLEBAR_HEIGHT}px;
    --fg: rgba(255,255,255,.85);
    --fg-muted: rgba(255,255,255,.55);
    --bg: rgba(20,24,28,.72);
    --border: rgba(255,255,255,.08);
    --hover: rgba(255,255,255,.12);
    --close: rgba(255,66,66,.82);
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    background: transparent !important;
    font-family: Inter, system-ui, sans-serif;
  }

  body {
    padding-top: var(--bar-height) !important;
  }

  #titlebar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--bar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 10px;
  background: ${titlebarBg};
  backdrop-filter: ${backdropFilter};
  -webkit-backdrop-filter: ${backdropFilter};
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
  user-select: none;
  z-index: 99999;
  }

  #brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: var(--fg);
  }

  #brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #00ffff;
  box-shadow: 0 0 14px rgba(0,255,255,.35);
  }

  #brand-text {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .02em;
  white-space: nowrap;
  }

  #drag-space {
  flex: 1 1 auto;
  min-width: 24px;
  }

  #controls {
  display: flex;
  align-items: center;
  gap: 6px;
  -webkit-app-region: no-drag;
  }

  .btn {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--fg-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background .12s ease, color .12s ease, transform .08s ease;
    padding: 0;
    margin: 0;
    outline: none;
  }

  .btn:hover {
    background: var(--hover);
    color: var(--fg);
  }

  .btn:active {
    transform: scale(.92);
  }

  .btn.close:hover {
    background: var(--close);
    color: white;
  }

  .btn svg {
    width: 12px;
    height: 12px;
    pointer-events: none;
    flex: 0 0 auto;
  }
  `);

  void webContents.executeJavaScript(`
  (() => {
    if (document.getElementById("titlebar")) return;

    const bar = document.createElement("div");
    bar.id = "titlebar";
    bar.innerHTML = \`
    <div id="brand">
    <div id="brand-dot"></div>
    <div id="brand-text">TIDAL Hi-Fi</div>
    </div>
    <div id="drag-space"></div>
    <div id="controls">
    <button class="btn" id="minimize" aria-label="Minimize" title="Minimize">
    <svg viewBox="0 0 12 12" fill="none">
    <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></line>
    </svg>
    </button>
    <button class="btn" id="maximize" aria-label="Maximize" title="Maximize">
    <svg viewBox="0 0 12 12" fill="none">
    <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"></rect>
    </svg>
    </button>
    <button class="btn close" id="close" aria-label="Close" title="Close">
    <svg viewBox="0 0 12 12" fill="none">
    <line x1="1.5" y1="1.5" x2="10.5" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></line>
    <line x1="10.5" y1="1.5" x2="1.5" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></line>
    </svg>
    </button>
    </div>
    \`;

    const send = (channel) => window.electron?.ipcRenderer?.send?.(channel);

    bar.querySelector("#minimize")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      send("window-minimize");
    });

    bar.querySelector("#maximize")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      send("window-maximize-toggle");
    });

    bar.querySelector("#close")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      send("window-close");
    });

    document.body.appendChild(bar);
  })();
  `);
};
