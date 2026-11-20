// Leonida Trophy Compass — an offline tracker for the 55 GTA VI trophies.
// All data comes from app/data/trophies.json; progress lives in localStorage
// and never leaves the browser except through Export.
const STORE_KEY = 'leonida-trophy-compass-v1';
const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detailPanel');
const summaryEl = document.getElementById('filterSummary');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const spoilerEl = document.getElementById('spoilerToggle');
const earnedOnlyEl = document.getElementById('earnedOnly');

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const sources = doc.sources || {};

let earned = new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'));
let kind = 'all';
let selectedId = null;

const ROADMAP = [
  { n: 1, title: 'Story — Chapters 1 & 2', intro: 'Play the opening chapters in order. Do the meditation spots NOW: one Chapter 1 spot is reported to vanish after the chapter closes.', ids: [2, 3, 4, 8, 9, 10] },
  { n: 2, title: 'Story — Chapters 3 & 4 and the finale', intro: 'Finish the campaign. The finale gold unlocks here, and nothing in these chapters is reported missable.', ids: [5, 6, 7, 11, 12, 13] },
  { n: 3, title: 'Stranger strands', intro: 'Meet the strangers across Leonida and finish their mission chains — five named finals plus three more strands make the silver.', ids: [22, 23, 24, 25, 26, 27, 29] },
  { n: 4, title: 'Collectibles', intro: 'Cards, WAiNK spots, vehicles and the map itself. The meditation trophy belongs here — and it belongs in Chapter 1.', ids: [28, 30, 31, 35, 42] },
  { n: 5, title: 'Activities & challenges', intro: 'Stunts, shooting range golds, races, fishing, arcade games and the 50 challenges. A long, satisfying grind — do it after the story.', ids: [15, 16, 17, 18, 19, 20, 21, 32, 36] },
  { n: 6, title: 'Robberies & money', intro: 'Vaults, trucks, shops and gangs — then wash the money and spend it. The money trophies feed each other.', ids: [33, 34, 39, 40, 41, 43, 52, 53, 54, 55] },
  { n: 7, title: 'World moments & oddities', intro: 'The strange, quiet and funny trophies: the beach, the showroom, the bowling alley, the airport, the choices you make along the way.', ids: [37, 38, 44, 45, 46, 47, 48, 49, 50, 51] },
  { n: 8, title: '100% completion & platinum', intro: 'When every other trophy is done, the in-game 100% counter should read full — and the platinum lands with it.', ids: [1, 14] },
];

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
}

function gradeLabel(t) {
  return t.grade.charAt(0).toUpperCase() + t.grade.slice(1);
}

function sourceLine(t) {
  return (t.src || []).map((key) => {
    const s = sources[key];
    if (!s) return key;
    return `<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>`;
  }).join(' · ');
}

function masked(t) {
  return spoilerEl.checked && t.hidden && !earned.has(t.id);
}

function visibleTrophies() {
  const q = searchEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (kind === 'online') return false;
    if (kind !== 'all' && t.kind !== kind) return false;
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (earnedOnlyEl.checked && !earned.has(t.id)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  const pct = Math.round((done / total) * 100);
  document.getElementById('earnedCount').textContent = done;
  document.getElementById('earnedPct').textContent = `${pct}% earned — ${total - done} to go`;
  document.getElementById('progressFill').style.width = `${pct}%`;
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) {
    totals[t.grade] += 1;
    if (earned.has(t.id)) counts[t.grade] += 1;
  }
  document.getElementById('countPlatinum').textContent = `${counts.platinum}/${totals.platinum}`;
  document.getElementById('countGold').textContent = `${counts.gold}/${totals.gold}`;
  document.getElementById('countSilver').textContent = `${counts.silver}/${totals.silver}`;
  document.getElementById('countBronze').textContent = `${counts.bronze}/${totals.bronze}`;
  let stage = 1;
  for (const s of ROADMAP) {
    if (s.ids.every((id) => earned.has(id))) stage = s.n + 1;
    else break;
  }
  document.getElementById('roadmapNote').textContent =
    stage > 8 ? 'Roadmap complete — platinum is yours' : `Roadmap stage ${stage} of 8 · ${ROADMAP[stage - 1].title}`;
}

