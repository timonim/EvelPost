'use strict';

const STORAGE_KEY = 'evelpost-form';

const form = document.getElementById('editor');
const notice = document.getElementById('notice');
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
// Works on the on-screen notice and on the off-screen copy used for export.
function overflows(root, { ignoreName = false } = {}) {
  const box = root.querySelector('.notice-frame');
  if (box.scrollHeight > box.clientHeight + 1) return true;
  const bottomRow = root.querySelector('.notice-bottom');
  if (bottomRow.scrollWidth > bottomRow.clientWidth + 1) return true;
  return [...root.querySelectorAll('.region')].some(
    (region) =>
      !(ignoreName && region.dataset.step === 'name') &&
      region.scrollWidth > region.clientWidth + 1
  );
}

function fitNotice(root = notice) {
  const box = root.querySelector('.notice-frame');
  if (!box.clientWidth) return;
  const orientation = root.dataset.orientation;
  const name = box.querySelector('.notice-name');

  // 1. Base text size: the largest that fits, by binary search.
  let nameScale = Number(textSizeSlider.value);
  name.style.fontSize = `${nameScale}em`;
  let lo = MIN_FONT;
  let hi = MAX_FONT[orientation];
  box.style.fontSize = `${hi}cqw`;
  if (overflows(root, { ignoreName: true })) {
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      box.style.fontSize = `${mid}cqw`;
      if (overflows(root, { ignoreName: true })) hi = mid;
      else lo = mid;
    }
    // A little headroom, so font rounding at another size can't clip.
    box.style.fontSize = `${lo * 0.98}cqw`;
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
  updateCleanMode();

  prevButton.hidden = index === 0;
  nextButton.hidden = index === stepIds.length - 1;
  const nextTab = stepTabs[index + 1];
  if (nextTab) nextButton.textContent = `הבא: ${nextTab.lastChild.textContent}`;

  if (focus) {
    const target = steps[index].querySelector('[data-autofocus]');
    if (target) target.focus({ preventScroll: true });
  }
}

// On the last step the notice shows exactly what the file will contain:
// no examples, no incomplete lines.
function updateCleanMode() {
  notice.classList.toggle('is-clean', currentStep === 'finish');
  fitNotice();
}

// Details a notice normally has; listed on the last step if still empty.
const ESSENTIALS = [
  { id: 'first-name', label: 'שם פרטי', step: 'name' },
  { id: 'last-name', label: 'שם משפחה', step: 'name' },
  { id: 'date-of-burial', label: 'תאריך', step: 'funeral' },
  { id: 'hour-of-burial', label: 'שעה', step: 'funeral' },
  { id: 'location-of-burial', label: 'מקום ההלוויה', step: 'funeral' },
];

function updateMissing(v) {
  const missing = ESSENTIALS.filter(({ id }) => !v[id].trim());
  const list = document.getElementById('missing');
  list.hidden = missing.length === 0;
  list.querySelector('.missing-items').replaceChildren(
    ...missing.map(({ id, label, step }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'missing-item';
      button.textContent = label;
      button.addEventListener('click', () => {
        goToStep(step);
        document.getElementById(id).focus();
        revealEditor();
      });
      return button;
    })
  );
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
  updateMissing(values);
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
/* Output: PDF and image files, built in the browser                        */
/* ----------------------------------------------------------------------- */

// The notice is rendered to a 300 dpi A4 canvas; the PDF is that one image
// on one A4 page. Nothing depends on the browser's print dialog (margins,
// scaling, headers), so every browser produces the same file.
const PAGE_PX = { landscape: [3508, 2480], portrait: [2480, 3508] };
const PAGE_PT = { landscape: [841.89, 595.28], portrait: [595.28, 841.89] };
const RENDER_TIMEOUT = 30000;

// Same files and ranges as the @font-face rules in styles.css. They are
// inlined into the render as data URLs, so the image never misses the font.
const FONT_FILES = [
  {
    url: 'fonts/noto-sans-hebrew-hebrew.woff2',
    range: 'U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F',
  },
  {
    url: 'fonts/noto-sans-hebrew-latin.woff2',
    range:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
];

// Safari (and every iOS browser) often leaves fonts out of the first render.
const isWebKit =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (/Safari\//.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Firefox/.test(navigator.userAgent));
const isTouch = window.matchMedia('(pointer: coarse)').matches;

const exportDialog = document.getElementById('export-dialog');
const exportButtons = [...document.querySelectorAll('[data-action]')];

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

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms)),
  ]);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`Could not encode ${type}`))),
      type,
      quality
    )
  );
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
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

