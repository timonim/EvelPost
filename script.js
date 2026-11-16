'use strict';

const STORAGE_KEY = 'evelpost-form';

const form = document.getElementById('editor');
const notice = document.getElementById('notice');
const frame = document.getElementById('notice-frame');
const textSizeSlider = document.getElementById('text-size');
const prevButton = document.getElementById('prev-step');
const nextButton = document.getElementById('next-step');
const statusElement = document.getElementById('status');

const steps = [...form.querySelectorAll('.step')];
const stepIds = steps.map((step) => step.dataset.step);
const stepTabs = [...form.querySelectorAll('.step-tab')];
const regions = [...notice.querySelectorAll('.region')];
const regionByStep = Object.fromEntries(
  regions.map((region) => [region.dataset.step, region])
);

const CEREMONY_PHRASES = {
  funeral: 'ההלוויה תתקיים',
  civil: 'ההלוויה האזרחית תתקיים',
  farewell: 'טקס הפרידה יתקיים',
};

// Notice proportions (A4) and the largest base text size, in cqw.
const ASPECT = { landscape: 297 / 210, portrait: 210 / 297 };
const MAX_FONT = { landscape: 3.6, portrait: 4.6 };
const MIN_FONT = 1.2;
const MIN_NAME_SCALE = 0.6;

let currentStep = stepIds[0];

/* ----------------------------------------------------------------------- */
/* Helpers                                                                  */
/* ----------------------------------------------------------------------- */

// Escape user-supplied text before it is inserted via innerHTML.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Escape, keep number runs like "10:00-13:00" on one line, keep line breaks.
function multiline(value) {
  return escapeHtml(value)
    .replace(/\d[\d:./\-–]*\d/g, '<span class="nowrap">$&</span>')
    .replace(/\n/g, '<br>');
}

// Faded example text shown in the notice until the real value is filled in.
// It never reaches the printout or the exported image.
function ghost(example) {
  return `<span class="ghost">${multiline(example)}</span>`;
}

// Replace a region's markup only when it changed. Rewriting it needlessly
// (e.g. on the change event when a field loses focus) would swap the node
// under the pointer mid-click and the click would be lost.
const renderedHtml = new WeakMap();
function setHtml(element, html) {
  if (renderedHtml.get(element) === html) return;
  renderedHtml.set(element, html);
  element.innerHTML = html;
}

