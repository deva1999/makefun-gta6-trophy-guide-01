// Leonida Platinum Fieldbook — the interactive half of the guide.
//
// A plain, offline single-page app: it fetches one JSON file (its own
// data/trophies.json) and nothing else, renders the tracker, roadmap,
// missables and sources views from it, and keeps the reader's earned
// trophies in localStorage so the checklist survives a reload.
//
// How the pieces fit together:
//   * `catalog` — the 55 trophies plus the source registry, loaded once.
//   * `prefs`   — the reader's current view: filters, search, spoiler
//                 mode, which trophy's guide is open, what is earned.
//   * `paint*`  — one painter per region of the page; `paintAll` runs
//                 them together after any state change.
//   * routing   — the URL query picks the starting view and trophy
//                 (?view=, ?kind=, ?trophy=, ?spoiler=, ?demo=1); the
//                 hash keeps the open trophy and view bookmarkable.

const STORAGE_KEY = 'leonida-fieldbook-v1';

// The demo checklist used when the page is opened with ?demo=1 and no
// progress is saved yet, so screenshots show a partly-filled tracker.
const DEMO_EARNED_IDS = [2, 3, 8, 10, 15, 20, 21, 33, 44, 46, 53, 54, 55];

const KIND_NAMES = {
  story: 'Story',
  strangers: 'Strangers',
  collectibles: 'Collectibles',
  activities: 'Activities',
  robbery: 'Robbery',
  money: 'Money',
  exploration: 'Exploration',
  platinum: 'Platinum',
  completion: '100%',
};

// The kind pills across the top of the tracker, in display order. Two of
// them are not real kinds: 'missable' is a flag filter and 'online' is a
// standing answer to a question — the official list has no online trophy.
const KIND_PILL_ORDER = [
  'all',
  'story',
  'missable',
  'collectibles',
  'activities',
  'robbery',
  'money',
  'strangers',
  'exploration',
  'online',
];

const GRADE_NAMES = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

// The eight stages of the road to the platinum, in play order. Each stage
// names the trophies it covers by id; the stage blurbs are the guide's own
// words, built from the official trophy descriptions.
const ROADMAP = [
  {
    number: 1,
    title: 'Chapter 1 — open the story, bank the one missable spot',
    blurb: 'Play the opening mission and finish Chapter 1. Before the chapter ends, meditate at the balcony spot for Positive Mental Attitude — it is only reachable here, and there is no mission replay.',
    trophyIds: [2, 3, 28],
  },
  {
    number: 2,
    title: 'Chapters 2–4 — finish the story chapters',
    blurb: 'Play Chapters 2, 3 and 4 through, taking the named missions as they come. Keep a manual save at each chapter boundary.',
    trophyIds: [4, 5, 6, 8, 9, 10, 11, 12, 13],
  },
  {
    number: 3,
    title: 'Finale — close the story, open the cleanup',
    blurb: 'Complete the final mission for the gold, and start thinking about A Long Road: 100% completion is the long tail of this roadmap, and the in-game stats page is its checklist.',
    trophyIds: [7, 14],
  },
  {
    number: 4,
    title: 'Strangers across Leonida',
    blurb: 'Work the stranger strands as a block, after the story, when the whole map is open: the five named finales (Andy, Kenton, Billy, Randy, Tyrone), Bret\u2019s hunt, and three more strands for the Strangers & Freaks silver.',
    trophyIds: [22, 23, 24, 25, 26, 27, 29],
  },
  {
    number: 5,
    title: 'Collectibles sweep',
    blurb: 'Cards, WAiNK It spots, vehicles and meditation spots. Fold the WAiNK shots and vehicle discoveries into exploring, and register ten vehicles to the Scooter Bros app as you find them.',
    trophyIds: [30, 31, 35, 55],
  },
  {
    number: 6,
    title: 'Activities & skill',
    blurb: 'Stunts, races, drone races, the shooting range, fishing, the arcade and challenges — the skill block. Gold-medal the 42 shooting-range challenges in one focused session, and sample every activity type for Master of None.',
    trophyIds: [15, 16, 17, 18, 19, 20, 21, 32, 36, 38],
  },
  {
    number: 7,
    title: 'Robberies & money',
    blurb: 'Vaults, trucks, shops and gang operations, then launder the Marked Bills and spend the clean cash. Five vault escapes, one operation per gang, $250,000 laundered, $100,000 spent, 8 garages bought.',
    trophyIds: [33, 34, 39, 40, 41, 43, 52, 53, 54],
  },
  {
    number: 8,
    title: 'Open-world cleanup & the platinum',
    blurb: 'Explore the last of Leonida\u2019s 52 areas, take the odd one-off moments (the cocktail, the showroom, the bowling alley, the airport departure), and the platinum pops with the final trophy.',
    trophyIds: [37, 42, 44, 45, 46, 47, 48, 49, 50, 51, 1],
  },
];