let fontEmbedCss;
function loadFontEmbedCss() {
  fontEmbedCss ??= Promise.all(
    FONT_FILES.map(async ({ url, range }) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Font ${url}: ${response.status}`);
      const dataUrl = await blobToDataUrl(await response.blob());
      return `@font-face { font-family: "Noto Sans Hebrew"; src: url(${dataUrl}) format("woff2"); font-weight: 100 900; font-stretch: 62.5% 100%; unicode-range: ${range}; }`;
    })
  )
    .then((rules) => rules.join('\n'))
    .catch((error) => {
      fontEmbedCss = null;
      throw error;
    });
  return fontEmbedCss;
}

async function ensureFontsLoaded() {
  if (!document.fonts) return;
  await Promise.all(
    [500, 600, 800, 900].map((weight) =>
      document.fonts.load(`${weight} 40px "Noto Sans Hebrew"`, 'אבג 012')
    )
  );
  await document.fonts.ready;
  if (!document.fonts.check('900 40px "Noto Sans Hebrew"', 'אבג')) {
    throw new Error('Font not loaded');
  }
}

// Sanity check of a render: the frame must be there, and text inside it. Catches blank and font-less
// renders before anyone downloads them.
function inspectRender(canvas) {
  const width = 400;
  const height = Math.round((width * canvas.height) / canvas.width);
  const small = document.createElement('canvas');
  small.width = width;
  small.height = height;
  const context = small.getContext('2d', { willReadFrequently: true });
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(canvas, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const isInk = (x, y) => data[(y * width + x) * 4] < 160;

  // The frame sits 4-5% in from the edge: look for it along the middle row.
  let frame = false;
  const middle = Math.round(height / 2);
  for (let x = 0; x < width * 0.1; x++) frame ||= isInk(x, middle);

  // Text: inked share of the area well inside the frame.
  let ink = 0;
  let total = 0;
  for (let y = Math.round(height * 0.12); y < height * 0.88; y++) {
    for (let x = Math.round(width * 0.12); x < width * 0.88; x++) {
      total++;
      if (isInk(x, y)) ink++;
    }
  }
  return { frame, ink: ink / total };
}

// Build a clean, print-size copy of the notice off screen and render it.
async function renderNoticeCanvas() {
  const [htmlToImage, fontCss] = await Promise.all([
    loadImageLibrary(),
    loadFontEmbedCss(),
    ensureFontsLoaded(),
  ]);

  const [width, height] = PAGE_PX[notice.dataset.orientation];
  const holder = document.createElement('div');
  holder.className = 'export-holder';
  const copy = notice.cloneNode(true);
  copy.removeAttribute('id');
  copy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
  // Drop unfilled examples, and lines left incomplete without them.
  copy.querySelectorAll('p:not(.notice-name) .ghost').forEach((element) =>
    element.closest('p').remove()
  );
  copy.querySelectorAll('.ghost').forEach((element) => element.remove());
  copy.classList.add('is-export');
  copy.classList.remove('is-clean');
  copy.style.width = `${width}px`;
  holder.append(copy);
  document.body.append(holder);

  try {
    // Fit again at the final size, so rounding at this scale can't clip.
    fitNotice(copy);
    const expectInk = Boolean(copy.querySelector('.notice-frame').textContent.trim());
    const options = {
      width,
      height,
      pixelRatio: 1,
      backgroundColor: '#ffffff',
      fontEmbedCSS: fontCss,
    };

    const attempts = isWebKit ? 3 : 2;
    let canvas;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      canvas = await htmlToImage.toCanvas(copy, options);
      if (isWebKit && attempt === 1) continue; // warm-up pass, see isWebKit
      const result = inspectRender(canvas);
      if (result.frame && (!expectInk || result.ink > 0.002)) return canvas;
      console.warn('Render check failed, retrying', result);
    }
    throw new Error('Render check failed');
  } finally {
    holder.remove();
  }
}

// A one-page PDF holding the notice as a JPEG, sized exactly to A4.
function buildPdf(jpegBytes, pixelWidth, pixelHeight, orientation, title) {
  const [pageWidth, pageHeight] = PAGE_PT[orientation];
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let length = 0;
  const write = (data) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (number, ...body) => {
    offsets[number] = length;
    write(`${number} 0 obj\n`);
    body.forEach(write);
    write('\nendobj\n');
  };
  // PDF text strings: UTF-16BE with a byte-order mark, as hex.
  const pdfText = (text) =>
    `<FEFF${[...text]
      .map((char) => char.charCodeAt(0).toString(16).padStart(4, '0'))
      .join('')}>`;

  const drawing = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Notice Do Q`;
  write('%PDF-1.4\n%âãÏÓ\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      '/Resources << /XObject << /Notice 4 0 R >> >> /Contents 5 0 R >>'
  );
  object(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    jpegBytes,
    '\nendstream'
  );
  object(5, `<< /Length ${drawing.length} >>\nstream\n${drawing}\nendstream`);
  object(6, `<< /Title ${pdfText(title)} /Creator (EvelPost) >>`);

  const xref = length;
  write(`xref\n0 7\n0000000000 65535 f \n`);
  for (let number = 1; number <= 6; number++) {
    write(`${String(offsets[number]).padStart(10, '0')} 00000 n \n`);
  }
  write(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}

// A lighter copy of the render for the result dialog (and for saving by
// long-press when downloads are blocked, e.g. in in-app browsers).
async function createPreview(canvas) {
  const width = 1600;
  const small = document.createElement('canvas');
  small.width = width;
  small.height = Math.round((width * canvas.height) / canvas.width);
  const context = small.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(canvas, 0, 0, small.width, small.height);
  return canvasToBlob(small, 'image/jpeg', 0.9);
}

async function createFile(kind, canvas) {
  const preview = await createPreview(canvas);
  if (kind === 'image') {
    const png = await canvasToBlob(canvas, 'image/png');
    return { file: new File([png], noticeFileName('png'), { type: 'image/png' }), preview };
  }
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.92);
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  const pdf = buildPdf(bytes, canvas.width, canvas.height, notice.dataset.orientation, noticeFileName('pdf').slice(0, -4));
  return { file: new File([pdf], noticeFileName('pdf'), { type: 'application/pdf' }), preview };
}

function setBusy(activeButton) {
  exportButtons.forEach((button) => {
    button.disabled = Boolean(activeButton);
    if (button === activeButton) {
      button.dataset.label = button.textContent;
      button.textContent = 'מכינים את הקובץ…';
    } else if (!activeButton && button.dataset.label) {
      button.textContent = button.dataset.label;
      delete button.dataset.label;
    }
  });
}

let exportUrls = [];
function openDialog() {
  if (typeof exportDialog.showModal === 'function') exportDialog.showModal();
  else exportDialog.setAttribute('open', '');
}

function closeDialog() {
  if (typeof exportDialog.close === 'function') exportDialog.close();
  else exportDialog.removeAttribute('open');
}

exportDialog.addEventListener('close', () => {
  exportUrls.forEach((url) => URL.revokeObjectURL(url));
  exportUrls = [];
});

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  exportUrls.push(url);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
}

// Show the finished file. Saving, sharing and opening happen from here, on a
// fresh tap: phones refuse to share after a long render, and seeing the
// result first means nobody downloads a surprise.
async function showResult(kind, file, preview) {
  exportDialog.dataset.mode = 'ready';
  const previewUrl = URL.createObjectURL(preview);
  exportUrls.push(previewUrl);
  const previewImage = document.getElementById('export-preview');
  previewImage.src = previewUrl;
  try {
    await previewImage.decode(); // open with the picture already showing
  } catch (error) {
    // Older browsers: it will appear when ready.
  }
  document.getElementById('export-title').textContent =
    kind === 'pdf' ? 'קובץ ה-PDF מוכן' : 'התמונה מוכנה';

  const shareButton = document.getElementById('export-share');
  const downloadButton = document.getElementById('export-download');
  const openButton = document.getElementById('export-open');
  const canShare = isTouch && navigator.canShare?.({ files: [file] });
  shareButton.hidden = !canShare;
  openButton.hidden = kind !== 'pdf' || isTouch;
  downloadButton.classList.toggle('button-secondary', Boolean(canShare));

  shareButton.onclick = async () => {
    try {
      await navigator.share({ files: [file], title: 'מודעת אבל' });
    } catch (error) {
      if (error.name !== 'AbortError') downloadFile(file);
    }
  };
  downloadButton.onclick = () => {
    downloadFile(file);
    showStatus('הקובץ נשמר');
  };
  openButton.onclick = () => {
    const url = URL.createObjectURL(file);
    exportUrls.push(url);
    if (!window.open(url, '_blank')) downloadFile(file);
  };
  openDialog();
  (canShare ? shareButton : downloadButton).focus();
}

function showFailure(kind) {
  exportDialog.dataset.mode = 'error';
  document.getElementById('export-title').textContent = 'משהו השתבש ביצירת הקובץ';
  document.getElementById('export-retry').onclick = () => {
    closeDialog();
    exportFile(kind);
  };
  openDialog();
}

let exporting = false;
async function exportFile(kind, button) {
  if (exporting) return;
  exporting = true;
  setBusy(button);
  try {
    const canvas = await withTimeout(renderNoticeCanvas(), RENDER_TIMEOUT);
    const { file, preview } = await createFile(kind, canvas);
    await showResult(kind, file, preview);
  } catch (error) {
    console.error('Export failed:', error);
    showFailure(kind);
  } finally {
    exporting = false;
    setBusy(null);
  }
}

// Fallback: the browser's own print dialog, with the print stylesheet.
function printDirectly() {
  closeDialog();
  notice.classList.add('is-clean');
  fitNotice();
  window.print();
}

window.addEventListener('afterprint', () => updateCleanMode());

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

exportButtons.forEach((button) =>
  button.addEventListener('click', () => {
    if (button.dataset.action === 'print') printDirectly();
    else exportFile(button.dataset.action, button);
  })
);
document.getElementById('export-print').addEventListener('click', printDirectly);
document.getElementById('export-close').addEventListener('click', closeDialog);
document.getElementById('export-error-close').addEventListener('click', closeDialog);

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
