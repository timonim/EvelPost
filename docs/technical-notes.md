# Technical notes

How EvelPost is built, how it was tested, and how the screenshots in these
documents were made. The product story is in [evolution.md](evolution.md).

## The test notice

Every screenshot uses the same notice, entered the same way in each version,
so versions can be compared fairly. It is a little demanding on purpose: a
hyphenated surname, a nickname, three lines of shiva details, four lines of
mourners.

| Field | Value |
| --- | --- |
| Relation | אבינו, סבנו ובעלנו האהוב |
| Name | אברהם (אבי) כהן-לוינשטיין |
| Funeral | 18.11.2026, 14:30, Hebrew date on, בית העלמין ירקון, שער ב׳ |
| Shiva | השבעה תתקיים בבית המשפחה / רחוב הרצל 12, תל אביב / שעות ביקור 10:00-13:00, 17:00-21:00 |
| Mourners | רעייתו: שרה / ילדיו: דוד, מרים ויוסף / נכדיו: נועה, איתי, תמר ועומר / הנינים וכל המשפחה |

Captured in Chromium at 1440×900 and 390×844. Each version was exported from
git (`git archive <ref>`), served locally, and filled through the same form
field ids, which have not changed since 2023.

## Architecture

Plain HTML, CSS and JavaScript, no build step. Runtime files: `index.html`,
`styles.css`, `script.js`, `fonts/` (Noto Sans Hebrew, SIL OFL, self-hosted)
and `vendor/html-to-image.js` (1.11.11, MIT, loaded only when exporting). No
requests to outside servers.

The notice is a container-query box (`container-type: inline-size`); every
size inside it is in `cqw` or `em`, so the layout is identical at any size:
on screen, on A4 and in the exported image.

### Fitting text

After each change, a binary search (10 steps) finds the largest base font size
at which nothing overflows the frame vertically, the bottom row horizontally,
or any region horizontally, then keeps 2% headroom. The two bottom columns use
`max-content`, so the user's line breaks are kept and the text shrinks instead
of re-wrapping. Then the name alone is shrunk (down to 60%) if a part of it is
still too wide. Number runs such as `10:00-13:00` are wrapped in
`white-space: nowrap`. The same fit runs again on the off-screen copy used for
export.

### Export

1. A clean copy of the notice is laid out off screen at 300 dpi A4 (3508×2480,
   or 2480×3508 in portrait) and fitted again at that size.
2. It is rendered to a canvas with `html-to-image`; the font is inlined as data
   URLs (`fontEmbedCSS`). On WebKit (Safari and every iOS browser) a warm-up
   render is made first, because fonts are often missing from the first one.
3. The render is checked on a downscaled copy: the frame must be present and,
   if the notice has text, there must be ink inside it. One retry, then fail.
   30-second limit.
4. PDF: the render as a JPEG (quality 0.92) on one A4 page, written directly
   (PDF 1.4, with the notice name as its title). Image: the render as PNG.
5. A dialog shows a preview. Saving and sharing happen from that tap, because
   phones refuse `navigator.share` after a long task. The preview can be
   long-pressed and saved in in-app browsers that block downloads.
6. Failure shows an error dialog; the direct-print route uses the print
   stylesheet, which shows only the clean notice on an A4 page.

### Data

The draft is stored in `localStorage` under `evelpost-form`, with the same
keys as v2, so v2 drafts open in v3. New choices (gender, honorific, ceremony,
orientation, frame) are stored by name, and default to v2's behaviour when
absent.

## Why v2's export can break

The export window loads the app's stylesheet, whose `body` is a centred flex
container with `min-height: 100vh`, and v2 doesn't size that `body` to the
page. The A4-sized notice is centred against the window rather than the page:
in the export window it started 159 px from the left of a 1440 px window.
v1's export window fixed its `body` at 29.7×21 cm and printed the same notice
on one page, so the problem arrived with the v2 refresh. It was reproduced in
Chromium's print engine at 100% scale; whether a person sees it depends on
their browser and "fit to page" setting. It was not observed on a real device.

The v2 export also waits for the new window's `load` event, which after
`document.write` can fire before anything is listening. (v1 had that issue;
v2 waits for fonts instead.)

## What was tested

| What | Where | Result |
| --- | --- | --- |
| Full notice, portrait with thin frame, name only, extreme content (14 mourner lines, very long names, `& " <b>` in text) | Chromium, Firefox, WebKit | PDF: 1 page, exact A4, `qpdf --check` clean, renders in poppler, same layout in all three |
| Image export | Chromium, Firefox, WebKit | Downloads; matches the PDF |
| Font and library blocked | Chromium, Firefox, WebKit | Error dialog, no file |
| Phone flow, download and share | iPhone 13 (WebKit), Pixel 7 (Chromium), emulated | Share receives the PDF; download works |
| v2 draft opened in v3 | Chromium | All fields restored |
| Export speed | all three | 0.3–1 second |

Firefox and WebKit ran in the official Playwright Docker image. v1 and v2
exports were made with each version's own export button, and the print window
saved through Chromium's print-to-PDF at 100% scale. PDFs were checked with
`pdfinfo` and `qpdf --check`, and rendered with `pdftoppm`.

**Not tested:** a real phone's share sheet, in-app browsers, real Safari on
macOS, printing on paper.

## Accessibility

Placeholder contrast was raised from 2.3:1 to 4.3:1. Every part of the notice
is keyboard-reachable (Tab, Enter or Space). Choices use real fieldsets and
legends; the status line is a live region. Not yet audited with a screen
reader.
