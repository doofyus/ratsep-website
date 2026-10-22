import { nextId, shouldRun, isHover, headerVisible, topColor } from './lib.js';

const root = document.documentElement;

const bands = [...document.querySelectorAll('.band')];
const paintTop = () => {
  const regions = bands.map((band) => {
    const { top, bottom } = band.getBoundingClientRect();
    return { top, bottom, color: getComputedStyle(band).backgroundColor };
  });
  const color = topColor(regions, getComputedStyle(document.body).backgroundColor);
  root.style.setProperty('--top', color);
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = color;
};
paintTop();

for (const toggle of document.querySelectorAll('.theme-toggle')) {
  toggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    paintTop();
    try { localStorage.setItem('theme', next); } catch {}
  });
}

const mini = document.querySelector('.mini-header');
let lastY = window.scrollY;
let shown = false;
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    paintTop();
    const y = window.scrollY;
    const next = headerVisible({ y, lastY, threshold: 400, current: shown });
    lastY = y;
    if (next === shown || !mini) return;
    shown = next;
    mini.classList.toggle('show', shown);
    mini.toggleAttribute('inert', !shown);
    mini.setAttribute('aria-hidden', String(!shown));
    root.classList.toggle('header-on', shown);
  });
}, { passive: true });

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function initShowcase(figure) {
  const cycle = (figure.dataset.cycle || '').split(/\s+/).filter(Boolean);
  const interval = Number(figure.dataset.interval) || 4500;
  const swapDelay = Number(figure.dataset.swapDelay) || 0;
  const morphIds = (figure.dataset.morphIds || '').split(/\s+/).filter(Boolean);
  const buttons = [...figure.querySelectorAll('button[data-id]')];
  const state = { hovered: false, focused: false, offscreen: 'IntersectionObserver' in window };
  let seen = false;
  let timer = 0;
  let swap = 0;

  const apply = (id) => {
    const previous = figure.dataset.sel;
    if (morphIds.length) figure.classList.toggle('morph', morphIds.includes(previous) !== morphIds.includes(id));
    figure.dataset.sel = id;
    for (const el of figure.querySelectorAll('[data-part]')) el.classList.toggle('on', el.dataset.part.split(' ').includes(id));
    for (const el of figure.querySelectorAll('[data-dim]')) el.classList.toggle('dim', el.dataset.dim.split(' ').includes(id));
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.id === id));
    const label = buttons.find((b) => b.dataset.id === id)?.dataset.label;
    if (label) figure.querySelector('svg')?.setAttribute('aria-label', label);
  };

  const select = (id) => {
    clearTimeout(swap);
    figure.classList.remove('fading');
    if (id === figure.dataset.sel) return;
    const delay = reducedQuery.matches ? 0 : swapDelay;
    if (!delay) return apply(id);
    figure.classList.add('fading');
    swap = setTimeout(() => { figure.classList.remove('fading'); apply(id); }, delay);
  };

  const schedule = () => {
    clearTimeout(timer);
    const { hovered, focused, offscreen } = state;
    if (!cycle.length || !shouldRun({ reduced: reducedQuery.matches, hidden: document.hidden || offscreen, hovered, focused })) return;
    timer = setTimeout(() => { select(nextId(cycle, figure.dataset.sel)); schedule(); }, interval);
  };

  for (const b of buttons) {
    b.addEventListener('click', () => { select(b.dataset.id); schedule(); });
    if ('hoverSelect' in figure.dataset) {
      b.addEventListener('pointerenter', (e) => { if (isHover(e)) select(b.dataset.id); });
      b.addEventListener('focus', () => select(b.dataset.id));
    }
  }
  figure.addEventListener('pointerenter', (e) => { if (isHover(e)) { state.hovered = true; schedule(); } });
  figure.addEventListener('pointerleave', (e) => { if (isHover(e)) { state.hovered = false; schedule(); } });
  figure.addEventListener('focusin', (e) => { state.focused = e.target.matches(':focus-visible'); schedule(); });
  figure.addEventListener('focusout', (e) => { if (!figure.contains(e.relatedTarget)) { state.focused = false; schedule(); } });
  document.addEventListener('visibilitychange', schedule);
  reducedQuery.addEventListener('change', schedule);

  if (state.offscreen) {
    new IntersectionObserver((entries) => {
      const visible = entries.at(-1).intersectionRatio >= 0.35;
      state.offscreen = !visible;
      if (visible && !seen) {
        seen = true;
        for (const el of figure.querySelectorAll('.oc-content.on')) {
          el.classList.remove('on');
          el.getBBox();
          el.classList.add('on');
        }
      }
      schedule();
    }, { threshold: [0, 0.35] }).observe(figure);
  }
  schedule();
}

document.querySelectorAll('.showcase').forEach(initShowcase);