function renderList() {
  const rows = visibleTrophies();
  summaryEl.textContent = kind === 'online'
    ? 'Online: 0 trophies — the official list has no online trophies. Everything here is earned solo.'
    : `Showing ${rows.length} of 55 trophies${earnedOnlyEl.checked ? ' (earned only)' : ''}${spoilerEl.checked ? ' · spoiler-safe: 28 hidden trophies masked until earned' : ''}.`;
  listEl.replaceChildren();
  for (const t of rows) {
    const row = document.createElement('div');
    row.className = 'trophy-row' + (earned.has(t.id) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
    row.setAttribute('role', 'listitem');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', (event) => {
      event.stopPropagation();
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      save();
      renderProgress();
      renderList();
    });
    const main = document.createElement('div');
    main.className = 'trophy-main';
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = masked(t) ? 'Hidden trophy — earn it to reveal its name' : t.name;
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = masked(t) ? 'This trophy is hidden on PlayStation until earned.' : t.description;
    const badges = document.createElement('div');
    badges.className = 'trophy-badges';
    const grade = document.createElement('span');
    grade.className = `badge grade-${t.grade}`;
    grade.textContent = gradeLabel(t);
    badges.append(grade);
    if (t.hidden) {
      const h = document.createElement('span');
      h.className = 'badge hidden';
      h.textContent = 'Hidden on PSN';
      badges.append(h);
    }
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'badge missable';
      m.textContent = 'Potentially missable';
      badges.append(m);
    }
    if (t.count) {
      const c = document.createElement('span');
      c.className = 'badge count';
      c.textContent = t.count.toLocaleString('en-US');
      badges.append(c);
    }
    main.append(name, desc, badges);
    row.append(box, main);
    row.addEventListener('click', () => selectTrophy(t.id));
    listEl.append(row);
  }
}

function selectTrophy(id) {
  selectedId = id;
  const t = byId.get(id);
  if (!t) return;
  location.hash = `trophy-${id}`;
  const warn = t.missable
    ? `<div class="detail-warning"><strong>Potentially missable.</strong> Do the 18 meditation spots in Chapter 1 — the balcony spot is reported to disappear after Chapter 1, with no mission replay and no New Game+. Keep a Chapter 1 manual save until this pops.</div>`
    : '';
  const countLine = t.count
    ? `<p class="source-line">Target count: <strong>${t.count.toLocaleString('en-US')}</strong> — PlayStation tracks this total for you.</p>`
    : '';
  detailEl.innerHTML = `
    <h3>${t.name}</h3>
    <p class="official">${t.description}</p>
    <div class="trophy-badges">
      <span class="badge grade-${t.grade}">${gradeLabel(t)}</span>
      ${t.hidden ? '<span class="badge hidden">Hidden on PSN</span>' : ''}
      ${t.missable ? '<span class="badge missable">Potentially missable</span>' : ''}
    </div>
    ${warn}
    <p class="guide-label">Guide — in our own words</p>
    <p class="guide-text">${t.guide}</p>
    ${countLine}
    <p class="source-line">Sources: ${sourceLine(t)}</p>
    <p class="source-line">Kind: ${t.kind} · Roadmap stage ${t.stage} of 8 · ${t.hidden ? 'Hidden on PSN until earned' : 'Visible on PSN'}</p>`;
  renderList();
}

function renderRoadmap() {
  const host = document.getElementById('roadmapStages');
  host.replaceChildren();
  for (const s of ROADMAP) {
    const done = s.ids.filter((id) => earned.has(id)).length;
    const card = document.createElement('div');
    card.className = 'roadmap-stage';
    const h = document.createElement('h3');
    h.innerHTML = `<span class="stage-num">Stage ${s.n}</span>${s.title} <span class="mini-grade">(${done}/${s.ids.length} earned)</span>`;
    const p = document.createElement('p');
    p.textContent = s.intro;
    const ul = document.createElement('ul');
    for (const id of s.ids) {
      const t = byId.get(id);
      const li = document.createElement('li');
      li.textContent = `${earned.has(id) ? '✓ ' : ''}${t.name} `;
      const g = document.createElement('span');
      g.className = 'mini-grade';
      g.textContent = t.grade;
      li.append(g);
      ul.append(li);
    }
    card.append(h, p, ul);
    host.append(card);
  }
}

