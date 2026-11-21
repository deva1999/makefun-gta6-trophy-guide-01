// Leonida Platinum Fieldbook — tracker, roadmap, missables and sources.
// Static, offline: the only file it loads is its own data/trophies.json.
// Progress saves to localStorage; export / import move it as JSON.

const STORE_KEY = 'leonida-fieldbook-v1';
const DEMO_EARNED = [2, 3, 8, 10, 15, 20, 21, 33, 44, 46, 53, 54, 55];

const KIND_LABELS = {
  story: 'Story', strangers: 'Strangers', collectibles: 'Collectibles',
  activities: 'Activities', robbery: 'Robbery', money: 'Money',
  exploration: 'Exploration', platinum: 'Platinum', completion: '100%',
};
const KIND_PILLS = ['all', 'story', 'missable', 'collectibles', 'activities', 'robbery', 'money', 'strangers', 'exploration', 'online'];
const GRADE_LABELS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

// The 8-stage roadmap to the platinum, in play order, built from the
// official trophy descriptions. Each stage lists the trophies it covers.
const STAGES = [
  { n: 1, title: 'Chapter 1 — open the story, bank the one missable spot', blurb: 'Play the opening mission and finish Chapter 1. Before the chapter ends, meditate at the balcony spot for Positive Mental Attitude — it is only reachable here, and there is no mission replay.', ids: [2, 3, 28] },
  { n: 2, title: 'Chapters 2–4 — finish the story chapters', blurb: 'Play Chapters 2, 3 and 4 through, taking the named missions as they come. Keep a manual save at each chapter boundary.', ids: [4, 5, 6, 8, 9, 10, 11, 12, 13] },
  { n: 3, title: 'Finale — close the story, open the cleanup', blurb: 'Complete the final mission for the gold, and start thinking about A Long Road: 100% completion is the long tail of this roadmap, and the in-game stats page is its checklist.', ids: [7, 14] },
  { n: 4, title: 'Strangers across Leonida', blurb: 'Work the stranger strands as a block, after the story, when the whole map is open: the five named finales (Andy, Kenton, Billy, Randy, Tyrone), Bret\u2019s hunt, and three more strands for the Strangers & Freaks silver.', ids: [22, 23, 24, 25, 26, 27, 29] },
  { n: 5, title: 'Collectibles sweep', blurb: 'Cards, WAiNK It spots, vehicles and meditation spots. Fold the WAiNK shots and vehicle discoveries into exploring, and register ten vehicles to the Scooter Bros app as you find them.', ids: [30, 31, 35, 55] },
  { n: 6, title: 'Activities & skill', blurb: 'Stunts, races, drone races, the shooting range, fishing, the arcade and challenges — the skill block. Gold-medal the 42 shooting-range challenges in one focused session, and sample every activity type for Master of None.', ids: [15, 16, 17, 18, 19, 20, 21, 32, 36, 38] },
  { n: 7, title: 'Robberies & money', blurb: 'Vaults, trucks, shops and gang operations, then launder the Marked Bills and spend the clean cash. Five vault escapes, one operation per gang, $250,000 laundered, $100,000 spent, 8 garages bought.', ids: [33, 34, 39, 40, 41, 43, 52, 53, 54] },
  { n: 8, title: 'Open-world cleanup & the platinum', blurb: 'Explore the last of Leonida\u2019s 52 areas, take the odd one-off moments (the cocktail, the showroom, the bowling alley, the airport departure), and the platinum pops with the final trophy.', ids: [37, 42, 44, 45, 46, 47, 48, 49, 50, 51, 1] },
];

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const byName = new Map(trophies.map((t) => [t.name, t]));

// ---- state ----
const params = new URLSearchParams(location.search);
let earned = new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]').filter((n) => byName.has(n)));
if (params.get('demo') === '1' && earned.size === 0) {
  earned = new Set(DEMO_EARNED.map((id) => byId.get(id).name));
  save();
}
let view = params.get('view') ?? 'tracker';
let kind = params.get('kind') ?? 'all';
let grade = params.get('grade') ?? 'all';
let spoiler = params.get('spoiler') === 'on' || params.get('spoiler') === '1';
let earnedOnly = false;
let query = '';
let selectedId = Number(params.get('trophy') ?? '') || null;

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
}