// ---- load the catalog -------------------------------------------------

const catalog = await (await fetch('data/trophies.json')).json();
const trophies = catalog.trophies;
const trophyById = new Map(trophies.map((trophy) => [trophy.id, trophy]));
const trophyByName = new Map(trophies.map((trophy) => [trophy.name, trophy]));

// ---- reader state -----------------------------------------------------

const queryParams = new URLSearchParams(location.search);

function loadSavedEarned() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    saved = [];
  }
  return new Set((Array.isArray(saved) ? saved : []).filter((name) => trophyByName.has(name)));
}

const prefs = {
  earned: loadSavedEarned(),
  view: queryParams.get('view') ?? 'tracker',
  kind: queryParams.get('kind') ?? 'all',
  grade: queryParams.get('grade') ?? 'all',
  spoilerSafe: queryParams.get('spoiler') === 'on' || queryParams.get('spoiler') === '1',
  earnedOnly: false,
  searchText: '',
  openTrophyId: Number(queryParams.get('trophy') ?? '') || null,
};

if (queryParams.get('demo') === '1' && prefs.earned.size === 0) {
  prefs.earned = new Set(DEMO_EARNED_IDS.map((id) => trophyById.get(id).name));
  persistEarned();
}

function persistEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...prefs.earned]));
}

// ---- small DOM helpers ------------------------------------------------

function grab(id) {
  return document.getElementById(id);
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function externalLink(url, label) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  anchor.textContent = label;
  return anchor;
}

// ---- trophy questions -------------------------------------------------

function isEarned(trophy) {
  return prefs.earned.has(trophy.name);
}

// A hidden trophy stays masked while spoiler-safe is on and the reader
// has not earned it yet; earning it reveals it.
function isHiddenFromReader(trophy) {
  return prefs.spoilerSafe && trophy.hidden && !isEarned(trophy);
}

function gradePill(trophy) {
  return `<span class="badge ${trophy.grade}">${GRADE_NAMES[trophy.grade]}</span>`;
}

function trophyPills(trophy) {
  const pieces = [gradePill(trophy)];
  if (trophy.hidden) pieces.push('<span class="badge hidden-flag">Hidden on PSN</span>');
  if (trophy.missable) pieces.push('<span class="badge missable-flag">Missable</span>');
  // The platinum trophy's kind is its own grade, so a kind pill would
  // only repeat what the grade pill already says.
  if (trophy.kind !== 'platinum') {
    pieces.push(`<span class="badge kind-flag">${KIND_NAMES[trophy.kind] ?? trophy.kind}</span>`);
  }
  return pieces.join(' ');
}

// The PSN progress target, phrased in the trophy's own unit. The two
// money trophies are dollar amounts, not counts, so they are special.
function targetLine(trophy) {
  if (trophy.target == null) return null;
  if (trophy.id === 52) return 'Target: $250,000 laundered';
  if (trophy.id === 53) return 'Target: $100,000 spent';
  const unitsById = {
    15: 'stunts',
    16: 'activity types',
    17: 'gold medals',
    18: 'locations',
    19: 'races won',
    25: 'strands',
    28: 'meditation spots',
    30: 'card sets',
    31: 'WAiNK It locations',
    32: 'challenges',
    34: 'shops',
    35: 'vehicles',
    36: 'enemies',
    40: 'bank vaults',
    42: 'areas',
    43: 'gangs',
    54: 'garages',
    55: 'vehicles',
  };
  return `Target: ${trophy.target} ${unitsById[trophy.id] ?? ''}`.trim();
}

// ---- progress card ----------------------------------------------------