function renderMissables() {
  const t = trophies.find((x) => x.missable);
  const host = document.getElementById('missablesBody');
  host.replaceChildren();
  const card = document.createElement('div');
  card.className = 'roadmap-stage';
  card.innerHTML = `<h3><span class="stage-num">⚠</span>${t.name}</h3>
    <p>${t.description}</p>
    <p>${t.guide}</p>
    <p class="source-line">Sources: ${sourceLine(t)}</p>`;
  host.append(card);
  const note = document.createElement('p');
  note.textContent = 'Every other trophy can be earned after the story ends. If you finish the story and something is still locked, it is a grind or a collectible — not a missed window.';
  host.append(note);
}

function renderSources() {
  const host = document.getElementById('sourcesBody');
  host.replaceChildren();
  const uses = {
    planetgta6: 'The trophy list itself — all 55 names, descriptions and grades, plus the 27 visible / 28 hidden split and the missable caveat.',
    keengamer: 'Platinum roadmap structure and the Chapter 1 meditation-spot warning.',
    outputlag: 'Trophy list cross-check and the missable consensus.',
    gtavibes: 'Trophy list cross-check and the missable consensus.',
    gamebyte: 'Early reporting on the list and why pre-November-18 social-media lists were not trusted.',
    gtasnaps: 'List status and the Rockstar-has-not-published note.',
    leonidaunlocked: 'Datamine history of the 55-trophy count and the leak timeline.',
    exophase: 'Source of the list as shown on PlayStation Network (via PlanetGTA6).',
    psnprofiles: 'Cross-check of the list as shown on PlayStation Network (via PlanetGTA6).',
  };
  for (const [key, s] of Object.entries(sources)) {
    const card = document.createElement('div');
    card.className = 'source-card';
    card.innerHTML = `<h3>${s.name}</h3><p><a href="${s.url}" target="_blank" rel="noopener">${s.url}</a></p><p>${uses[key] || 'Cited where used.'}</p>`;
    host.append(card);
  }
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === name);
    b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-panel').forEach((p) => {
    p.classList.toggle('active', p.id === `tab-${name}`);
  });
  if (name === 'roadmap') renderRoadmap();
  if (name === 'missables') renderMissables();
  if (name === 'sources') renderSources();
}

document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
document.querySelectorAll('#kindPills .pill').forEach((b) => b.addEventListener('click', () => {
  kind = b.dataset.kind;
  document.querySelectorAll('#kindPills .pill').forEach((p) => p.classList.toggle('active', p === b));
  renderList();
}));
searchEl.addEventListener('input', renderList);
gradeEl.addEventListener('change', renderList);
spoilerEl.addEventListener('change', renderList);
earnedOnlyEl.addEventListener('change', renderList);
document.getElementById('bannerOpen').addEventListener('click', () => {
  switchTab('tracker');
  selectTrophy(28);
  detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort((x, y) => x - y) }, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-trophy-progress.json';
  a.click();
});
document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    earned = new Set(ids.filter((id) => byId.has(id)));
    save();
    renderProgress();
    renderList();
    renderRoadmap();
  } catch {
    alert('That file could not be read as trophy progress.');
  }
  e.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies?')) return;
  earned = new Set();
  save();
  renderProgress();
  renderList();
  renderRoadmap();
});

// Deep links for sharing and for screenshots: ?shot=cover opens the missable
// trophy's guide with a small demo progress set; ?shot=roadmap / spoiler /
// sources open those views; #trophy-<id> opens one trophy's guide.
const params = new URLSearchParams(location.search);
if (params.get('demo') === '1') {
  for (const id of [2, 3, 8, 20, 21]) earned.add(id);
  save();
}
const shot = params.get('shot');
if (shot === 'roadmap') switchTab('roadmap');
else if (shot === 'sources') switchTab('sources');
else if (shot === 'missables') switchTab('missables');
else if (shot === 'spoiler') {
  spoilerEl.checked = true;
  gradeEl.value = 'silver';
  selectTrophy(15);
}
if (shot === 'cover' || shot === 'spoiler' || location.hash.startsWith('#trophy-')) {
  const id = shot === 'cover' ? 28 : Number(location.hash.replace('#trophy-', ''));
  if (byId.has(id)) selectTrophy(id);
}
renderProgress();
renderList();
renderRoadmap();
renderMissables();
renderSources();
