import { h, clear, button } from './dom.js';
import { startInspection, restoreInspection, toggleMark, canMark, finishScene, answer, nextStep, current, buildReport, openPeek, useInspectionItem } from '../core/inspect.js';
import { parseSave, emptySave, applyProgress } from '../core/save.js';
import { addWrong, dueCards, markReview, reviewProblem } from '../core/review.js';
import { judgeCite, judgeLaw, judgeRebut } from '../core/judge.js';
import { peekFree } from '../core/fields.js';
import { ITEMS, itemRewards, useItem, grantItems } from '../core/items.js';
import { makeRng } from '../core/rng.js';
import { startRun, makeRunSite, afterSite, resolveReport, rewardChoices, takeReward, bestRun } from '../core/run.js';
import { home } from './screens/home.js';
import { hotspotText } from './screens/scene.js';
import { runStart } from './screens/run-start.js';
import { runScene } from './screens/run-scene.js';
import { reward } from './screens/reward.js';
import { runResult } from './screens/run-result.js';
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
let cards = [];
let places = [];
let articles = {};
let sites = [];
let run = null;
let page = 'home';
let site;
let st;
let result;
let tapeArmed = false;
let reviewCards = [];
let reviewAnswer;
let reviewAnswered = false;
let completed = 0;
let storageFailed = false;

function announce(message) { status.textContent = message; }

function persist() {
  if (run) run = { ...run, site, inspection: st, result, page };
  save = { ...save, run };
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
  persist();
  render();
}

function resumePage() {
  if (!run) return 'home';
  if (run.phase === 'won') return 'run-result';
  if (run.phase === 'failed') return result && run.page === 'report' ? 'report' : 'run-result';
  if (run.phase === 'reward') return result && run.page === 'report' ? 'report' : 'reward';
  if (!site || !st) return 'run-start';
  return st.phase === 'scene' ? 'scene' : st.phase === 'rebut' ? 'rebut' : 'cite';
}

function dispatch() {
  if (run) { navigate(resumePage()); return; }
  run = startRun(crypto.getRandomValues(new Uint32Array(1))[0]);
  site = st = result = undefined;
  navigate('run-start');
}

function enterSite() {
  site = makeRunSite(run, cards, places, articles);
  st = startInspection(site, run.relics);
  result = undefined;
  tapeArmed = false;
  navigate('scene');
}

