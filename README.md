# EvelPost — מחולל מודעות אבל

A small, dependency-free web app for composing a Hebrew memorial notice
(מודעת אבל) and printing it or sharing it as an image.

There is no form to fill in. The notice itself is the interface: tap any part
of it (the opening, the name, the funeral, the shiva, the mourners) and a short,
plainly worded step opens for just that part. Parts you haven't filled yet
show a faded example in place, and "הבא" walks you through the steps in order
if you want guidance.

How the tool got here, from the first version to this one, with
screenshots of each: [docs/evolution.md](docs/evolution.md). Version history:
[CHANGELOG.md](CHANGELOG.md).

## Features

- **Edit on the notice**: click or tap a region to edit it; a six-step guide
  (פתיח, שם, הלוויה, שבעה, אבלים, סיום) is there for anyone who wants it.
- **Inclusive wording**: הוא / היא (פטירתו / פטירתה), a choice of honorific
  (ז״ל, ע״ה, זצ״ל, הי״ד or none), and the type of ceremony (הלוויה, הלוויה
  אזרחית, טקס פרידה). Optional title, nickname and Hebrew date.
- **Always fits**: text shrinks automatically so nothing is ever cut off;
  long names shrink on their own; the shiva and mourner lines break only where
  you broke them.
- **Clean output**: unfilled examples, and lines left incomplete without them,
  never reach the file. The last step shows the notice exactly as it will be
  exported, and lists essentials that are still empty.
- **Reliable PDF and image export**, built in the browser rather than through
  the print dialog (see below). A result dialog shows the file before it is
  saved; on phones it offers the share sheet (e.g. WhatsApp).
- **Thin-frame option** that saves ink on home printers.
- **Automatic draft saving** to `localStorage`; your entries survive a reload.

## How export works

The browser's print dialog is the usual source of broken PDFs (margins,
scaling, headers, Safari quirks), so the app doesn't depend on it:

1. A clean copy of the notice is laid out off screen at 300 dpi A4
   (3508 × 2480 px) and fitted again at that size.
2. It is rendered to a canvas with `html-to-image`, with the font inlined as
   data URLs. Safari gets a warm-up render first (it often drops fonts on the
   first pass).
3. The render is checked (the frame is there, text is there) and retried if
   not. If it still fails, the user is told and offered direct printing; a
   broken file is never handed out.
4. The PDF is written directly: one A4 page holding the render as a JPEG,
   with the notice name as its title. The image export is the same render as
   PNG.
5. A dialog shows the result, with download, share (phones) and open-to-print
   (desktop). Saving happens on that tap, so phones allow the share sheet, and
   the preview can be long-pressed and saved where downloads are blocked
   (in-app browsers).

"Direct print" (window.print with the print stylesheet) remains as a fallback.

Tested in Chromium, Firefox and WebKit (desktop, iPhone and Android
emulation); every PDF passes `qpdf --check` and renders in poppler.

## Running it

There's no build step. Serve the folder and open it in a browser:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

| File                     | Purpose                                                 |
| ------------------------ | ------------------------------------------------------- |
| `index.html`             | The notice (with its editable regions) and the steps.   |
| `styles.css`             | Layout, the notice, and the print stylesheet.           |
| `script.js`              | Rendering, auto-fit, steps, drafts, PDF/image export.  |
| `fonts/`                 | Self-hosted Noto Sans Hebrew (SIL OFL, see `OFL.txt`).  |
| `vendor/html-to-image.js`| html-to-image 1.11.11 (MIT), loaded only for images.    |

## Notes

- Everything inside the notice is sized relative to its width (`cqw`/`em`), so
  the layout is identical on screen, on A4 paper and in the exported image.
- Hebrew dates use the browser's `Intl` Hebrew calendar.
- User input is HTML-escaped before rendering.
- No network requests besides the page's own files.
