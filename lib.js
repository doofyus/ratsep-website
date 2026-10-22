const THEMES = ['light', 'dark'];

export function readTheme(storage) {
  try {
    const value = storage.getItem('theme');
    return THEMES.includes(value) ? value : null;
  } catch {
    return null;
  }
}

export function initialTheme(stored, prefersDark) {
  return stored ?? (prefersDark ? 'dark' : 'light');
}

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrast(hexA, hexB) {
  const [hi, lo] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

export function nextId(cycle, current) {
  const i = cycle.indexOf(current);
  return i === -1 ? cycle[0] : cycle[(i + 1) % cycle.length];
}

export function shouldRun({ reduced, hovered, focused, hidden }) {
  return !(reduced || hovered || focused || hidden);
}