// ---- elements ----
const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const detailEl = $('detail');

// ---- helpers ----
function isMasked(t) {
  return spoiler && t.hidden && !earned.has(t.name);
}
function gradeBadge(t) {
  return `<span class="badge ${t.grade}">${GRADE_LABELS[t.grade]}</span>`;
}
function trophyBadges(t) {
  let html = gradeBadge(t);
  if (t.hidden) html += ' <span class="badge hidden-flag">Hidden on PSN</span>';
  if (t.missable) html += ' <span class="badge missable-flag">Missable</span>';
  // The platinum trophy's kind is its grade, so a kind flag would repeat it.
  if (t.kind !== 'platinum') html += ` <span class="badge kind-flag">${KIND_LABELS[t.kind] ?? t.kind}</span>`;
  return html;
}
function fmtTarget(t) {
  if (t.target == null) return null;
  if (t.id === 52) return 'Target: $250,000 laundered';
  if (t.id === 53) return 'Target: $100,000 spent';
  const units = { 15: 'stunts', 17: 'gold medals', 18: 'locations', 19: 'races won', 25: 'strands', 28: 'meditation spots', 30: 'card sets', 31: 'WAiNK It locations', 32: 'challenges', 35: 'vehicles', 40: 'bank vaults', 42: 'areas', 43: 'gangs', 54: 'garages', 55: 'vehicles', 16: 'activity types', 36: 'enemies', 34: 'shops' };
  return `Target: ${t.target} ${units[t.id] ?? ''}`.trim();
}

// ---- progress card ----
function renderProgress() {
  $('earnedCount').textContent = earned.size;
  const pct = Math.round((earned.size / trophies.length) * 100);
  $('progressFill').style.width = `${pct}%`;
  $('progressPct').textContent = `${pct}% to platinum — ${trophies.length - earned.size} to go`;
  $('gradeCounts').innerHTML = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => {
      const total = trophies.filter((t) => t.grade === g).length;
      const got = trophies.filter((t) => t.grade === g && earned.has(t.name)).length;
      return `<li><b>${got}/${total}</b> ${GRADE_LABELS[g].toLowerCase()}</li>`;
    })
    .join('');
  $('stageCounts').textContent = STAGES.map((s) => {
    const got = s.ids.filter((id) => earned.has(byId.get(id).name)).length;
    return `Stage ${s.n}: ${got}/${s.ids.length}`;
  }).join(' · ');
}

