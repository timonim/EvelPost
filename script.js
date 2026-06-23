'use strict';

const STORAGE_KEY = 'evelpost-form';

const form = document.getElementById('obituary-form');
const previewElement = document.getElementById('preview-content');
const textSizeSlider = document.getElementById('text-size');
const exportButton = document.getElementById('export-button');
const resetButton = document.getElementById('reset-button');

const nickNameToggle = document.getElementById('show-nick-name');
const nickNameField = document.getElementById('nick-name').closest('.form-field');

const titleToggle = document.getElementById('show-title');
const titleField = document.getElementById('title').closest('.form-field');

const openingSelect = document.getElementById('opening');
const openingCustomField = document
  .getElementById('opening-custom')
  .closest('.form-field');

/* ----------------------------------------------------------------------- */
/* Helpers                                                                  */
/* ----------------------------------------------------------------------- */

// Escape user-supplied text before it is inserted into the preview via
// innerHTML, to avoid breaking the markup (and incidental XSS).
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Parse a "YYYY-MM-DD" string (from <input type="date">) as a *local* date.
// Passing the string straight to `new Date()` parses it as UTC, which can
// shift the displayed day by one depending on the user's timezone.
function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Convert a number to Hebrew numerals (gematria), e.g. 26 -> כ״ו, 5786 -> תשפ״ו.
function toHebrewNumeral(num) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];

  let n = num % 1000; // drop the thousands — Hebrew years omit them (5786 -> תשפ״ו)
  let out = '';
  let h = Math.floor(n / 100);
  while (h > 4) {
    out += 'ת';
    h -= 4;
  }
  out += hundreds[h];

  const rem = n % 100;
  if (rem === 15) out += 'טו'; // avoid spelling a name of God
  else if (rem === 16) out += 'טז';
  else out += tens[Math.floor(rem / 10)] + ones[rem % 10];

  // Add geresh (single letter) or gershayim (before the last of multiple letters).
  if (out.length === 1) return out + '׳';
  return out.slice(0, -1) + '״' + out.slice(-1);
}

