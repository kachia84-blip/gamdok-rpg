import { h, clear, button } from './dom.js';
import { startInspection, toggleMark, canMark, finishScene, answer, nextStep, current, buildReport, openPeek, useInspectionItem } from '../core/inspect.js';
import { parseSave, emptySave, applyProgress, isUnlocked } from '../core/save.js';
import { addWrong, dueCards, markReview } from '../core/review.js';
import { judgeCite, judgeLaw, judgeRebut } from '../core/judge.js';
import { peekFree } from '../core/fields.js';
import { ITEMS, itemRewards, useItem, grantItems } from '../core/items.js';
import { home } from './screens/home.js';
import { briefing } from './screens/briefing.js';
import { scene, hotspotText } from './screens/scene.js';
import { cite } from './screens/cite.js';
import { rebut } from './screens/rebut.js';
import { report } from './screens/report.js';
import { review } from './screens/review.js';
import { article } from './screens/article.js';
import { codex } from './screens/codex.js';

const STORAGE_KEY = 'gamdok_rpg_v1';
const root = document.querySelector('#app');
const status = document.querySelector('#status');
let save = emptySave();
let sites = [];
let articles = {};
let page = 'home';
let site;
let st;
let sceneIndex = 0;
let tapeArmed = false;
let result;
let reviewCards = [];
let reviewAnswer;
let reviewAnswered = false;
let completed = 0;
let storageFailed = false;

function announce(message) {
  status.textContent = message;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    storageFailed = false;
  } catch {
    storageFailed = true;
    announce('이 기기에 저장할 수 없습니다. 현재 창에서는 계속 진행하실 수 있습니다.');
  }
}

function navigate(next) {
  page = next;
  render();
}

function showArticle(articleNo) {
  const openerIndex = [...root.querySelectorAll('button')].indexOf(document.activeElement);
  if (page === 'cite') {
    const pos = current(st);
    if (pos?.step === 'cite' && !Object.hasOwn(st.answers[pos.vid] ?? {}, 'cite')) {
      const v = site.violations.find(v => v.id === pos.vid);
      st = openPeek(st, pos.vid, peekFree(save, v.article));
    }
  }
  const dialog = article({ articleNo, articles });
  if (page === 'cite') dialog.addEventListener('close', () => {
    render(false);
    root.querySelectorAll('button')[openerIndex]?.focus({ preventScroll: true });
  });
  document.body.append(dialog);
  dialog.showModal();
}