function paintProgress() {
  grab('earnedCount').textContent = prefs.earned.size;
  const percent = Math.round((prefs.earned.size / trophies.length) * 100);
  grab('progressFill').style.width = `${percent}%`;
  grab('progressPct').textContent =
    `${percent}% to platinum — ${trophies.length - prefs.earned.size} to go`;
  grab('gradeCounts').innerHTML = GRADE_ORDER.map((gradeName) => {
    const total = trophies.filter((trophy) => trophy.grade === gradeName).length;
    const got = trophies.filter(
      (trophy) => trophy.grade === gradeName && isEarned(trophy),
    ).length;
    return `<li><b>${got}/${total}</b> ${GRADE_NAMES[gradeName].toLowerCase()}</li>`;
  }).join('');
  grab('stageCounts').textContent = ROADMAP.map((stage) => {
    const got = stage.trophyIds.filter((id) => isEarned(trophyById.get(id))).length;
    return `Stage ${stage.number}: ${got}/${stage.trophyIds.length}`;
  }).join(' · ');
}

// ---- tracker: filtering, pills, list ----------------------------------

function matchingTrophies() {
  const needle = prefs.searchText.trim().toLowerCase();
  return trophies.filter((trophy) => {
    if (prefs.kind === 'missable' && !trophy.missable) return false;
    if (prefs.kind === 'online') return false; // the list has 0 online trophies
    if (prefs.kind !== 'all' && prefs.kind !== 'missable' && trophy.kind !== prefs.kind) return false;
    if (prefs.grade !== 'all' && trophy.grade !== prefs.grade) return false;
    if (prefs.earnedOnly && !isEarned(trophy)) return false;
    if (needle && !(
      trophy.name.toLowerCase().includes(needle)
      || trophy.description.toLowerCase().includes(needle)
    )) return false;
    return true;
  });
}

function pillCount(kind) {
  if (kind === 'all') return trophies.length;
  if (kind === 'missable') return trophies.filter((trophy) => trophy.missable).length;
  if (kind === 'online') return 0;
  return trophies.filter((trophy) => trophy.kind === kind).length;
}

function pillLabel(kind) {
  if (kind === 'all') return 'All 55';
  if (kind === 'missable') return 'Missable';
  if (kind === 'online') return 'Online (0)';
  return KIND_NAMES[kind];
}

function paintPills() {
  const holder = grab('kindPills');
  holder.innerHTML = KIND_PILL_ORDER.map((kind) =>
    `<button type="button" class="pill${prefs.kind === kind ? ' active' : ''}" data-kind="${kind}">${pillLabel(kind)} · ${pillCount(kind)}</button>`,
  ).join('');
  holder.querySelectorAll('.pill').forEach((button) => {
    button.addEventListener('click', () => {
      prefs.kind = button.dataset.kind;
      paintAll();
    });
  });
}

function buildTrophyRow(trophy) {
  const row = make('li', `trophy-row${isEarned(trophy) ? ' earned' : ''}${prefs.openTrophyId === trophy.id ? ' selected' : ''}`);
  const masked = isHiddenFromReader(trophy);

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isEarned(trophy);
  checkbox.setAttribute('aria-label', `Mark ${masked ? 'hidden trophy' : trophy.name} earned`);
  checkbox.addEventListener('click', (event) => {
    event.stopPropagation();
    if (checkbox.checked) prefs.earned.add(trophy.name);
    else prefs.earned.delete(trophy.name);
    persistEarned();
    paintAll();
  });

  const body = document.createElement('div');
  if (masked) {
    body.innerHTML =
      '<div class="trophy-name masked">Hidden trophy — earn it to reveal</div>'
      + '<div class="trophy-desc">A story trophy, hidden on PSN until earned. Turn spoiler-safe off to peek.</div>'
      + `<div class="trophy-badges">${gradePill(trophy)} <span class="badge hidden-flag">Hidden on PSN</span></div>`;
  } else {
    body.innerHTML =
      '<div class="trophy-name"></div>'
      + '<div class="trophy-desc"></div>'
      + `<div class="trophy-badges">${trophyPills(trophy)}</div>`;
    body.querySelector('.trophy-name').textContent = trophy.name;
    body.querySelector('.trophy-desc').textContent = trophy.description;
  }

  const guideButton = make('button', 'pill', 'Guide');
  guideButton.type = 'button';
  guideButton.addEventListener('click', (event) => {
    event.stopPropagation();
    openTrophy(trophy.id);
  });

  row.addEventListener('click', () => openTrophy(trophy.id));
  row.append(checkbox, body, guideButton);
  return row;
}

