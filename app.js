'use strict';

const STORAGE_KEY = 'kilo-takip-v2';
const GOAL_STORAGE_KEY = 'kilo-takip-hedef-v1';
const GOAL_DEFAULT = 80;
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

function fmtFullDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}

function loadEntries() {
  try {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(entries) ? entries : [];
  } catch (e) {
    return [];
  }
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
  const cur = state.entries.length ? state.entries[state.entries.length - 1].w : state.goal;
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
  return { linePath, areaPath, noteDots, lastP, pts, goalY: +yOf(goal).toFixed(1) };
}

function chipGroups() {
  const draft = state.draft || {};
  return CHIP_DEFS.map(g => ({
    title: g.title,
    key: g.key,
    chips: g.opts.map(o => ({ label: o[0], value: o[1], selected: draft[g.key] === o[1] }))
  }));
}

let chartPoints = [];

function renderChart(entries, goal, showGoal) {
  const goalLine = document.getElementById('goalLine');
  const lastPoint = document.getElementById('lastPoint');
  const noteDotsG = document.getElementById('noteDots');

  if (!entries.length) {
    chartPoints = [];
    hideHover();
    const H = 176, pt = 14, pb = 24;
    const mid = pt + (H - pt - pb) / 2;
    goalLine.style.display = showGoal ? '' : 'none';
    goalLine.setAttribute('y1', mid);
    goalLine.setAttribute('y2', mid);
    document.getElementById('areaPath').setAttribute('d', '');
    document.getElementById('linePath').setAttribute('d', '');
    document.getElementById('startLabel').textContent = '';
    lastPoint.style.display = 'none';
    noteDotsG.innerHTML = '';
    return;
  }

  lastPoint.style.display = '';
  const chart = computeChart(entries, goal, showGoal);
  chartPoints = chart.pts;
  const first = entries[0];

  goalLine.style.display = showGoal ? '' : 'none';
  goalLine.setAttribute('y1', chart.goalY);
  goalLine.setAttribute('y2', chart.goalY);

  document.getElementById('areaPath').setAttribute('d', chart.areaPath);
  document.getElementById('linePath').setAttribute('d', chart.linePath);

  lastPoint.setAttribute('cx', chart.lastP.x);
  lastPoint.setAttribute('cy', chart.lastP.y);

  document.getElementById('startLabel').textContent = fmtDate(first.d);

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

function showHoverAt(p) {
  const hoverLine = document.getElementById('hoverLine');
  const hoverPoint = document.getElementById('hoverPoint');
  const tooltip = document.getElementById('chartTooltip');

  hoverLine.setAttribute('x1', p.x);
  hoverLine.setAttribute('x2', p.x);
  hoverLine.style.opacity = '1';
  hoverPoint.setAttribute('cx', p.x);
  hoverPoint.setAttribute('cy', p.y);
  hoverPoint.style.opacity = '1';

  tooltip.hidden = false;
  tooltip.style.left = (p.x / 342 * 100) + '%';
  tooltip.style.top = (p.y / 176 * 100) + '%';
  const parts = [fmtDate(p.e.d) + ': ' + fmt(p.e.w) + ' kg'];
  if (p.e.note) parts.push(p.e.note);
  tooltip.textContent = parts.join(' · ');
}

function hideHover() {
  document.getElementById('hoverLine').style.opacity = '0';
  document.getElementById('hoverPoint').style.opacity = '0';
  document.getElementById('chartTooltip').hidden = true;
}

function nearestPointFromClientX(clientX) {
  const svg = document.getElementById('chartSvg');
  const rect = svg.getBoundingClientRect();
  if (!rect.width) return null;
  const relX = (clientX - rect.left) / rect.width * 342;
  let nearest = chartPoints[0];
  let bestDist = Infinity;
  for (const p of chartPoints) {
    const dist = Math.abs(p.x - relX);
    if (dist < bestDist) { bestDist = dist; nearest = p; }
  }
  return nearest;
}

function onChartPointer(evt) {
  if (!chartPoints.length) return;
  const p = nearestPointFromClientX(evt.clientX);
  if (p) showHoverAt(p);
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

  if (!entries.length) {
    document.getElementById('weightNum').textContent = '—';
    document.getElementById('subline').textContent = 'Henüz kayıt yok · Güncelle\'ye dokun';
    document.getElementById('lastEntryDate').textContent = '';
  } else {
    document.getElementById('weightNum').textContent = fmt(last.w);
    let change30 = '';
    if (entries.length > 1) {
      const diff30 = last.w - first.w;
      change30 = 'Son 30 gün ' + (diff30 <= 0 ? '−' : '+') + fmt(Math.abs(diff30)) + ' kg';
    }
    const rem = last.w - goal;
    const remaining = !showGoal ? '' : (rem > 0.05 ? 'Hedefe ' + fmt(rem) + ' kg' : 'Hedefe ulaşıldı');
    document.getElementById('subline').textContent = [remaining, change30].filter(Boolean).join(' · ');

    const todayIso = today.toISOString().slice(0, 10);
    document.getElementById('lastEntryDate').textContent =
      last.d === todayIso ? 'Bugün güncellendi' : 'Son kayıt: ' + fmtFullDate(last.d);
  }

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

const chartSvg = document.getElementById('chartSvg');
const chartWrap = document.querySelector('.chart-wrap');
chartSvg.addEventListener('pointerdown', (evt) => {
  chartSvg.setPointerCapture(evt.pointerId);
  onChartPointer(evt);
});
chartSvg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType === 'mouse' || evt.buttons > 0) onChartPointer(evt);
});
chartSvg.addEventListener('pointercancel', hideHover);
chartSvg.addEventListener('pointerleave', (evt) => {
  if (evt.pointerType === 'mouse') hideHover();
});
document.addEventListener('pointerdown', (evt) => {
  if (!chartWrap.contains(evt.target)) hideHover();
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

(function setupInstallBanner() {
  const DISMISS_KEY = 'kilo-takip-install-dismissed';
  const banner = document.getElementById('installBanner');
  const descEl = document.getElementById('installBannerDesc');
  const actionBtn = document.getElementById('installActionBtn');
  const closeBtn = document.getElementById('installCloseBtn');

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (isStandalone) return;
  if (localStorage.getItem(DISMISS_KEY)) return;

  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isIosSafari = isIos && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);

  function dismiss() {
    banner.hidden = true;
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
  }

  closeBtn.addEventListener('click', dismiss);

  if (isIos) {
    if (isIosSafari) {
      descEl.textContent = 'Paylaş simgesine, ardından "Ana Ekrana Ekle"ye dokun.';
      banner.hidden = false;
    }
    return;
  }

  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (evt) => {
    evt.preventDefault();
    deferredPrompt = evt;
    descEl.textContent = 'Hızlı erişim için uygulamayı ana ekranına ekle.';
    actionBtn.hidden = false;
    banner.hidden = false;
  });

  actionBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner.hidden = true;
  });

  window.addEventListener('appinstalled', dismiss);
})();
