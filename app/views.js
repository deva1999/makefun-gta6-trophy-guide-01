// Views: everything the guide draws — progress card, trophy list, detail panel,
// roadmap, missables and sources. No network calls; all data comes from trophies.json.
export const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
export const GRADE_LABELS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
export const KIND_LABELS = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' };

export const ROADMAP_STAGES = [
  { stage: 1, title: 'Start right — saves, cheats, and the one missable', blurb: 'Before the story pulls you in: turn on a manual save habit, never touch a cheat on your trophy save, and meditate at Lucia\u2019s balcony spot while you are still in Chapter 1.' },
  { stage: 2, title: 'Story — Chapters 1–4 and the finale', blurb: 'Play the main missions in order. Every chapter and named mission trophy pops as you finish it; none of them can be missed.' },
  { stage: 3, title: 'Strangers & Freaks', blurb: 'The stranger strands unlock as you explore. Finish the five named strands and any three more, and the silver is yours.' },
  { stage: 4, title: 'Collectibles & exploration', blurb: 'Cards, WAiNK tags, vehicles and the 52 areas of Leonida. Do this as one big road trip — the three trophies feed each other.' },
  { stage: 5, title: 'Activities & challenges', blurb: 'Stunts, races, the shooting range, fishing, the arcade, bowling and the odd one-offs. The long grinds live here: 250 stunts and 42 shooting-range golds.' },
  { stage: 6, title: 'Robberies & money', blurb: 'Vaults, trucks, jewelry, gang operations and the two money totals. Rob as you go and launder the Marked Bills as you earn them.' },
  { stage: 7, title: '100% completion', blurb: 'Rockstar has not published the 100% checklist, so this stage is the in-game stats page: finish everything else first, then clear whatever it still shows.' },
  { stage: 8, title: 'Platinum', blurb: 'Vice Got a Price! pops the moment the other 54 are done. There is nothing left to do — just enjoy being a Leonida Legend.' },
];