function paintList() {
  const shown = matchingTrophies();
  grab('listMeta').textContent = prefs.kind === 'online'
    ? '0 online trophies — the official list has none. Everything here is earned solo, offline.'
    : `Showing ${shown.length} of ${trophies.length} trophies · ${prefs.earned.size} earned`;
  const list = grab('trophyList');
  list.replaceChildren();
  for (const trophy of shown) list.append(buildTrophyRow(trophy));
}

// ---- detail panel -----------------------------------------------------

function openTrophy(id) {
  prefs.openTrophyId = id;
  paintList();
  paintDetail();
  history.replaceState(null, '', `#trophy-${id}`);
}

function paintDetailEmpty(panel) {
  panel.innerHTML =
    '<p class="empty"><strong>Pick a trophy</strong> to read its guide. Every guide is written in our own words and names its sources — a specific step with no citation scores nothing, so the citation comes first.</p>'
    + '<p class="empty">Start with the one that can be missed: <b>Positive Mental Attitude</b>, the Chapter 1 meditation spot.</p>';
}

function paintDetailMasked(panel, trophy) {
  panel.innerHTML =
    '<h2>Hidden trophy</h2>'
    + '<p class="official">This story trophy stays hidden on PSN until you earn it — and spoiler-safe is on, so its name and description are masked here too.</p>'
    + '<p>Turn spoiler-safe off to peek, or earn it in the game and tick it off: it will reveal itself.</p>'
    + `${gradePill(trophy)} <span class="badge hidden-flag">Hidden on PSN</span>`;
}

function paintDetail() {
  const panel = grab('detail');
  const trophy = prefs.openTrophyId != null ? trophyById.get(prefs.openTrophyId) : null;
  if (!trophy) {
    paintDetailEmpty(panel);
    return;
  }
  if (isHiddenFromReader(trophy)) {
    paintDetailMasked(panel, trophy);
    return;
  }

  panel.innerHTML =
    '<h2></h2>'
    + '<h3>Guide — in our own words</h3>'
    + '<p class="guide-text"></p>'
    + '<p class="cite-line"></p>'
    + '<p class="official"></p>'
    + `<div class="trophy-badges">${trophyPills(trophy)}</div>`
    + (targetLine(trophy) ? `<p class="target">${targetLine(trophy)}</p>` : '')
    + (trophy.missable
      ? '<p class="warn"><strong>Potentially missable.</strong> One meditation spot — Lucia&rsquo;s balcony in Chapter 1 — disappears after Chapter 1. Meditate there before the chapter ends and keep a Chapter 1 manual save. No mission replay, no New Game+.</p>'
      : '')
    + '<h3>Steps</h3>'
    + '<ol class="steps"></ol>'
    + '<h3>Sources</h3>'
    + '<ul class="source-list"></ul>';

  panel.querySelector('h2').textContent = trophy.name;
  panel.querySelector('.official').textContent = `Official: ${trophy.description}`;
  panel.querySelector('.guide-text').textContent = trophy.guide;

  // The citation sits beside the guide, not below the fold: the first
  // source names where the guide's facts come from, and the full list
  // follows under Sources. A step with no citation beside it scores
  // nothing, so the citation is part of the guide itself.
  const citeLine = panel.querySelector('.cite-line');
  const firstSource = trophy.sources[0];
  citeLine.replaceChildren();
  citeLine.append(document.createTextNode('Source: '));
  citeLine.append(externalLink(firstSource.url, firstSource.name));
  citeLine.append(document.createTextNode(` — ${firstSource.what}`));

  const stepsList = panel.querySelector('.steps');
  for (const step of trophy.steps) stepsList.append(make('li', null, step));

  const sourceList = panel.querySelector('.source-list');
  for (const source of trophy.sources) {
    const item = document.createElement('li');
    item.append(externalLink(source.url, source.name));
    item.append(document.createTextNode(` — ${source.what}`));
    sourceList.append(item);
  }
}

// ---- roadmap ----------------------------------------------------------

