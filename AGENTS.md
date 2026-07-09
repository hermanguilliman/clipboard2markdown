# clipboard2markdown

Static single-page app. No test runner, no type checker.

**Design system:** Nothing-Inspired (Doto + Space Grotesk + Space Mono, monochrome tokens, dot-grid background).

## Commands

```sh
npm install         # install turndown + gfm plugin + esbuild
npm run build       # bundle app.js + deps → dist/app.js (minified)
npm run dev         # same, but with sourcemaps + watch mode + http://localhost:3000
npm run deploy      # clean + build + copy all static assets to dist/ (gh-pages ready)
npm run clean       # remove dist/
```

`dist/` is gitignored, except `dist/app.js` is committed so GitHub Pages from
`master` branch root can serve it. Always run `npm run build` after changing JS.

## Development

Open `index.html` in any browser. Hit `Ctrl/Cmd+V` to paste rich text. The
`?cleanup=no` query param disables Google Docs workarounds.

## Architecture

- **entrypoint**: `index.html` (Russian locale). Loads Google Fonts (Doto, Space
  Grotesk, Space Mono) in `<head>`, then `dist/app.js` at end of `<body>`.
- **core logic**: `js/app.js` — ES module bundled via esbuild with TurndownService
  + GFM plugin. Important query param: `?cleanup=no` toggles Google Docs
  list/nesting fixes and redirect-link unwrapping.
- **Turndown config** (app.js:49-62): `headingStyle`, `bulletListMarker`,
  `codeBlockStyle`, `emDelimiter`, `strongDelimiter` — all configurable via
  settings panel and persisted to `localStorage`.
- **Input**: hidden `contenteditable` div for paste interception + drag-and-drop
  an `.html` file onto the drop zone.
- **Output**: `<textarea class="nd-output">` with a primary pill **Copy button** (`navigator.clipboard.writeText`).

## Settings

Turndown options exposed via `<details class="nd-settings">` panel: heading style
(ATX/Setext), bullet marker (`-`/`*`/`+`), italic and bold delimiters, code block
style. Changes recreate the TurndownService on the fly. Persisted under
`localStorage` key `clipboard2markdown-settings`.

## Theme

Nothing monochrome dark/light. Toggle via ghost button (header right). Persisted
under `localStorage` key `clipboard2markdown-theme`.

## Notable quirks

- README says it uses `to-markdown`; **the bundled library is Turndown** (v7.1.1).
- Cleanup mode enables special handling for: Google Docs misnested lists, Google
  redirect URLs, footnote formatting, and excess blank lines between list items.
- Deployment: GitHub Pages with custom domain (`CNAME` → `md.guilliman.ru`).
- Error handling wraps `convert()` in try/catch — shows error message in textarea.
- Paste uses `requestAnimationFrame` instead of old `setTimeout(250)`.
- Console.log removed from production code.
- Google Fonts loaded: Doto (display), Space Grotesk (body), Space Mono (labels/data).
  Labels are ALL CAPS, 0.08em tracking, 11px — per Nothing design system.