export const SOURCES_USED = [
  { name: 'Exophase', url: 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/', usedFor: 'The official 55 names, descriptions and grades, as listed on PlayStation Network, 2026-11-18.' },
  { name: 'PSNProfiles', url: 'https://psnprofiles.com/trophies/43531-grand-theft-auto-vi', usedFor: 'The same list, plus the counts PlayStation tracks (250 stunts, 42 shooting-range challenges, 18 meditation spots, 100 vehicles, 52 areas, 9 gangs, 8 garages, 500 choices).' },
  { name: 'PlanetGTA6', url: 'https://www.planetgta6.com/en/gta-6-trophies/', usedFor: 'Cross-check of all 55 names and descriptions; the 28 hidden trophies; the warning that no reliable missable list exists yet; the cheat report (via PowerPyx).' },
  { name: 'KeenGamer', url: 'https://www.keengamer.com/articles/guides/gta-6-trophy-guide-platinum-roadmap-all-55-trophies/', usedFor: 'Platinum roadmap structure and the Chapter 1 meditation warning for Positive Mental Attitude.' },
  { name: 'Outputlag', url: 'https://www.outputlag.com/guides/gta-6-trophy-list/', usedFor: 'Independent trophy-list check and per-trophy guidance cross-check.' },
  { name: 'TrueAchievements', url: 'https://www.trueachievements.com/', usedFor: 'Cross-check that the Xbox list carries the same 55 achievements (1,000 Gamerscore total; A Long Road is the biggest at 100 G).' },
];

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function trophyIsMasked(trophy, state) {
  return state.spoilers && trophy.hidden && !state.earned.has(trophy.id);
}

export function gradeBadge(trophy) {
  return `<span class="badge ${trophy.grade}">${escapeHtml(GRADE_LABELS[trophy.grade])}</span>`;
}

export function renderProgressCard(trophies, earned) {
  const earnedCount = earned.size;
  const pct = Math.round((earnedCount / trophies.length) * 100);
  document.getElementById('pcEarned').textContent = String(earnedCount);
  document.getElementById('pcFill').style.width = `${pct}%`;
  document.getElementById('pcPct').textContent = `${pct}% to platinum`;
  const grades = document.getElementById('pcGrades');
  grades.innerHTML = GRADE_ORDER.map((g) => {
    const total = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return `<li><span>${GRADE_LABELS[g]}</span><b>${got}/${total}</b></li>`;
  }).join('');
  const doneStages = ROADMAP_STAGES.filter((s) => {
    const inStage = trophies.filter((t) => t.stage === s.stage);
    return inStage.length > 0 && inStage.every((t) => earned.has(t.id));
  }).length;
  document.getElementById('pcStages').textContent =
    `${doneStages} of ${ROADMAP_STAGES.length} roadmap stages complete · 0 online trophies in the list`;
}

export function filterTrophies(trophies, state) {
  const q = state.query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.kind === 'online') return false;
    if (state.kind !== 'all' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.earnedOnly && !state.earned.has(t.id)) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function renderTrophyList(trophies, state, onToggle, onSelect) {
  const list = document.getElementById('trophyList');
  const shown = filterTrophies(trophies, state);
  const showing = document.getElementById('showingLine');
  if (state.kind === 'online') {
    showing.textContent = 'Showing 0 of 55 trophies — the official list has 0 online trophies';
    list.innerHTML = '<div class="empty-list">There are no online trophies. All 55 are earned in single-player — nothing here needs PS Plus or a connection.</div>';
    return;
  }
  showing.textContent = `Showing ${shown.length} of ${trophies.length} trophies`;
  if (shown.length === 0) {
    list.innerHTML = '<div class="empty-list">Nothing matches those filters. Clear the search or pick another kind or grade.</div>';
    return;
  }
  list.innerHTML = shown.map((t) => {
    const masked = trophyIsMasked(t, state);
    const earned = state.earned.has(t.id);
    const name = masked ? 'Hidden trophy — earn it to reveal' : t.name;
    const desc = masked ? 'A story trophy hidden on PSN until earned. Tick it off here once you have it, and the real name appears.' : t.description;
    const badges = [gradeBadge(t)];
    if (t.hidden) badges.push('<span class="badge hidden">Hidden on PSN</span>');
    if (t.missable) badges.push('<span class="badge missable">Potentially missable</span>');
    badges.push(`<span class="badge kind">${escapeHtml(KIND_LABELS[t.kind])}</span>`);
    if (t.count) badges.push(`<span class="badge count">× ${t.count.toLocaleString('en-US')}</span>`);
    return `<button type="button" class="trophy-row${earned ? ' earned' : ''}${state.selectedId === t.id ? ' selected' : ''}" role="listitem" data-id="${t.id}">
      <input type="checkbox" ${earned ? 'checked' : ''} aria-label="Mark ${escapeHtml(name)} as earned" tabindex="-1">
      <span class="trophy-main">
        <span class="trophy-name">${escapeHtml(name)}</span>
        <span class="trophy-desc">${escapeHtml(desc)}</span>
        <span class="badges">${badges.join('')}</span>
      </span>
    </button>`;
  }).join('');
  list.querySelectorAll('.trophy-row').forEach((row) => {
    row.addEventListener('click', (event) => {
      const id = Number(row.dataset.id);
      if (event.target.tagName === 'INPUT') {
        event.preventDefault();
        onToggle(id);
      } else {
        onSelect(id);
      }
    });
  });
}

export function renderDetailPanel(trophies, state, onToggle, onSelectNext) {
  const panel = document.getElementById('detailPanel');
  const trophy = trophies.find((t) => t.id === state.selectedId) || trophies[0];
  if (!trophy) {
    panel.innerHTML = '<p class="detail-empty">Pick a trophy from the list to read its guide.</p>';
    return;
  }
  const masked = trophyIsMasked(trophy, state);
  const earned = state.earned.has(trophy.id);
  const name = masked ? 'Hidden trophy — earn it to reveal' : trophy.name;
  const desc = masked ? 'This story trophy stays hidden on PSN until you earn it. The guide below is hidden with it — earn the trophy (or turn spoiler-safe off) to read it.' : trophy.description;
  const badges = [gradeBadge(trophy)];
  if (trophy.hidden) badges.push('<span class="badge hidden">Hidden on PSN</span>');
  if (trophy.missable) badges.push('<span class="badge missable">Potentially missable</span>');
  badges.push(`<span class="badge kind">${escapeHtml(KIND_LABELS[trophy.kind])}</span>`);
  if (trophy.count) badges.push(`<span class="badge count">PSN tracks × ${trophy.count.toLocaleString('en-US')}</span>`);
  const warn = trophy.missable && trophy.missableNote
    ? `<div class="warn"><strong>⚠ Missable warning.</strong> ${escapeHtml(trophy.missableNote)}</div>` : '';
  const guide = masked
    ? '<p class="guide-text">Guide hidden with the trophy — spoiler-safe is on.</p>'
    : `<p class="guide-text">${escapeHtml(trophy.guide)}</p>`;
  const sources = masked
    ? '<p class="guide-text">Sources hidden with the trophy.</p>'
    : `<ul class="source-list">${trophy.sources.map((s) => `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a></li>`).join('')}</ul>`;
  panel.innerHTML = `
    <h3>${escapeHtml(name)}</h3>
    <p class="official">Official description: “${escapeHtml(desc)}”</p>
    <div class="badges">${badges.join('')}</div>
    ${warn}
    <h4>Guide — in our own words</h4>
    ${guide}
    <h4>Sources — where each fact comes from</h4>
    ${sources}
    <div class="detail-actions">
      <button type="button" data-action="toggle">${earned ? 'Mark as not earned' : 'Mark as earned'}</button>
      <button type="button" data-action="next">Next trophy →</button>
    </div>`;
  panel.querySelector('[data-action="toggle"]').addEventListener('click', () => onToggle(trophy.id));
  panel.querySelector('[data-action="next"]').addEventListener('click', () => onSelectNext(trophy.id));
}

export function renderRoadmap(trophies, earned) {
  const host = document.getElementById('roadmapList');
  host.innerHTML = ROADMAP_STAGES.map((s) => {
    const inStage = trophies.filter((t) => t.stage === s.stage);
    const got = inStage.filter((t) => earned.has(t.id)).length;
    const rows = inStage.map((t) => {
      const done = earned.has(t.id);
      return `<li><span class="${done ? 'done' : ''}">${done ? '✓' : '○'}</span>
        <span class="tname">${escapeHtml(t.name)}</span>
        <span class="tdesc">${escapeHtml(t.description)}</span></li>`;
    }).join('');
    const warn = s.stage === 1
      ? '<div class="warn"><strong>⚠ Do this first.</strong> Positive Mental Attitude — meditate at Lucia&rsquo;s balcony spot in Chapter 1, before Chapter 1 ends. Keep a manual Chapter 1 save. It is the only trophy with a missable window.</div>'
      : '';
    return `<article class="stage">
      <div class="stage-head"><span class="stage-num">${s.stage}</span><h3>${escapeHtml(s.title)}</h3><span class="stage-count">${got}/${inStage.length} earned</span></div>
      <p>${escapeHtml(s.blurb)}</p>
      ${warn}
      <ul class="stage-trophies">${rows}</ul>
    </article>`;
  }).join('');
}

export function renderMissables(trophies) {
  const host = document.getElementById('missablesList');
  const one = trophies.find((t) => t.missable);
  host.innerHTML = `<article class="missable-card">
    <h3>${escapeHtml(one.name)} — the one potentially missable trophy</h3>
    <p><strong>Official description:</strong> “${escapeHtml(one.description)}” &middot; Bronze &middot; PSN tracks ${one.count} spots.</p>
    <p>${escapeHtml(one.guide)}</p>
    <p><strong>Sources:</strong> ${one.sources.map((s) => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`).join(' · ')}</p>
    <p><strong>The safety net:</strong> keep a manual save from Chapter 1, made before you finish the chapter, and do not overwrite it until the trophy pops. Autosaves will not save you — only a manual save from before the window closes.</p>
  </article>
  <article class="missable-card" style="border-color: var(--line)">
    <h3>Everything else is safe</h3>
    <p>All 54 other trophies can be earned after the story, in free roam. Story and mission trophies pop as you play; collectibles, activities, robberies and money totals all stay open. If a guide online lists more missables, ask it for a source — as of 2026-11-19, none is confirmed.</p>
  </article>`;
}

export function renderSources() {
  const host = document.getElementById('sourcesList');
  host.innerHTML = `<table class="source-table">
    <thead><tr><th>Source</th><th>What it was used for</th></tr></thead>
    <tbody>${SOURCES_USED.map((s) => `<tr><td><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a></td><td>${escapeHtml(s.usedFor)}</td></tr>`).join('')}</tbody>
  </table>`;
}