function valueOr(value, example) {
  return value.trim() ? multiline(value.trim()) : ghost(example);
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

function readValues() {
  const values = {};
  form.querySelectorAll('input, textarea, select').forEach((control) => {
    if (control.type === 'radio') {
      if (control.checked) values[control.name] = control.value;
    } else if (control.type === 'checkbox') {
      values[control.id] = control.checked;
    } else if (control.id) {
      values[control.id] = control.value;
    }
  });
  return values;
}

/* ----------------------------------------------------------------------- */
/* Notice rendering                                                         */
/* ----------------------------------------------------------------------- */

function renderNotice(v) {
  const female = v.gender === 'f';

  // Opening: a preset line, a custom line or none, then the announcement.
  const openingText =
    v.opening === 'custom' ? v['opening-custom'].trim() : v.opening === 'none' ? '' : v.opening;
  setHtml(regionByStep.opening, `
    ${openingText ? `<p class="notice-opening">${escapeHtml(openingText)}</p>` : ''}
    <p>אנו מודיעים על ${female ? 'פטירתה' : 'פטירתו'} של
      ${valueOr(v.relation, female ? 'אמנו היקרה' : 'אבינו היקר')}</p>
  `);

  // Name. Each part is kept on one line; wrapping happens only between parts,
  // and the honorific stays attached to the last name.
  const title = v['show-title'] && v.title.trim();
  const nick = v['show-nick-name'] && v['nick-name'].trim();
  setHtml(regionByStep.name, `
    <p class="notice-name">
      ${title ? `<span class="name-title">${escapeHtml(title)}</span>` : ''}
      <span class="name-part">${valueOr(v['first-name'], 'שם פרטי')}</span>
      ${nick ? `<span class="name-nick">(${escapeHtml(nick)})</span>` : ''}
      <span class="name-part">${valueOr(v['last-name'], 'שם משפחה')}${
        v.honorific ? ` <span class="name-honorific">${v.honorific}</span>` : ''
      }</span>
    </p>
  `);

  // Funeral: when, at what time, where.
  const date = parseLocalDate(v['date-of-burial']);
  let when = ghost('ביום ..., בתאריך ...');
  if (date) {
    const weekday = date.toLocaleDateString('he-IL', { weekday: 'long' });
    const hebrew = v['show-hebrew-date'] ? ` (${getHebrewFormattedDate(date)})` : '';
    when = `ב${weekday}, ${date.toLocaleDateString('he-IL')}${hebrew}`;
  }
  const time = v['hour-of-burial'] ? `בשעה ${escapeHtml(v['hour-of-burial'])}` : ghost('בשעה ...');
  setHtml(regionByStep.funeral, `
    <p>${CEREMONY_PHRASES[v.ceremony] || CEREMONY_PHRASES.funeral} ${when}</p>
    <p>${time}</p>
    <p>${valueOr(v['location-of-burial'], 'בבית העלמין ...')}</p>
  `);

  setHtml(regionByStep.shiva, `<p>${valueOr(v.shiva, 'השבעה תתקיים\nבבית המשפחה')}</p>`);
  setHtml(regionByStep.mourners, `<p>${valueOr(v.grievers, 'המשפחה')}</p>`);

  // Layout options.
  const orientation = v.orientation === 'portrait' ? 'portrait' : 'landscape';
  notice.dataset.orientation = orientation;
  notice.dataset.frame = v.frame === 'thin' ? 'thin' : 'bold';
  document.getElementById('page-size').textContent =
    `@page { size: A4 ${orientation}; margin: 0; }`;

  fitNotice();
}

/* ----------------------------------------------------------------------- */
/* Auto-fit: shrink the text until everything fits inside the frame         */
/* ----------------------------------------------------------------------- */

// All sizes inside the notice are relative to its width (cqw / em), so the
// fitted values are valid at any size: on screen, in print and as an image.
const bottom = frame.querySelector('.notice-bottom');
function overflows({ ignoreName = false } = {}) {
  if (frame.scrollHeight > frame.clientHeight + 1) return true;
  if (bottom.scrollWidth > bottom.clientWidth + 1) return true;
  return regions.some(
    (region) =>
      !(ignoreName && region.dataset.step === 'name') &&
      region.scrollWidth > region.clientWidth + 1
  );
}

function fitNotice() {
  if (!frame.clientWidth) return;
  const orientation = notice.dataset.orientation;
  const name = frame.querySelector('.notice-name');

  // 1. Base text size: the largest that fits, by binary search.
  let nameScale = Number(textSizeSlider.value);
  name.style.fontSize = `${nameScale}em`;
  let lo = MIN_FONT;
  let hi = MAX_FONT[orientation];
  frame.style.fontSize = `${hi}cqw`;
  if (overflows({ ignoreName: true })) {
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      frame.style.fontSize = `${mid}cqw`;
      if (overflows({ ignoreName: true })) hi = mid;
      else lo = mid;
    }
    frame.style.fontSize = `${lo}cqw`;
  }

  // 2. The name: shrink it below the chosen size only if a part is too wide.
  while (nameScale > MIN_NAME_SCALE && name.scrollWidth > name.clientWidth + 1) {
    nameScale -= 0.05;
    name.style.fontSize = `${nameScale}em`;
  }
}

/* ----------------------------------------------------------------------- */
/* Editor: steps and conditional fields                                     */
/* ----------------------------------------------------------------------- */