function showArticle(articleNo) {
  const openerIndex = [...root.querySelectorAll('button')].indexOf(document.activeElement);
  if (page === 'cite') {
    const pos = current(st);
    if (pos?.step === 'cite' && !Object.hasOwn(st.answers[pos.vid] ?? {}, 'cite')) {
      const v = site.violations.find(v => v.id === pos.vid);
      st = openPeek(st, pos.vid, peekFree(save, v.article));
      persist();
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
  if (run.phase !== 'site') return;
  result = resolveReport(run, buildReport(st, site));
  const now = Date.now();
  const outcome = applyProgress(save, site, result, playDay(now), makeRng(`${run.seed}:meta:${run.day}`));
  save = outcome.save;
  result = { ...result, progress: outcome.progress };
  const add = (vid, step) => {
    const v = site.violations.find(v => v.id === vid);
    // Separate different observed values while preserving the existing review key format.
    const siteId = `${site.id}-${v.cardId}-${String(v.v ?? 'text').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    save = { ...save, review: addWrong(save.review, {
      key: `${siteId}:${vid}:${step}`, siteId, vid, step, cardId: v.cardId, v: v.v,
      snapshot: { violation: v, text: hotspotText(site, vid) },
    }, now) };
  };
  for (const vid of result.missed) add(vid, 'cite');
  for (const vid of result.found) for (const step of ['cite', 'law', 'rebut']) {
    if (!result.perViolation[vid][step]) add(vid, step);
  }
  run = afterSite(run, result);
  if (run.phase === 'reward') run = { ...run, choices: rewardChoices(run, makeRng(`${run.seed}:reward:${run.day}`)) };
  if (run.phase === 'failed') save = { ...save, bestRun: bestRun(save.bestRun, run) };
  navigate('report');
}

function chooseReward(choice) {
  const next = takeReward(run, choice);
  if (next === run) return;
  if (choice.type === 'item') save = grantItems(save, [choice.id]).save;
  run = next;
  site = st = result = undefined;
  if (run.phase === 'won') {
    save = { ...save, bestRun: bestRun(save.bestRun, run) };
    navigate('run-result');
  } else enterSite();
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
  const next = useInspectionItem(st, site, id, {
    sceneId: site.scenes[0].id,
    rng: makeRng(`${run.seed}:item:${run.day}:${st.usedItems?.length ?? 0}`), ...options,
  });
  if (next === st) { announce('지금은 이 장비를 사용하실 수 없습니다.'); return; }
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
  persist();
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
  const v = reviewProblem(card, sites)?.v;
  if (v && !reviewAnswered) return;
  if (v) {
    const judge = { cite: judgeCite, law: judgeLaw, rebut: judgeRebut }[card.step];
    const correct = judge(v, reviewAnswer);
    save = { ...save, review: markReview(save.review, card.key, correct, Date.now()) };
    if (correct && card.box === 5) {
      const granted = grantItems(save, itemRewards(null, { graduated: true }, makeRng(`${card.key}:${card.due}:graduate`)));
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
  const common = { save, sites, articles, site, run, onHome: () => navigate('home'), onArticle: showArticle, onItem: useEquipment };
  let screen;
  if (page === 'home') screen = home({ ...common, onReview: startReview, onCodex: () => navigate('codex'), onDispatch: dispatch });
  if (page === 'run-start') screen = runStart({ run, onStart: enterSite });
  if (page === 'codex') screen = codex(common);
  if (page === 'scene') screen = runScene({ ...common, st, tapeArmed,
    onMark: id => {
      if (tapeArmed) { useEquipment('tape', { hotspotId: id }); return; }
      if (!st.marks.includes(id) && !canMark(st, site)) { announce('지적 수가 가득 찼습니다. 기존 표시를 취소해 주세요.'); return; }
      st = toggleMark(st, id);
      persist();
      render(false);
      [...root.querySelectorAll('.hotspot')].find(el => el.getAttribute('aria-label')?.startsWith(`${hotspotText(site, id)} ·`))?.focus({ preventScroll: true });
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
    screen = h('div', {}, h('p', { className: 'run-status' }, `${run.day}/5일차 · 신뢰도 ${run.trust}`), page === 'rebut' ? rebut(props) : cite(props));
  }
  if (page === 'report') screen = report({ ...common, result, onNext: () => navigate(run.phase === 'failed' ? 'run-result' : 'reward') });
  if (page === 'reward') screen = reward({ ...common, choices: run.choices, onChoose: chooseReward });
  if (page === 'run-result') screen = runResult({ ...common, onHome: () => {
    run = null;
    site = st = result = undefined;
    navigate('home');
  } });
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
  if (focus) { window.scrollTo(0, 0); root.querySelector('h1')?.focus({ preventScroll: true }); }
}

async function loadJSON(path) {
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function boot() {
  root.replaceChildren(h('p', { role: 'status' }, '점검 자료를 불러오고 있습니다…'));
  try {
    [cards, places, articles] = await Promise.all([loadJSON('data/cards.json'), loadJSON('data/places.json'), loadJSON('data/articles.json')]);
    try { save = parseSave(localStorage.getItem(STORAGE_KEY)); } catch {
      announce('저장소에 접근할 수 없습니다. 현재 창에서 진행해 주세요.');
      storageFailed = true;
    }
    // The codex uses the complete card catalogue, including legacy collected articles.
    sites = [{ violations: [...cards, ...save.codex.map(article => ({ article }))] }];
    run = save.run;
    site = run?.site;
    st = run?.inspection && site ? restoreInspection(run.inspection, site) : undefined;
    result = run?.result;
    navigate(resumePage());
    if ('serviceWorker' in navigator && window.isSecureContext) {
      // 새 버전 서비스워커가 자리를 넘겨받으면 한 번만 새로고침해 옛 화면이 남지 않게 한다(첫 설치 때는 하지 않음)
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController && !reloaded) { reloaded = true; location.reload(); }
      });
      navigator.serviceWorker.register('sw.js', { scope: './' }).then(registration => {
        const ready = () => { if (!storageFailed) announce('오프라인 준비를 마쳤습니다. 연결 없이 다시 방문하실 수 있습니다.'); };
        if (!hadController) registration.installing?.addEventListener('statechange', event => { if (event.target.state === 'activated') ready(); });
      }).catch(() => { if (!storageFailed) announce('오프라인 준비가 되지 않았습니다. 연결된 상태로 이용해 주세요.'); });
    }
  } catch {
    root.replaceChildren(h('section', {}, h('h1', {}, '자료를 불러오지 못했습니다'),
      h('p', {}, '카드·현장 자료와 연결 상태를 확인하신 뒤 다시 시도해 주세요.'), button('재시도', boot, { className: 'primary full' })));
  }
}

window.addEventListener('offline', () => { if (!storageFailed) announce('오프라인으로 이용하고 계십니다. 저장된 자료로 계속 진행해 주세요.'); });
window.addEventListener('online', () => { if (!storageFailed) announce('다시 연결되었습니다.'); });
boot();
