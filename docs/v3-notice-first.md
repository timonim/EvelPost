# v3: the notice-first version (November 2026)

| | |
| --- | --- |
| Status | In review on branch `notice-first-editor`; replaces v2 when merged |
| Files | `index.html`, `styles.css`, `script.js`, `fonts/`, `vendor/html-to-image.js` |
| Why it changed | [evolution.md, "From v2 to v3"](evolution.md#from-v2-to-v3-what-we-improved) |

![v3, empty](img/v3-empty.png)

## Interaction

The notice is the interface. Each of its five regions is a button (mouse,
touch, or keyboard: Tab then Enter) that opens the step for that part. The
active region is outlined on the notice.

| Step | Region | Question | Fields |
| --- | --- | --- | --- |
| 1 פתיח | Opening lines | על מי המודעה? | הוא / היא, relation, opening line (4 presets, custom, or none) |
| 2 שם | Name | השם במודעה | First and last name, optional title and nickname, honorific, name size |
| 3 הלוויה | Funeral | מתי ואיפה נפרדים? | Ceremony type, date, time, Hebrew date, place |
| 4 שבעה | Shiva | איפה יושבים שבעה? | Free text |
| 5 אבלים | Mourners | מי האבלים? | Free text, one line per name or group |
| 6 סיום | Whole notice | המודעה מוכנה | Orientation, frame, missing details, export |

The step row shows which steps have content. "הבא" walks through them in
order; nothing is required. The relation question and its example follow
הוא / היא (״מי היא הייתה בשבילכם?״).

**Layout.** Desktop: the steps beside the notice, which stays in view. Below
1000 px: the notice pinned to the top of the screen, the steps underneath, and
moving to a step scrolls it into view below the notice.

## The notice

```
{opening line}                                   (optional)
אנו מודיעים על פטירתו|פטירתה של {relation}
{title} {first} ({nickname}) {last} {honorific}  (honorific: ז״ל ע״ה זצ״ל הי״ד or none)
{ceremony} ב{weekday}, {dd.mm.yyyy} ({Hebrew date})
בשעה {time}
{place}
{shiva}                                {mourners}  (stacked and centred in portrait)
```

`{ceremony}`: ההלוויה תתקיים, ההלוויה האזרחית תתקיים, or טקס הפרידה יתקיים.

**Empty values** show a faded example in place. On the last step, in print
and in exported files, examples are removed, and so is any line that would be
incomplete without them (the name line is kept).

**Fitting.** All sizes are relative to the notice's width (`cqw` and `em`).
After every change a binary search finds the largest base size at which
nothing overflows the frame, horizontally or vertically, and keeps 2% of
headroom. The two bottom columns take their natural width, so the user's line
breaks are kept and the text shrinks instead of re-wrapping. Then the name
alone is shrunk if one of its parts is wider than the frame. Number runs such
as `10:00-13:00` never break.

**Options:** landscape or portrait A4; heavy frame, or a thin frame that
saves ink.

## Export

Buttons: הורדת PDF, שמירה כתמונה, and a direct-print link as a fallback.

1. **Render.** A clean copy of the notice is laid out off screen at 300 dpi
   A4 (3508×2480 px, or 2480×3508 in portrait), fitted again at that size,
   and rendered to a canvas with `html-to-image`. The font is inlined as data
   URLs; on WebKit (Safari, every iOS browser) a warm-up render is made first.
2. **Check.** The render is downscaled and inspected: the frame must be
   present, and the inside must have ink if the notice has text. One retry
   (after the warm-up on WebKit), then failure. 30-second time limit.
3. **File.** PDF: the render as a JPEG (quality 0.92) on one A4 page, written
   directly (PDF 1.4; the title is the file name, in Hebrew). Image: the same
   render as PNG. File name: `מודעת אבל - {first} {last}`.
4. **Result dialog.** Shows a preview of the file. Phones: שיתוף (Web Share
   with the file) and הורדה. Desktop: הורדה and פתיחה והדפסה (opens the PDF in
   the browser's viewer). The preview can be long-pressed and saved where
   downloads are blocked.
5. **Failure dialog.** Says the details are safe; offers לנסות שוב and
   הדפסה ישירה (the print stylesheet, which shows only the clean notice on an
   A4 page).

| Result dialog (phone) | Missing details on the last step |
| --- | --- |
| ![Result](img/v3-result-dialog-phone.png) | ![Missing](img/v3-finish-missing.png) |

## Data

The draft is saved to `localStorage` under `evelpost-form`, the same key and
field names as v2, so v2 drafts load in v3. New choices (הוא / היא,
honorific, ceremony, orientation, frame) are stored by name. "Start a new
notice" asks before clearing.

## Dependencies

None at runtime outside the site itself: Noto Sans Hebrew (SIL OFL) is
self-hosted in `fonts/`, and `html-to-image` 1.11.11 (MIT) is in `vendor/`,
loaded only when exporting.

## Testing done

| What | Where | Result |
| --- | --- | --- |
| Full notice, portrait with thin frame, name only, extreme content (14 mourner lines, very long names, `& " <b>` in text) | Chromium, Firefox, WebKit | PDF: 1 page, exact A4, `qpdf --check` clean, renders in poppler; same layout in all three |
| Image export | Chromium, Firefox, WebKit | Downloads, matches the PDF |
| Font and library blocked | Chromium, Firefox, WebKit | Failure dialog, no file |
| Phone flow, download and share | iPhone 13 (WebKit), Pixel 7 (Chromium) emulation | Share receives the PDF; download works |
| v2 draft opened in v3 | Chromium | All fields restored |

Not yet tested: a real phone's share sheet, in-app browsers, real Safari on
macOS, printing on paper.

## Known limitations

- The PDF holds an image of the notice, so its text can't be selected or
  searched. This is what makes the Hebrew identical in every browser.
- Direct printing (the fallback) depends on the browser's print settings, as
  in v2.
- Very long content makes the text small rather than adding a page; the
  notice is always one page.