function playDay(now) {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function saveReport() {
  result = buildReport(st, site);
  const now = Date.now();
  const outcome = applyProgress(save, site, result, playDay(now), Math.random);
  save = outcome.save;
  result = { ...result, progress: outcome.progress };
  const add = (vid, step) => {
    save = { ...save, review: addWrong(save.review, { key: `${site.id}:${vid}:${step}`, siteId: site.id, vid, step }, now) };
  };
  for (const vid of result.missed) add(vid, 'cite');
  for (const vid of result.found) for (const step of ['cite', 'law', 'rebut']) {
    if (!result.perViolation[vid][step]) add(vid, step);
  }
  persist();
  navigate('report');
}

function useEquipment(id, options = {}) {
  if (id === 'tape' && !options.hotspotId) {
    if (!save.items.tape) return;
    tapeArmed = !tapeArmed;
    render(false);
    return;
  }
  const consumed = useItem(save, id);
  if (!consumed.ok) return;
  const next = useInspectionItem(st, site, id, { sceneId: site.scenes[sceneIndex].id, rng: Math.random, ...options });
  if (next === st) {
    announce('이미 확인하셨거나 지금 사용할 수 없는 장비입니다.');
    return;
  }
  st = next;
  save = consumed.save;
  tapeArmed = false;
  persist();
  render(false);
}

function submit(value) {
  const pos = current(st);
  if (!pos || Object.hasOwn(st.answers[pos.vid] ?? {}, pos.step)) return;
  st = answer(st, pos.step, pos.vid, value);
  render(false);
  root.querySelector('[data-next]')?.focus();
}

function advance() {
  const pos = current(st);
  if (!pos || !Object.hasOwn(st.answers[pos.vid] ?? {}, pos.step)) return;
  st = nextStep(st);
  if (st.phase === 'report') saveReport();
  else navigate(st.phase === 'rebut' ? 'rebut' : 'cite');
}

function startReview() {
  reviewCards = dueCards(save.review, Date.now());
  reviewAnswered = false;
  reviewAnswer = undefined;
  completed = 0;
  navigate('review');
}

function nextReview() {
  const card = reviewCards[0];
  if (!card) return;
  const v = sites.find(s => s.id === card.siteId)?.violations.find(v => v.id === card.vid);
  if (v && !reviewAnswered) return;
  if (v) {
    const judge = { cite: judgeCite, law: judgeLaw, rebut: judgeRebut }[card.step];
    const correct = judge(v, reviewAnswer);
    save = { ...save, review: markReview(save.review, card.key, correct, Date.now()) };
    if (correct && card.box === 5) {
      const granted = grantItems(save, itemRewards(null, { graduated: true }, Math.random));
      save = granted.save;
      announce(granted.received.length ? `오답 카드를 졸업하셨습니다. ${ITEMS[granted.received[0]].name} 1개를 받으셨습니다.` : '오답 카드를 졸업하셨습니다. 장비 가방이 가득 찼습니다.');
    }
    persist();
    completed += 1;
  }
  reviewCards = reviewCards.slice(1);
  reviewAnswered = false;
  reviewAnswer = undefined;
  render();
}

function render(focus = true) {
  const common = { save, sites, articles, site, onHome: () => navigate('home'), onArticle: showArticle, onItem: useEquipment };
  let screen;
  if (page === 'home') screen = home({ ...common, onReview: startReview, onCodex: () => navigate('codex'), onSite: id => {
    if (!isUnlocked(save, sites, id)) return;
    site = sites.find(s => s.id === id);
    navigate('briefing');
  } });
  if (page === 'briefing') screen = briefing({ ...common, onStart: () => {
    st = startInspection(site);
    sceneIndex = 0;
    tapeArmed = false;
    navigate('scene');
  } });
  if (page === 'codex') screen = codex(common);
  if (page === 'scene') screen = scene({ ...common, st, sceneIndex, tapeArmed,
    onScene: index => { sceneIndex = index; render(false); root.querySelector('[aria-selected="true"]')?.focus(); },
    onMark: id => {
      if (tapeArmed) { useEquipment('tape', { hotspotId: id }); return; }
      if (!st.marks.includes(id) && !canMark(st, site)) {
        announce('지적 수가 가득 찼습니다. 기존 표시를 취소해 주세요.');
        return;
      }
      st = toggleMark(st, id);
      render(false);
      const hotspots = [...root.querySelectorAll('.hotspot')];
      hotspots.find(el => el.getAttribute('aria-label')?.startsWith(`${hotspotText(site, id)} ·`))?.focus({ preventScroll: true });
    },
    onFinish: () => {
      if (st.phase !== 'scene') return;
      st = finishScene(st, site);
      if (st.phase === 'report') saveReport();
      else navigate('cite');
    },
  });
  if (page === 'cite' || page === 'rebut') {
    const { vid, step } = current(st);
    const v = site.violations.find(item => item.id === vid);
    const props = { ...common, st, v, step, quote: hotspotText(site, vid), hasAnswer: Object.hasOwn(st.answers[vid] ?? {}, step), value: st.answers[vid]?.[step], onAnswer: submit, onNext: advance };
    screen = page === 'rebut' ? rebut(props) : cite(props);
  }
  if (page === 'report') screen = report({ ...common, result });
  if (page === 'review') screen = review({ ...common, cards: reviewCards, completed, hasAnswer: reviewAnswered, value: reviewAnswer, onNext: nextReview,
    onAnswer: value => {
      if (reviewAnswered) return;
      reviewAnswer = value;
      reviewAnswered = true;
      render(false);
      root.querySelector('[data-next]')?.focus();
    },
  });
  clear(root);
  root.append(screen);
  if (focus) {
    window.scrollTo(0, 0);
    root.querySelector('h1')?.focus({ preventScroll: true });
  }
}

async function loadJSON(path) {
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function boot() {
  root.replaceChildren(h('p', { role: 'status' }, '점검 자료를 불러오고 있습니다…'));
  try {
    const ids = await loadJSON('data/sites.json');
    if (!Array.isArray(ids) || !ids.length || !ids.every(id => typeof id === 'string' && /^s\d+$/.test(id)) || new Set(ids).size !== ids.length) throw new Error('현장 목록 형식 오류');
    const [loadedSites, loadedArticles] = await Promise.all([
      Promise.all(ids.map(async id => {
        const loaded = await loadJSON(`data/sites/${id}.json`);
        if (loaded.id !== id || !Number.isInteger(loaded.order) || !loaded.scenes?.length || !Array.isArray(loaded.violations) || !loaded.hotspots) throw new Error('현장 형식 오류');
        return loaded;
      })),
      loadJSON('data/articles.json'),
    ]);
    sites = loadedSites.sort((a, b) => a.order - b.order);
    articles = loadedArticles;
    try { save = parseSave(localStorage.getItem(STORAGE_KEY)); } catch {
      announce('저장소에 접근할 수 없습니다. 현재 창에서 진행해 주세요.');
      storageFailed = true;
    }
    navigate('home');
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('sw.js', { scope: './' }).then(registration => {
        const worker = registration.installing;
        const ready = () => { if (!storageFailed) announce('오프라인 준비를 마쳤습니다. 연결 없이 다시 방문하실 수 있습니다.'); };
        if (registration.active) ready();
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'activated') ready();
          if (worker.state === 'redundant' && !storageFailed) announce('오프라인 자료 저장을 완료하지 못했습니다. 연결된 상태로 다시 방문해 주세요.');
        });
      }).catch(() => { if (!storageFailed) announce('오프라인 준비가 되지 않았습니다. 연결된 상태로 이용해 주세요.'); });
    }
  } catch {
    root.replaceChildren(h('section', {}, h('h1', {}, '자료를 불러오지 못했습니다'),
      h('p', {}, '현장 자료와 연결 상태를 확인하신 뒤 다시 시도해 주세요.'),
      button('다시 불러오기', boot, { className: 'primary full' })));
  }
}

window.addEventListener('offline', () => { if (!storageFailed) announce('오프라인으로 이용하고 계십니다. 저장된 자료로 계속 진행해 주세요.'); });
window.addEventListener('online', () => { if (!storageFailed) announce('다시 연결되었습니다.'); });
boot();