function goToStep(stepId, { focus = false } = {}) {
  if (!stepIds.includes(stepId)) return;
  currentStep = stepId;
  const index = stepIds.indexOf(stepId);

  steps.forEach((step) => (step.hidden = step.dataset.step !== stepId));
  stepTabs.forEach((tab) =>
    tab.setAttribute('aria-current', tab.dataset.step === stepId ? 'step' : 'false')
  );
  regions.forEach((region) =>
    region.classList.toggle('is-active', region.dataset.step === stepId)
  );

  prevButton.hidden = index === 0;
  nextButton.hidden = index === stepIds.length - 1;
  const nextTab = stepTabs[index + 1];
  if (nextTab) nextButton.textContent = `הבא: ${nextTab.lastChild.textContent}`;

  if (focus) {
    const target = steps[index].querySelector('[data-autofocus]');
    if (target) target.focus({ preventScroll: true });
  }
}

// On narrow screens the editor sits under the sticky notice; bring the
// step's fields into view when it changes.
function revealEditor() {
  if (window.matchMedia('(max-width: 1000px)').matches) {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Fields with data-show-when="checkbox-id" or "select-id=value".
function updateConditionalFields() {
  form.querySelectorAll('[data-show-when]').forEach((field) => {
    const [id, expected] = field.dataset.showWhen.split('=');
    const control = document.getElementById(id);
    field.hidden =
      expected === undefined ? !control.checked : control.value !== expected;
  });
}

// Labels and placeholders that depend on the deceased's gender.
function updateGenderedText(gender) {
  form.querySelectorAll('[data-m][data-f]').forEach((element) => {
    const text = element.dataset[gender === 'f' ? 'f' : 'm'];
    if ('placeholder' in element) element.placeholder = text;
    else element.textContent = text;
  });
}

// A step is "done" once its main field has content.
function updateStepProgress(v) {
  const done = {
    opening: Boolean(v.relation.trim()),
    name: Boolean(v['first-name'].trim() || v['last-name'].trim()),
    funeral: Boolean(v['date-of-burial'] || v['location-of-burial'].trim()),
    shiva: Boolean(v.shiva.trim()),
    mourners: Boolean(v.grievers.trim()),
  };
  stepTabs.forEach((tab) => tab.classList.toggle('is-done', Boolean(done[tab.dataset.step])));
}

function update() {
  const values = readValues();
  updateConditionalFields();
  updateGenderedText(values.gender);
  updateStepProgress(values);
  renderNotice(values);
}

/* ----------------------------------------------------------------------- */
/* Draft persistence (localStorage)                                         */
/* ----------------------------------------------------------------------- */

function getControls() {
  return form.querySelectorAll('input, textarea, select');
}

function saveDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readValues()));
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
      if (control.type === 'radio') {
        if (control.name in draft) control.checked = draft[control.name] === control.value;
      } else if (control.id in draft) {
        if (control.type === 'checkbox') control.checked = Boolean(draft[control.id]);
        else control.value = draft[control.id];
      }
    });
  } catch (error) {
    // Corrupt or unavailable draft; start fresh.
  }
}

/* ----------------------------------------------------------------------- */
/* Output: print / PDF and image                                            */
/* ----------------------------------------------------------------------- */

function showStatus(message) {
  statusElement.textContent = message;
  statusElement.classList.add('is-visible');
  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => statusElement.classList.remove('is-visible'), 4000);
}

function noticeFileName(extension) {
  const v = readValues();
  const name = [v['first-name'], v['last-name']].map((s) => s.trim()).filter(Boolean).join(' ');
  return `מודעת אבל${name ? ` - ${name}` : ''}.${extension}`;
}

// The print stylesheet shows only the notice, sized to the A4 page.
async function exportToPDF() {
  try {
    await document.fonts.ready;
  } catch (error) {
    // Fonts API unavailable — print anyway.
  }
  window.print();
}

