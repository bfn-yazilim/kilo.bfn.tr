'use strict';

const STORAGE_KEY = 'kilo-takip-v1';
const GOAL_STORAGE_KEY = 'kilo-takip-hedef-v1';
const GOAL_DEFAULT = 88;
const SHOW_GOAL = true;

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const CHIP_DEFS = [
  { key: 'hunger', title: 'Açlık', opts: [['Aç', 'Aç'], ['Tok', 'Tok']] },
  { key: 'clothing', title: 'Kıyafet', opts: [['Kıyafetli', 'Kıyafetli'], ['Kıyafetsiz', 'Kıyafetsiz']] },
  { key: 'toilet', title: 'Tuvalet', opts: [['Öncesi', 'Tuvalet öncesi'], ['Sonrası', 'Tuvalet sonrası']] }
];

function fmt(n) {
  return n.toFixed(1).replace('.', ',');
}

function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()];
}

function seed() {
  const out = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const base = 96.8 - (29 - i) * 0.0931;
    const noise = Math.sin(i * 2.7) * 0.22 + Math.sin(i * 1.31 + 2) * 0.14;
    const w = +(base + noise).toFixed(1);
    let note = null;
    if (i === 21) note = 'Tok · Kıyafetli';
    if (i === 12) note = 'Aç · Tuvalet sonrası';
    if (i === 4) note = 'Aç · Kıyafetsiz';
    out.push({ d: d.toISOString().slice(0, 10), w: w, note: note });
  }
  out[out.length - 1].w = 94.1;
  return out;
}

function loadEntries() {
  let entries = null;
  try { entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
  if (!entries || !entries.length) {
    entries = seed();
    persist(entries);
  }
  return entries;
}

function persist(entries) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch (e) {}
}

function loadGoal() {
  const raw = localStorage.getItem(GOAL_STORAGE_KEY);
  const n = raw !== null ? +raw : NaN;
  return Number.isFinite(n) ? n : GOAL_DEFAULT;
}

function persistGoal(goal) {
  try { localStorage.setItem(GOAL_STORAGE_KEY, String(goal)); } catch (e) {}
}

const state = {
  entries: loadEntries(),
  goal: loadGoal(),
  popupOpen: false,
  draft: null,
  goalPopupOpen: false,
  goalDraft: null
};

function open() {
  const cur = state.entries.length ? state.entries[state.entries.length - 1].w : 94.1;
  state.popupOpen = true;
  state.draft = { w: cur, hunger: null, clothing: null, toilet: null };
  render();
}

function closePopup() {
  state.popupOpen = false;
  state.draft = null;
  render();
}

function adjust(dw) {
  if (!state.draft) return;
  state.draft.w = Math.min(250, Math.max(30, +(state.draft.w + dw).toFixed(1)));
  render();
}

function toggle(group, val) {
  if (!state.draft) return;
  state.draft[group] = state.draft[group] === val ? null : val;
  render();
}

function save() {
  if (!state.draft) return;
  const entries = state.entries.slice();
  const todayIso = new Date().toISOString().slice(0, 10);
  const parts = [state.draft.hunger, state.draft.clothing, state.draft.toilet].filter(Boolean);
  const note = parts.length ? parts.join(' · ') : null;
  const last = entries[entries.length - 1];
  if (last && last.d === todayIso) {
    entries[entries.length - 1] = { d: todayIso, w: state.draft.w, note: note || last.note };
  } else {
    entries.push({ d: todayIso, w: state.draft.w, note: note });
  }
  persist(entries);
  state.entries = entries;
  state.popupOpen = false;
  state.draft = null;
  render();
}

function openGoalPopup() {
  state.goalPopupOpen = true;
  state.goalDraft = state.goal;
  render();
}

function closeGoalPopup() {
  state.goalPopupOpen = false;
  state.goalDraft = null;
  render();
}

function adjustGoal(dw) {
  if (state.goalDraft === null) return;
  state.goalDraft = Math.min(250, Math.max(30, +(state.goalDraft + dw).toFixed(1)));
  render();
}

function saveGoal() {
  if (state.goalDraft === null) return;
  state.goal = state.goalDraft;
  persistGoal(state.goal);
  state.goalPopupOpen = false;
  state.goalDraft = null;
  render();
}

function computeChart(entries, goal, showGoal) {
  const W = 342, H = 176, pt = 14, pb = 24, px = 4;
  const ws = entries.map(e => e.w);
  let lo = Math.min.apply(null, ws), hi = Math.max.apply(null, ws);
  if (showGoal) lo = Math.min(lo, goal);
  lo -= 0.4; hi += 0.4;
  const yOf = w => pt + (hi - w) / (hi - lo) * (H - pt - pb);
  const n = entries.length;
  const pts = entries.map((e, i) => ({
    x: +(px + i * ((W - 2 * px) / Math.max(1, n - 1))).toFixed(1),
    y: +yOf(e.w).toFixed(1),
    e: e
  }));
  const linePath = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join('');
  const lastP = pts[pts.length - 1];
  const areaPath = linePath + 'L' + lastP.x + ',' + (H - pb) + 'L' + pts[0].x + ',' + (H - pb) + 'Z';
  const noteDots = pts.filter(p => p.e.note).map(p => ({ x: p.x, y: p.y }));
  return { linePath, areaPath, noteDots, lastP, goalY: +yOf(goal).toFixed(1) };
}

