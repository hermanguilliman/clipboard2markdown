# clipboard2markdown

Static single-page app. No build, no test runner, no package manager.

## Commands

There are none — this is pure HTML/JS/CSS with zero tooling.

## Development

Open `index.html` in any browser. Hit `Ctrl/Cmd+V` to paste rich text. The
`?cleanup=no` query param disables Google Docs workarounds.

## Architecture

- **entrypoint**: `index.html` (Russian locale). Loads `<head>` scripts
  `js/turndown-7.1.1.js` and `js/turndown-plugin-gfm-1.0.2.js`, then
  `js/app.js` at end of `<body>`.
- **core logic**: `js/app.js` — wraps everything in an IIFE, uses TurndownService
  with GFM plugin. Important query param: `?cleanup=no` toggles Google Docs
  list/nesting fixes and redirect-link unwrapping.
- **Turndown config** (app.js:49-62): `headingStyle`, `bulletListMarker`,
  `codeBlockStyle`, `emDelimiter`, `strongDelimiter` — all configurable via
  settings panel and persisted to `localStorage`.
- **Input**: hidden `contenteditable` div for paste interception + drag-and-drop
  an `.html` file onto the drop zone.
- **Output**: auto-selected `<textarea>` with a **Copy button** (`navigator.clipboard.writeText`).

## Settings

Turndown options exposed via `<details>` panel: heading style (ATX/Setext),
bullet marker (`-`/`*`/`+`), italic and bold delimiters, code block style.
Changes recreate the TurndownService on the fly. Persisted under
`localStorage` key `clipboard2markdown-settings`.

## Theme

Dracula-inspired dark theme + light theme variant. Toggle via fixed button
(top-right). Persisted under `localStorage` key `clipboard2markdown-theme`.

## Notable quirks

- README says it uses `to-markdown`; **the bundled library is Turndown** (v7.1.1).
- Cleanup mode enables special handling for: Google Docs misnested lists, Google
  redirect URLs, footnote formatting, and excess blank lines between list items.
- Deployment: GitHub Pages with custom domain (`CNAME` → `md.guilliman.ru`).
- Error handling wraps `convert()` in try/catch — shows error message in textarea.
- Paste uses `requestAnimationFrame` instead of old `setTimeout(250)`.
- Console.log removed from production code.
