import { nextId, shouldRun } from './lib.js';

const root = document.documentElement;

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
});

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function initShowcase(figure) {
  const cycle = (figure.dataset.cycle || '').split(/\s+/).filter(Boolean);
  const interval = Number(figure.dataset.interval) || 4500;
  const swapDelay = Number(figure.dataset.swapDelay) || 0;
  const morphIds = (figure.dataset.morphIds || '').split(/\s+/).filter(Boolean);
  const buttons = [...figure.querySelectorAll('button[data-id]')];
  const state = { hovered: false, focused: false };
  let timer = 0;
  let swap = 0;

  const apply = (id) => {
    const previous = figure.dataset.sel;
    if (morphIds.length) figure.classList.toggle('morph', morphIds.includes(previous) !== morphIds.includes(id));
    figure.dataset.sel = id;
    for (const el of figure.querySelectorAll('[data-part]')) el.classList.toggle('on', el.dataset.part.split(' ').includes(id));
    for (const el of figure.querySelectorAll('[data-dim]')) el.classList.toggle('dim', el.dataset.dim.split(' ').includes(id));
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.id === id));
  };

  const select = (id) => {
    if (id === figure.dataset.sel) return;
    clearTimeout(swap);
    const delay = reducedQuery.matches ? 0 : swapDelay;
    if (!delay) return apply(id);
    figure.classList.add('fading');
    swap = setTimeout(() => { figure.classList.remove('fading'); apply(id); }, delay);
  };

  const schedule = () => {
    clearTimeout(timer);
    if (!cycle.length || !shouldRun({ reduced: reducedQuery.matches, hidden: document.hidden, ...state })) return;
    timer = setTimeout(() => { select(nextId(cycle, figure.dataset.sel)); schedule(); }, interval);
  };

  for (const b of buttons) b.addEventListener('click', () => { select(b.dataset.id); schedule(); });
  figure.addEventListener('pointerenter', () => { state.hovered = true; schedule(); });
  figure.addEventListener('pointerleave', () => { state.hovered = false; schedule(); });
  figure.addEventListener('focusin', () => { state.focused = true; schedule(); });
  figure.addEventListener('focusout', (e) => { if (!figure.contains(e.relatedTarget)) { state.focused = false; schedule(); } });
  document.addEventListener('visibilitychange', schedule);
  reducedQuery.addEventListener('change', schedule);
  schedule();
}

document.querySelectorAll('.showcase').forEach(initShowcase);
