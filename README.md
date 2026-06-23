# EvelPost — מחולל מודעות אבל

A small, dependency-free web app for composing a Hebrew memorial/obituary
notice (מודעת אבל) and exporting it to a print-ready PDF.

You fill in a form on the right‑to‑left side panel — relation, the deceased's
name and optional nickname, burial date/time and location, the shiva details
and the mourners — and a live, framed preview updates as you type. When you're
happy with it, **ייצוא לקובץ** opens a print dialog laid out for A4 landscape.

## Features

- **Live preview** that mirrors every change instantly.
- **Optional nickname** and **Hebrew (Jewish-calendar) date**, toggled on/off.
- **Adjustable name size** via a slider.
- **PDF export** through the browser's native print dialog (A4 landscape).
- **Automatic draft saving** to `localStorage` — your entries survive a reload.
- **Reset** to clear the form and the saved draft.

## Running it

There's no build step. Either open `index.html` directly in a browser, or
serve the folder so font/CDN requests behave consistently:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

| File         | Purpose                                              |
| ------------ | ---------------------------------------------------- |
| `index.html` | Markup: the input form and the preview/export panel. |
| `styles.css` | Layout, RTL styling, and the framed-notice preview.  |
| `script.js`  | Live preview, draft persistence, and PDF export.     |

## Notes

- Hebrew dates use the browser's `Intl` Hebrew calendar
  (`he-IL-u-ca-hebrew`).
- The preview text is built from user input that is HTML-escaped before
  rendering.
- Fonts come from Google Fonts (`Noto Sans Hebrew`) and `normalize.css` from a
  CDN, so the page expects network access on first load.