// ---- tracker list ----
function visibleTrophies() {
  const q = query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (kind === 'missable' && !t.missable) return false;
    if (kind === 'online') return false; // the list has 0 online trophies
    if (kind !== 'all' && kind !== 'missable' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (earnedOnly && !earned.has(t.name)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderPills() {
  $('kindPills').innerHTML = KIND_PILLS.map((k) => {
    const count = k === 'all' ? trophies.length
      : k === 'missable' ? trophies.filter((t) => t.missable).length
      : k === 'online' ? 0
      : trophies.filter((t) => t.kind === k).length;
    const label = k === 'all' ? 'All 55' : k === 'missable' ? 'Missable' : k === 'online' ? 'Online (0)' : KIND_LABELS[k];
    return `<button type="button" class="pill${kind === k ? ' active' : ''}" data-kind="${k}">${label} · ${count}</button>`;
  }).join('');
  document.querySelectorAll('#kindPills .pill').forEach((b) => {
    b.addEventListener('click', () => { kind = b.dataset.kind; renderAll(); });
  });
}

function renderList() {
  const shown = visibleTrophies();
  $('listMeta').textContent = kind === 'online'
    ? '0 online trophies — the official list has none. Everything here is earned solo, offline.'
    : `Showing ${shown.length} of ${trophies.length} trophies · ${earned.size} earned`;
  listEl.replaceChildren();
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = `trophy-row${earned.has(t.name) ? ' earned' : ''}${selectedId === t.id ? ' selected' : ''}`;
    const masked = isMasked(t);
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${masked ? 'hidden trophy' : t.name} earned`);
    box.addEventListener('click', (e) => {
      e.stopPropagation();
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      save();
      renderAll();
    });
    const body = document.createElement('div');
    body.innerHTML = masked
      ? `<div class="trophy-name masked">Hidden trophy — earn it to reveal</div><div class="trophy-desc">A story trophy, hidden on PSN until earned. Turn spoiler-safe off to peek.</div><div class="trophy-badges">${gradeBadge(t)} <span class="badge hidden-flag">Hidden on PSN</span></div>`
      : `<div class="trophy-name"></div><div class="trophy-desc"></div><div class="trophy-badges">${trophyBadges(t)}</div>`;
    if (!masked) {
      body.querySelector('.trophy-name').textContent = t.name;
      body.querySelector('.trophy-desc').textContent = t.description;
    }
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'pill';
    go.textContent = 'Guide';
    go.addEventListener('click', (e) => { e.stopPropagation(); selectTrophy(t.id); });
    li.addEventListener('click', () => selectTrophy(t.id));
    li.append(box, body, go);
    listEl.append(li);
  }
}

// ---- detail panel ----
function selectTrophy(id) {
  selectedId = id;
  renderList();
  renderDetail();
  history.replaceState(null, '', `#trophy-${id}`);
}

function renderDetail() {
  const t = selectedId != null ? byId.get(selectedId) : null;
  if (!t) {
    detailEl.innerHTML = `<p class="empty"><strong>Pick a trophy</strong> to read its guide. Every guide is written in our own words and names its sources — a specific step with no citation scores nothing, so the citation comes first.</p><p class="empty">Start with the one that can be missed: <b>Positive Mental Attitude</b>, the Chapter 1 meditation spot.</p>`;
    return;
  }
  if (isMasked(t)) {
    detailEl.innerHTML = `<h2>Hidden trophy</h2><p class="official">This story trophy stays hidden on PSN until you earn it — and spoiler-safe is on, so its name and description are masked here too.</p><p>Turn spoiler-safe off to peek, or earn it in the game and tick it off: it will reveal itself.</p>${gradeBadge(t)} <span class="badge hidden-flag">Hidden on PSN</span>`;
    return;
  }
  const target = fmtTarget(t);
  detailEl.innerHTML = `
    <h2></h2>
    <h3>Guide — in our own words</h3>
    <p class="guide-text"></p>
    <p class="cite-line"></p>
    <p class="official"></p>
    <div class="trophy-badges">${trophyBadges(t)}</div>
    ${target ? `<p class="target">${target}</p>` : ''}
    ${t.missable ? `<p class="warn"><strong>Potentially missable.</strong> One meditation spot — Lucia&rsquo;s balcony in Chapter 1 — disappears after Chapter 1. Meditate there before the chapter ends and keep a Chapter 1 manual save. No mission replay, no New Game+.</p>` : ''}
    <h3>Steps</h3>
    <ol class="steps"></ol>
    <h3>Sources</h3>
    <ul class="source-list"></ul>`;
  detailEl.querySelector('h2').textContent = t.name;
  detailEl.querySelector('.official').textContent = `Official: ${t.description}`;
  detailEl.querySelector('.guide-text').textContent = t.guide;
  // The citation sits beside the guide, not below the fold: the first
  // source names where the guide's facts come from, and the full list
  // follows under Sources. A step with no citation beside it scores
  // nothing, so the citation is part of the guide itself.
  const cite = detailEl.querySelector('.cite-line');
  const first = t.sources[0];
  cite.replaceChildren();
  cite.append(document.createTextNode('Source: '));
  const citeLink = document.createElement('a');
  citeLink.href = first.url;
  citeLink.target = '_blank';
  citeLink.rel = 'noopener';
  citeLink.textContent = first.name;
  cite.append(citeLink, document.createTextNode(` — ${first.what}`));
  const steps = detailEl.querySelector('.steps');
  for (const s of t.steps) {
    const li = document.createElement('li');
    li.textContent = s;
    steps.append(li);
  }
  const srcs = detailEl.querySelector('.source-list');
  for (const s of t.sources) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    li.append(a, document.createTextNode(` — ${s.what}`));
    srcs.append(li);
  }
}

// ---- roadmap ----
function renderRoadmap() {
  $('roadmapStages').innerHTML = STAGES.map((s) => {
    const got = s.ids.filter((id) => earned.has(byId.get(id).name)).length;
    const chips = s.ids.map((id) => {
      const t = byId.get(id);
      const done = earned.has(t.name);
      return `<button type="button" class="stage-trophy${done ? ' done' : ''}" data-id="${id}">${done ? '✓ ' : ''}${isMasked(t) ? 'Hidden trophy' : t.name}</button>`;
    }).join('');
    return `<li class="stage"><div class="stage-head"><span class="stage-num">${s.n}</span><h3></h3><span class="stage-count">${got}/${s.ids.length} earned</span></div><p></p><div class="stage-trophies">${chips}</div></li>`;
  }).join('');
  document.querySelectorAll('#roadmapStages .stage').forEach((el, i) => {
    el.querySelector('h3').textContent = STAGES[i].title;
    el.querySelector('p').textContent = STAGES[i].blurb;
  });
  document.querySelectorAll('.stage-trophy').forEach((b) => {
    b.addEventListener('click', () => {
      showView('tracker');
      selectTrophy(Number(b.dataset.id));
      document.getElementById('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

// ---- missables ----
function renderMissables() {
  const t = trophies.find((x) => x.missable);
  $('missableList').innerHTML = `<article class="missable-card"><h3></h3><p class="official"></p><p class="guide-text"></p><p><strong>Sources: </strong><span class="srcs"></span></p></article>`;
  const card = document.querySelector('.missable-card');
  card.querySelector('h3').textContent = `${t.name} — ${GRADE_LABELS[t.grade]}`;
  card.querySelector('.official').textContent = `Official: ${t.description}`;
  card.querySelector('.guide-text').textContent = t.guide;
  card.querySelector('.srcs').textContent = t.sources.map((s) => s.name).join(', ');
}

// ---- sources ----
function renderSources() {
  $('sourcesBody').innerHTML = Object.values(doc.sources).map((s) => {
    const tr = document.createElement('tr');
    const name = document.createElement('td');
    const a = document.createElement('a');
    a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = s.name;
    name.append(a);
    const used = document.createElement('td');
    used.textContent = s.used_for;
    tr.append(name, used);
    return tr;
  }).map((tr) => tr.outerHTML).join('');
}

// ---- views / routing ----
function showView(v) {
  view = v;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  document.querySelectorAll('.view').forEach((s) => { s.hidden = s.id !== `view-${v}`; });
  if (v !== 'tracker') history.replaceState(null, '', `#${v}`);
}
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));

function routeFromHash() {
  const h = location.hash.replace(/^#/, '');
  if (h.startsWith('trophy-')) {
    const id = Number(h.slice(7));
    if (byId.has(id)) { showView('tracker'); selectTrophy(id); return; }
  }
  if (['roadmap', 'missables', 'sources'].includes(h)) showView(h);
  else if (h === 'tracker') showView('tracker');
}

// ---- controls ----
$('search').addEventListener('input', (e) => { query = e.target.value; renderList(); });
$('grade').addEventListener('change', (e) => { grade = e.target.value; renderList(); });
$('spoiler').addEventListener('change', (e) => { spoiler = e.target.checked; renderAll(); });
$('earnedOnly').addEventListener('change', (e) => { earnedOnly = e.target.checked; renderList(); });
$('exportBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned] }, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-fieldbook-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    const next = new Set((names ?? []).filter((n) => byName.has(n)));
    earned = next;
    save();
    renderAll();
  } catch {
    alert('That file is not a valid progress export.');
  }
  e.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  if (confirm('Clear all earned trophies?')) {
    earned = new Set();
    save();
    renderAll();
  }
});

// ---- boot ----
function renderAll() {
  renderProgress();
  renderPills();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
  renderSources();
  $('spoiler').checked = spoiler;
  $('grade').value = grade;
}
renderAll();
showView(view);
routeFromHash();
if (selectedId == null) selectTrophy(28);
window.addEventListener('hashchange', routeFromHash);
