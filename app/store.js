// Progress store: earned trophies live in localStorage, never leave the device.
// A ?demo=N / #demo=N hash seeds N earned trophies in memory only, for screenshots.
const STORAGE_KEY = 'leonida-platinum-atlas-progress-v1';

export function loadStoredEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((n) => Number.isInteger(n)));
  } catch {
    return new Set();
  }
}

export function saveStoredEarned(earnedIds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earnedIds].sort((a, b) => a - b)));
  } catch {
    // Private mode or storage full: progress still works for this session.
  }
}

export function clearStoredEarned() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function exportProgressFile(earnedIds) {
  const payload = {
    app: 'Leonida Platinum Atlas',
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earnedIds].sort((a, b) => a - b),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gta6-trophy-progress.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseImportedProgress(text) {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(list)) throw new Error('No earned list found in that file.');
  return new Set(list.filter((n) => Number.isInteger(n)));
}

// Demo seeding: mark the first N trophies earned, in memory only.
// Used by screenshot states (?demo=13); never written to localStorage.
export function demoEarnedSet(trophies, count) {
  const n = Math.max(0, Math.min(trophies.length, count));
  return new Set(trophies.slice(0, n).map((t) => t.id));
}