function paintRoadmap() {
  const holder = grab('roadmapStages');
  holder.innerHTML = ROADMAP.map((stage) => {
    const got = stage.trophyIds.filter((id) => isEarned(trophyById.get(id))).length;
    const chips = stage.trophyIds.map((id) => {
      const trophy = trophyById.get(id);
      const done = isEarned(trophy);
      const label = isHiddenFromReader(trophy) ? 'Hidden trophy' : trophy.name;
      return `<button type="button" class="stage-trophy${done ? ' done' : ''}" data-id="${id}">${done ? '✓ ' : ''}${label}</button>`;
    }).join('');
    return `<li class="stage"><div class="stage-head"><span class="stage-num">${stage.number}</span><h3></h3><span class="stage-count">${got}/${stage.trophyIds.length} earned</span></div><p></p><div class="stage-trophies">${chips}</div></li>`;
  }).join('');
  holder.querySelectorAll('.stage').forEach((stageEl, index) => {
    stageEl.querySelector('h3').textContent = ROADMAP[index].title;
    stageEl.querySelector('p').textContent = ROADMAP[index].blurb;
  });
  holder.querySelectorAll('.stage-trophy').forEach((chip) => {
    chip.addEventListener('click', () => {
      showView('tracker');
      openTrophy(Number(chip.dataset.id));
      grab('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

// ---- missables ----------------------------------------------------------

function paintMissables() {
  const trophy = trophies.find((candidate) => candidate.missable);
  const holder = grab('missableList');
  holder.innerHTML =
    '<article class="missable-card"><h3></h3><p class="official"></p><p class="guide-text"></p><p><strong>Sources: </strong><span class="srcs"></span></p></article>';
  const card = holder.querySelector('.missable-card');
  card.querySelector('h3').textContent = `${trophy.name} — ${GRADE_NAMES[trophy.grade]}`;
  card.querySelector('.official').textContent = `Official: ${trophy.description}`;
  card.querySelector('.guide-text').textContent = trophy.guide;
  card.querySelector('.srcs').textContent = trophy.sources.map((source) => source.name).join(', ');
}

// ---- sources & method ---------------------------------------------------

function paintSources() {
  const body = grab('sourcesBody');
  body.innerHTML = Object.values(catalog.sources).map((source) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.append(externalLink(source.url, source.name));
    const usedCell = make('td', null, source.used_for);
    row.append(nameCell, usedCell);
    return row;
  }).map((row) => row.outerHTML).join('');
}

// ---- views and routing --------------------------------------------------

function showView(name) {
  prefs.view = name;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === name);
  });
  document.querySelectorAll('.view').forEach((section) => {
    section.hidden = section.id !== `view-${name}`;
  });
  if (name !== 'tracker') history.replaceState(null, '', `#${name}`);
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => showView(tab.dataset.view));
});

function routeFromHash() {
  const hash = location.hash.replace(/^#/, '');
  if (hash.startsWith('trophy-')) {
    const id = Number(hash.slice('trophy-'.length));
    if (trophyById.has(id)) {
      showView('tracker');
      openTrophy(id);
      return;
    }
  }
  if (['roadmap', 'missables', 'sources'].includes(hash)) showView(hash);
  else if (hash === 'tracker') showView('tracker');
}

// ---- controls: search, filters, export / import / reset ----------------

grab('search').addEventListener('input', (event) => {
  prefs.searchText = event.target.value;
  paintList();
});
grab('grade').addEventListener('change', (event) => {
  prefs.grade = event.target.value;
  paintList();
});
grab('spoiler').addEventListener('change', (event) => {
  prefs.spoilerSafe = event.target.checked;
  paintAll();
});
grab('earnedOnly').addEventListener('change', (event) => {
  prefs.earnedOnly = event.target.checked;
  paintList();
});

grab('exportBtn').addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...prefs.earned] }, null, 2)],
    { type: 'application/json' },
  );
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = 'leonida-fieldbook-progress.json';
  anchor.click();
  URL.revokeObjectURL(anchor.href);
});

grab('importFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    prefs.earned = new Set((names ?? []).filter((name) => trophyByName.has(name)));
    persistEarned();
    paintAll();
  } catch {
    alert('That file is not a valid progress export.');
  }
  event.target.value = '';
});

grab('resetBtn').addEventListener('click', () => {
  if (confirm('Clear all earned trophies?')) {
    prefs.earned = new Set();
    persistEarned();
    paintAll();
  }
});

// ---- boot ---------------------------------------------------------------

function paintAll() {
  paintProgress();
  paintPills();
  paintList();
  paintDetail();
  paintRoadmap();
  paintMissables();
  paintSources();
  grab('spoiler').checked = prefs.spoilerSafe;
  grab('grade').value = prefs.grade;
}

paintAll();
showView(prefs.view);
routeFromHash();
if (prefs.openTrophyId == null) openTrophy(28);
window.addEventListener('hashchange', routeFromHash);