let imageLibrary;
function loadImageLibrary() {
  imageLibrary ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'vendor/html-to-image.js';
    script.onload = () => resolve(window.htmlToImage);
    script.onerror = () => {
      imageLibrary = null;
      reject(new Error('Could not load html-to-image'));
    };
    document.head.append(script);
  });
  return imageLibrary;
}

async function exportToImage() {
  showStatus('מכינים את התמונה…');
  const holder = document.createElement('div');
  try {
    const htmlToImage = await loadImageLibrary();
    await document.fonts.ready;

    // Render a clean copy at a fixed, print-quality width. Sizes inside are
    // width-relative, so the copy lays out exactly like the preview.
    const width = 2000;
    const height = Math.round(width / ASPECT[notice.dataset.orientation]);
    const copy = notice.cloneNode(true);
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    // Drop unfilled examples, and lines left incomplete without them.
    copy.querySelectorAll('p:not(.notice-name) .ghost').forEach((element) =>
      element.closest('p').remove()
    );
    copy.querySelectorAll('.ghost').forEach((element) => element.remove());
    copy.classList.add('is-export');
    copy.style.width = `${width}px`;
    holder.className = 'export-holder';
    holder.append(copy);
    document.body.append(holder);

    const blob = await htmlToImage.toBlob(copy, {
      width,
      height,
      pixelRatio: 1,
      backgroundColor: '#ffffff',
    });
    const file = new File([blob], noticeFileName('png'), { type: 'image/png' });

    // On phones, offer the share sheet (WhatsApp etc.); elsewhere, download.
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'מודעת אבל' });
      } catch (error) {
        if (error.name !== 'AbortError') throw error;
      }
      statusElement.classList.remove('is-visible');
      return;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    showStatus('התמונה נשמרה');
  } catch (error) {
    console.error('Image export failed:', error);
    showStatus('לא הצלחנו ליצור תמונה. אפשר לנסות שוב, או להשתמש בהדפסה / PDF.');
  } finally {
    holder.remove();
  }
}

/* ----------------------------------------------------------------------- */
/* Wiring                                                                   */
/* ----------------------------------------------------------------------- */

restoreDraft();
update();
goToStep(currentStep);

form.addEventListener('input', () => {
  update();
  saveDraft();
});
form.addEventListener('change', () => {
  update();
  saveDraft();
});

regions.forEach((region) => {
  const open = () => {
    goToStep(region.dataset.step, { focus: true });
    revealEditor();
  };
  region.addEventListener('click', open);
  region.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  });
});

stepTabs.forEach((tab) =>
  tab.addEventListener('click', () => goToStep(tab.dataset.step))
);
prevButton.addEventListener('click', () =>
  goToStep(stepIds[stepIds.indexOf(currentStep) - 1])
);
nextButton.addEventListener('click', () => {
  goToStep(stepIds[stepIds.indexOf(currentStep) + 1]);
  revealEditor();
});

document
  .querySelectorAll('[data-action="pdf"]')
  .forEach((button) => button.addEventListener('click', exportToPDF));
document
  .querySelectorAll('[data-action="image"]')
  .forEach((button) => button.addEventListener('click', exportToImage));

document.getElementById('reset-button').addEventListener('click', () => {
  if (!confirm('למחוק את כל הפרטים ולהתחיל מודעה חדשה?')) return;
  form.reset();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // ignore
  }
  update();
  goToStep(stepIds[0], { focus: true });
});

// Refit when the notice changes size, and once the web font has loaded.
// Also track the (sticky) stage height so scrolling to the editor clears it.
new ResizeObserver(() => fitNotice()).observe(notice);
const stage = notice.closest('.stage');
new ResizeObserver(() => {
  const sticky = getComputedStyle(stage).position === 'sticky' &&
    window.matchMedia('(max-width: 1000px)').matches;
  form.style.setProperty('--stage-height', sticky ? `${stage.offsetHeight + 16}px` : '0px');
}).observe(stage);
document.fonts?.ready.then(() => fitNotice());
