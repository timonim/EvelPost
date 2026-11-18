'use strict';

// Demo mode (?demo): a soft cursor taps each part of the notice and the
// words write themselves in, then the finished notice is shown. It plays only
// while visible, stops for good the moment the visitor touches the page, and
// never moves focus (which would scroll a page embedding this one).

(() => {
  const DEMO_NOTICE = [
    { step: 'opening', fields: [['relation', 'אבינו, סבנו ובעלנו האהוב']] },
    { step: 'name', fields: [['first-name', 'אברהם'], ['last-name', 'כהן']] },
    {
      step: 'funeral',
      fields: [
        ['date-of-burial', nextWeekday()],
        ['hour-of-burial', '14:30'],
        ['location-of-burial', 'בית העלמין ירקון, שער ב׳'],
      ],
    },
    { step: 'shiva', fields: [['shiva', 'השבעה תתקיים בבית המשפחה\nרחוב הרצל 12, תל אביב']] },
    { step: 'mourners', fields: [['grievers', 'רעייתו: שרה\nילדיו: דוד, מרים ויוסף\nהנכדים והנינים']] },
  ];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = false;
  let stopped = false;
  let wake = null;

  const style = document.createElement('style');
  style.textContent = `
    .demo-cursor {
      position: fixed;
      z-index: 20;
      top: 0;
      left: 0;
      width: 26px;
      height: 26px;
      margin: -13px 0 0 -13px;
      border-radius: 50%;
      background: rgba(147, 107, 81, 0.35);
      box-shadow: 0 0 0 2px #fff, 0 2px 8px rgba(58, 50, 43, 0.35);
      pointer-events: none;
      opacity: 0;
      transition: transform 0.7s cubic-bezier(0.45, 0, 0.2, 1), opacity 0.4s ease;
    }
    .demo-cursor.is-visible { opacity: 1; }
    .demo-cursor.is-tapping { animation: demo-tap 0.35s ease; }
    @keyframes demo-tap {
      50% { box-shadow: 0 0 0 2px #fff, 0 0 0 10px rgba(147, 107, 81, 0.25); }
    }
  `;
  document.head.append(style);

  const cursor = document.createElement('div');
  cursor.className = 'demo-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.append(cursor);

  function nextWeekday() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  // Waits that hold while the demo is off screen, and end it when stopped.
  async function wait(ms) {
    let left = ms;
    while (left > 0) {
      if (stopped) throw new Error('stopped');
      if (!visible) {
        await new Promise((resolve) => (wake = resolve));
        continue;
      }
      const step = Math.min(left, 100);
      await new Promise((resolve) => setTimeout(resolve, step));
      left -= step;
    }
    if (stopped) throw new Error('stopped');
  }

  async function moveTo(element) {
    // Bring the target into view by scrolling this document only
    // (scrollIntoView would also scroll the page around an iframe).
    let rect = element.getBoundingClientRect();
    const top = document.querySelector('.stage').getBoundingClientRect().bottom;
    if (rect.bottom > innerHeight - 16 || rect.top < 0) {
      const sticky = getComputedStyle(document.querySelector('.stage')).position === 'sticky';
      window.scrollBy({ top: rect.top - (sticky ? top : 0) - 24, behavior: 'smooth' });
      await wait(500);
      rect = element.getBoundingClientRect();
    }
    const x = rect.left + Math.min(rect.width / 2, 120);
    const y = rect.top + Math.min(rect.height / 2, 28);
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    cursor.classList.add('is-visible');
    await wait(750);
  }

  async function tap(element) {
    await moveTo(element);
    cursor.classList.remove('is-tapping');
    void cursor.offsetWidth; // restart the animation
    cursor.classList.add('is-tapping');
    await wait(200);
  }

  function setValue(control, value) {
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function type(control, text) {
    await moveTo(control);
    if (control.type === 'date' || control.type === 'time') {
      await wait(250);
      setValue(control, text);
      await wait(450);
      return;
    }
    for (const char of text) {
      setValue(control, control.value + char);
      await wait(char === '\n' ? 280 : 45 + Math.random() * 45);
    }
    await wait(450);
  }

  function clearNotice() {
    form.reset();
    update();
    goToStep('opening');
  }

  function fillInstantly() {
    DEMO_NOTICE.forEach(({ fields }) =>
      fields.forEach(([id, value]) => setValue(document.getElementById(id), value))
    );
    goToStep('finish');
  }

  async function play() {
    clearNotice();
    // First appear over the notice, not in a corner.
    const start = notice.getBoundingClientRect();
    cursor.style.transition = 'none';
    cursor.style.transform = `translate(${start.left + start.width / 2}px, ${start.top + start.height / 2}px)`;
    void cursor.offsetWidth;
    cursor.style.transition = '';
    await wait(1600); // the empty notice, with its examples
    for (const { step, fields } of DEMO_NOTICE) {
      await tap(notice.querySelector(`.region[data-step="${step}"]`));
      goToStep(step);
      await wait(350);
      for (const [id, value] of fields) await type(document.getElementById(id), value);
    }
    await tap(form.querySelector('.step-tab[data-step="finish"]'));
    goToStep('finish');
    cursor.classList.remove('is-visible');
    await wait(4500); // the finished notice, exactly as it will be saved
  }

  async function loop() {
    for (;;) {
      try {
        await play();
      } catch (error) {
        return; // stopped
      }
    }
  }

  // The visitor takes over: stop, and leave the notice as it is.
  function stop(event) {
    if (!event.isTrusted || stopped) return;
    stopped = true;
    cursor.remove();
    wake?.();
    showStatus('עכשיו תורכם: לחצו על כל חלק במודעה');
  }
  ['pointerdown', 'keydown'].forEach((type) =>
    window.addEventListener(type, stop, { capture: true })
  );

  if (reducedMotion) {
    fillInstantly();
    return;
  }

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) wake?.();
  }, { threshold: 0.35 }).observe(notice);

  loop();
})();
