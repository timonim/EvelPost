# Changelog

The product story behind these versions, with screenshots: [docs/evolution.md](docs/evolution.md). Technical details: [docs/technical-notes.md](docs/technical-notes.md).

## v3: notice-first (November 2026, branch `notice-first-editor`)

- The notice is the interface: tap a part of it to edit it; optional 6-step guide; faded examples in empty places.
- הוא / היא wording, honorific choice (ז״ל, ע״ה, זצ״ל, הי״ד, none), ceremony type (הלוויה, הלוויה אזרחית, טקס פרידה), optional opening line.
- Text fits the frame automatically; nothing is cut off; long names shrink; line breaks kept.
- PDF and PNG built in the browser at 300 dpi, checked before they are offered; result dialog with share on phones.
- Portrait orientation and an ink-saving thin frame; last step shows the exact output and lists missing details.
- Self-hosted font and library; no outside requests. Reads v2 drafts.
- Details: [docs/v3-notice-first.md](docs/v3-notice-first.md).

## v2: refresh (24 June 2026, tag `v2`, live in production)

- Opening-line presets or a custom line; optional title.
- Hebrew date in Hebrew numerals; dates parsed as local dates.
- Page declared Hebrew/RTL; user text escaped; mourner line breaks kept.
- Drafts saved in the browser; reset button.
- Notice sized relative to its own width so print matches the screen; export waits for fonts.
- Details and known issues: [docs/v2-production.md](docs/v2-production.md).

## v1: export and mobile (2 January – 6 February 2024, tag `v1`)

- Export through the browser's print dialog, A4 landscape (PR #7).
- Mobile layout, slider and responsive fixes (PR #8).

## Before v1 (December 2023)

- Card sections, side-by-side layout, colour palette, nickname toggle, Hebrew date and its toggle (PRs #2–#6).
- Relative `em` font sizes, by guychouk (PR #1).
- First version: a form above a live preview (12 December 2023).
