# EvelPost — מחולל מודעות אבל

A small, dependency-free web app for composing a Hebrew memorial notice
(מודעת אבל) and printing it or sharing it as an image.

There is no form to fill in. The notice itself is the interface: tap any part
of it (the opening, the name, the funeral, the shiva, the mourners) and a short,
plainly worded step opens for just that part. Parts you haven't filled yet
show a faded example in place, and "הבא" walks you through the steps in order
if you want guidance.

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
  never reach the printout or image.
- **Print / PDF** (A4, landscape or portrait) and **save as image** (PNG; on
  phones this opens the share sheet, e.g. for WhatsApp).
- **Thin-frame option** that saves ink on home printers.
- **Automatic draft saving** to `localStorage`; your entries survive a reload.

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
| `script.js`              | Rendering, auto-fit, steps, drafts, print and image.   |
| `fonts/`                 | Self-hosted Noto Sans Hebrew (SIL OFL, see `OFL.txt`).  |
| `vendor/html-to-image.js`| html-to-image 1.11.11 (MIT), loaded only for images.    |

## Notes

- Everything inside the notice is sized relative to its width (`cqw`/`em`), so
  the layout is identical on screen, on A4 paper and in the exported image.
- Hebrew dates use the browser's `Intl` Hebrew calendar.
- User input is HTML-escaped before rendering.
- No network requests besides the page's own files.
