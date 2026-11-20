// Boot: load the trophy list, restore progress, wire the tracker, tabs and
// deep links (#tab=roadmap, #trophy=28, #spoilers=on, #demo=13 for screenshots).
import { loadStoredEarned, saveStoredEarned, clearStoredEarned, exportProgressFile, parseImportedProgress, demoEarnedSet } from './store.js';
import { renderProgressCard, renderTrophyList, renderDetailPanel, renderRoadmap, renderMissables, renderSources } from './views.js';

const state = {
  trophies: [],
  earned: new Set(),
  kind: 'all',
  grade: 'all',
  query: '',
  spoilers: false,
  earnedOnly: false,
  selectedId: null,
  demo: false,
};

function readHashState() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (params.has('tab')) switchTab(params.get('tab'));
  if (params.has('kind')) setKind(params.get('kind'));
  if (params.has('grade')) {
    state.grade = params.get('grade');
    document.getElementById('gradeSelect').value = state.grade;
  }
  if (params.get('spoilers') === 'on') {
    state.spoilers = true;
    document.getElementById('spoilerToggle').checked = true;
  }
  if (params.get('earned') === 'only') {
    state.earnedOnly = true;
    document.getElementById('earnedToggle').checked = true;
  }
  if (params.has('q')) {
    state.query = params.get('q');
    document.getElementById('searchInput').value = state.query;
  }
  if (params.has('trophy')) state.selectedId = Number(params.get('trophy'));
  if (params.has('demo')) {
    const n = Number(params.get('demo'));
    if (Number.isFinite(n) && n > 0) {
      state.earned = demoEarnedSet(state.trophies, n);
      state.demo = true;
    }
  }
}

function switchTab(name) {
  const valid = ['tracker', 'roadmap', 'missables', 'sources'];
  if (!valid.includes(name)) name = 'tracker';
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${name}`));
}

function setKind(kind) {
  const valid = ['all', 'story', 'missable', 'collectibles', 'activities', 'online'];
  if (!valid.includes(kind)) kind = 'all';
  state.kind = kind;
  document.querySelectorAll('#kindPills .pill').forEach((b) => b.classList.toggle('active', b.dataset.kind === kind));
}

function renderAll() {
  renderProgressCard(state.trophies, state.earned);
  renderTrophyList(state.trophies, state, toggleEarned, selectTrophy);
  renderDetailPanel(state.trophies, state, toggleEarned, selectNextTrophy);
  renderRoadmap(state.trophies, state.earned);
}

function persistEarned() {
  if (!state.demo) saveStoredEarned(state.earned);
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  persistEarned();
  renderAll();
}

function selectTrophy(id) {
  state.selectedId = id;
  renderTrophyList(state.trophies, state, toggleEarned, selectTrophy);
  renderDetailPanel(state.trophies, state, toggleEarned, selectNextTrophy);
  document.getElementById('detailPanel').scrollIntoView({ block: 'nearest' });
}

function selectNextTrophy(currentId) {
  const idx = state.trophies.findIndex((t) => t.id === currentId);
  const next = state.trophies[(idx + 1) % state.trophies.length];
  selectTrophy(next.id);
}

async function bootGuide() {
  const response = await fetch('data/trophies.json');
  const data = await response.json();
  state.trophies = data.trophies;
  state.earned = loadStoredEarned();
  state.selectedId = 28; // Open on the one missable trophy, so its guide is visible at a glance.
  readHashState();
  renderAll();
  renderMissables(state.trophies);
  renderSources();

  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  document.querySelectorAll('#kindPills .pill').forEach((b) => b.addEventListener('click', () => { setKind(b.dataset.kind); renderAll(); }));
  document.getElementById('gradeSelect').addEventListener('change', (e) => { state.grade = e.target.value; renderAll(); });
  document.getElementById('searchInput').addEventListener('input', (e) => { state.query = e.target.value; renderAll(); });
  document.getElementById('spoilerToggle').addEventListener('change', (e) => { state.spoilers = e.target.checked; renderAll(); });
  document.getElementById('earnedToggle').addEventListener('change', (e) => { state.earnedOnly = e.target.checked; renderAll(); });
  document.getElementById('exportBtn').addEventListener('click', () => exportProgressFile(state.earned));
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      state.earned = parseImportedProgress(text);
      persistEarned();
      renderAll();
    } catch (err) {
      alert(`Could not import that file: ${err.message}`);
    }
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all earned trophies? This cannot be undone.')) {
      state.earned = new Set();
      clearStoredEarned();
      renderAll();
    }
  });
  document.getElementById('missableBanner').querySelector('[data-goto]').addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('missables');
  });
}

bootGuide();