function getHebrewFormattedDate(date) {
  const parts = new Intl.DateTimeFormat('he', {
    calendar: 'hebrew',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).formatToParts(date);

  return parts
    .map((part) =>
      part.type === 'day' || part.type === 'year'
        ? toHebrewNumeral(Number(part.value))
        : part.value
    )
    .join('');
}

/* ----------------------------------------------------------------------- */
/* Nickname toggle                                                          */
/* ----------------------------------------------------------------------- */

function updateNicknameVisibility() {
  nickNameField.hidden = !nickNameToggle.checked;
}

function updateTitleVisibility() {
  titleField.hidden = !titleToggle.checked;
}

// Show the free-text opening field only when "custom" is selected.
function updateOpeningVisibility() {
  openingCustomField.hidden = openingSelect.value !== 'custom';
}

/* ----------------------------------------------------------------------- */
/* Preview rendering                                                        */
/* ----------------------------------------------------------------------- */

function updatePreview() {
  try {
    // Collect every form control's value by id.
    const values = {};
    form
      .querySelectorAll('.form-field input, .form-field textarea, .form-field select')
      .forEach((input) => {
        values[input.id] = input.value;
      });

    // Opening line: a preset, or the custom text when "custom" is chosen.
    const openingText =
      values['opening'] === 'custom'
        ? values['opening-custom']
        : values['opening'];

    // Name block, scaled by the size slider. The value is an `em` multiple
    // of the preview's base font (which is itself container-relative), so the
    // name scales with the notice — on screen and in the exported PDF alike.
    const fontSize = `${textSizeSlider.value}em`;
    const showNickName = nickNameToggle.checked;
    const nick =
      showNickName && values['nick-name']
        ? `(${escapeHtml(values['nick-name'])})`
        : '';

    const showTitle = titleToggle.checked;
    const title =
      showTitle && values['title']
        ? `<span class="preview-title">${escapeHtml(values['title'])}</span>`
        : '';

    const nameHtml = `
      <name-preview style="font-size: ${fontSize}">
        ${title}
        <span class="preview-first-name">${escapeHtml(values['first-name'])}</span>
        <span class="preview-nick-name">${nick}</span>
        <span class="preview-last-name">${escapeHtml(values['last-name'])}</span>
        <span style="font-size: 0.5em">ז"ל</span>
      </name-preview>
    `;

    // Burial date / time.
    const burialDate = parseLocalDate(values['date-of-burial']);
    let formattedDate = '';
    let dayOfWeek = '';
    let hebrewFormattedDate = '';
    if (burialDate) {
      formattedDate = burialDate.toLocaleDateString('he-IL');
      dayOfWeek = burialDate.toLocaleDateString('he-IL', { weekday: 'long' });
      hebrewFormattedDate = getHebrewFormattedDate(burialDate);
    }

    const showHebrewDate = document.getElementById('show-hebrew-date').checked;
    const hebrewSuffix =
      showHebrewDate && hebrewFormattedDate ? `(${hebrewFormattedDate})` : '';

    previewElement.innerHTML = `
      <div id="intro">
        ${escapeHtml(openingText)} <br>
        ${
          values['relation']
            ? `אנו מודיעים על פטירתו של <span class="relation">${escapeHtml(values['relation'])}</span>`
            : ''
        }
      </div>

      ${nameHtml}

      <div id="funeral">
        הלוויה תתקיים ב${dayOfWeek}, ${formattedDate} ${hebrewSuffix}
        <br>
        בשעה ${escapeHtml(values['hour-of-burial'])}.
        <br>
        ${escapeHtml(values['location-of-burial'])}
      </div>

      <div id="bottom">
        <span class="preview-shiva">${escapeHtml(values['shiva']).replace(/\n/g, '<br>')}</span>
        <span class="preview-grievers">${escapeHtml(values['grievers']).replace(/\n/g, '<br>')}</span>
      </div>
    `;
  } catch (error) {
    console.error('Error updating preview:', error);
  }
}

/* ----------------------------------------------------------------------- */
/* Draft persistence (localStorage)                                         */
/* ----------------------------------------------------------------------- */

function getControls() {
  return form.querySelectorAll('input, textarea, select');
}

function saveDraft() {
  try {
    const draft = {};
    getControls().forEach((control) => {
      if (!control.id) return;
      draft[control.id] =
        control.type === 'checkbox' ? control.checked : control.value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    // localStorage may be unavailable (private mode / quota); ignore.
  }
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    getControls().forEach((control) => {
      if (!(control.id in draft)) return;
      if (control.type === 'checkbox') {
        control.checked = Boolean(draft[control.id]);
      } else {
        control.value = draft[control.id];
      }
    });
  } catch (error) {
    // Corrupt or unavailable draft; start fresh.
  }
}

/* ----------------------------------------------------------------------- */
/* PDF export (via the browser's print dialog)                              */
/* ----------------------------------------------------------------------- */

async function exportToPDF() {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('החלון נחסם. אנא אפשרו חלונות קופצים כדי לייצא לקובץ.');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wdth,wght@62.5..100,100..900&display=swap" rel="stylesheet">
        <title>מודעת אבל</title>
        <link rel="stylesheet" href="styles.css">
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background-color: white;
          }

          /* Render the preview at the exact A4-landscape size. Because the
             shared stylesheet sizes everything inside in cqw (relative to
             this box's width), the printed notice is proportionally identical
             to the on-screen preview — no scaling fudge needed. */
          #obituary-preview {
            width: 29.7cm;
            height: 21cm;
            box-shadow: none;
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        <div id="obituary-preview">
          <div id="preview-content">
            ${previewElement.innerHTML}
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for fonts so the layout is measured correctly before printing.
  // Relying on `onload` is unreliable after document.write, since the load
  // event can fire before the listener is attached.
  try {
    await printWindow.document.fonts.ready;
  } catch (error) {
    // Fonts API unavailable — proceed anyway.
  }

  printWindow.focus();
  printWindow.print();

  // Desktop print() blocks until the dialog closes, so it is safe to close
  // the tab. Mobile prints asynchronously, so leave the tab for the user.
  if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    printWindow.close();
  }
}

/* ----------------------------------------------------------------------- */
/* Wiring                                                                   */
/* ----------------------------------------------------------------------- */

restoreDraft();
updateNicknameVisibility();
updateTitleVisibility();
updateOpeningVisibility();
updatePreview();

form.addEventListener('input', () => {
  updatePreview();
  saveDraft();
});

nickNameToggle.addEventListener('change', updateNicknameVisibility);
titleToggle.addEventListener('change', updateTitleVisibility);
openingSelect.addEventListener('change', updateOpeningVisibility);

exportButton.addEventListener('click', exportToPDF);

resetButton.addEventListener('click', () => {
  form.reset();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // ignore
  }
  updateNicknameVisibility();
  updateTitleVisibility();
  updateOpeningVisibility();
  updatePreview();
});