function chipGroups() {
  const draft = state.draft || {};
  return CHIP_DEFS.map(g => ({
    title: g.title,
    key: g.key,
    chips: g.opts.map(o => ({ label: o[0], value: o[1], selected: draft[g.key] === o[1] }))
  }));
}

function renderChart(entries, goal, showGoal) {
  const chart = computeChart(entries, goal, showGoal);
  const first = entries[0];

  const goalLine = document.getElementById('goalLine');
  goalLine.style.display = showGoal ? '' : 'none';
  goalLine.setAttribute('y1', chart.goalY);
  goalLine.setAttribute('y2', chart.goalY);

  document.getElementById('areaPath').setAttribute('d', chart.areaPath);
  document.getElementById('linePath').setAttribute('d', chart.linePath);

  const lastPoint = document.getElementById('lastPoint');
  lastPoint.setAttribute('cx', chart.lastP.x);
  lastPoint.setAttribute('cy', chart.lastP.y);

  document.getElementById('startLabel').textContent = fmtDate(first.d);

  const noteDotsG = document.getElementById('noteDots');
  noteDotsG.innerHTML = '';
  const svgNs = 'http://www.w3.org/2000/svg';
  chart.noteDots.forEach(p => {
    const c = document.createElementNS(svgNs, 'circle');
    c.setAttribute('cx', p.x);
    c.setAttribute('cy', p.y);
    c.setAttribute('r', '3.5');
    c.setAttribute('fill', '#fff');
    c.setAttribute('stroke', '#2E8B62');
    c.setAttribute('stroke-width', '2');
    noteDotsG.appendChild(c);
  });
}

function render() {
  const entries = state.entries;
  const goal = state.goal;
  const showGoal = SHOW_GOAL;
  const last = entries[entries.length - 1];
  const first = entries[0];

  const today = new Date();
  document.getElementById('dateText').textContent =
    today.getDate() + ' ' + MONTHS[today.getMonth()] + ' ' + today.getFullYear();

  document.getElementById('goalHeader').textContent = showGoal ? 'Hedef ' + fmt(goal) + ' kg' : '';
  document.getElementById('weightNum').textContent = fmt(last.w);

  const diff30 = last.w - first.w;
  const change30 = 'Son 30 gün ' + (diff30 <= 0 ? '−' : '+') + fmt(Math.abs(diff30)) + ' kg';
  const rem = last.w - goal;
  const remaining = !showGoal ? '' : (rem > 0.05 ? 'Hedefe ' + fmt(rem) + ' kg' : 'Hedefe ulaşıldı');
  document.getElementById('subline').textContent = [remaining, change30].filter(Boolean).join(' · ');

  renderChart(entries, goal, showGoal);

  const overlay = document.getElementById('popupOverlay');
  overlay.hidden = !state.popupOpen;
  if (state.popupOpen && state.draft) {
    document.getElementById('draftWeight').textContent = fmt(state.draft.w);

    const groupsEl = document.getElementById('chipGroups');
    groupsEl.innerHTML = '';
    chipGroups().forEach(g => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'chip-group';

      const title = document.createElement('div');
      title.className = 'chip-group-title';
      title.textContent = g.title;
      groupDiv.appendChild(title);

      const row = document.createElement('div');
      row.className = 'chip-row';
      g.chips.forEach(c => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip' + (c.selected ? ' selected' : '');
        btn.textContent = c.label;
        btn.addEventListener('click', () => toggle(g.key, c.value));
        row.appendChild(btn);
      });
      groupDiv.appendChild(row);
      groupsEl.appendChild(groupDiv);
    });
  }

  const goalOverlay = document.getElementById('goalPopupOverlay');
  goalOverlay.hidden = !state.goalPopupOpen;
  if (state.goalPopupOpen && state.goalDraft !== null) {
    document.getElementById('goalDraftWeight').textContent = fmt(state.goalDraft);
  }
}

document.getElementById('openUpdateBtn').addEventListener('click', open);
document.getElementById('closePopupBtn').addEventListener('click', closePopup);
document.getElementById('savePopupBtn').addEventListener('click', save);
document.querySelectorAll('[data-adjust]').forEach(btn => {
  btn.addEventListener('click', () => adjust(+btn.getAttribute('data-adjust')));
});

document.getElementById('goalHeader').addEventListener('click', openGoalPopup);
document.getElementById('closeGoalPopupBtn').addEventListener('click', closeGoalPopup);
document.getElementById('saveGoalBtn').addEventListener('click', saveGoal);
document.querySelectorAll('[data-goal-adjust]').forEach(btn => {
  btn.addEventListener('click', () => adjustGoal(+btn.getAttribute('data-goal-adjust')));
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
