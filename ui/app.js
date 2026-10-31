import { h, button } from './dom.js';
import { emptySave, parseSave, STORAGE_KEY } from '../core/save.js';
import { makeRng } from '../core/rng.js';
import { allocatePoint, faint, heal } from '../core/hero.js';
import { startDungeon, nextFloor, rememberWrong, rpgCards } from '../core/dungeon.js';
import { startBattle, battleAction, ended } from '../core/battle.js';
import { buy, stay, consume, CONSUMABLES } from '../core/shop.js';
import { storyContent, monsterContent } from './content.js';
import { town } from './screens/town.js';
import { dungeon } from './screens/dungeon.js';
import { battle } from './screens/battle.js';
import { levelup } from './screens/levelup.js';
import { shop } from './screens/shop.js';
import { inn } from './screens/inn.js';
import { senior } from './screens/senior.js';
import { skillbook } from './screens/skillbook.js';
import { status as statusScreen } from './screens/status.js';
import { story as storyScreen } from './screens/story.js';
import { article } from './screens/article.js';
import { hpBar, panel } from './screens/common.js';

const root = document.querySelector('#app');
const hud = document.querySelector('#hero-status');
const status = document.querySelector('#status');
let save = emptySave();
let cards = [];
let articles = {};
let monsters = {};
let narrative = storyContent(null);
let page = 'story';
let storyId = 'prologue';
let levelReturn = 'town';
let message = '';
let wasFaint = false;
let bagOpen = false;
let storageFailed = false;
const rng = () => makeRng(crypto.getRandomValues(new Uint32Array(1))[0]);
const announce = text => { status.textContent = text; };

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); storageFailed = false; }
  catch { storageFailed = true; announce('이 기기에 저장할 수 없습니다. 현재 창에서는 계속 진행하실 수 있습니다.'); }
}

function navigate(next) {
  page = next;
  message = '';
  bagOpen = false;
  persist();
  render();
}

function markSeen(id) {
  if (!save.story.seen.includes(id)) save.story.seen.push(id);
}

function showArticle(no) {
  const dialog = article({ articleNo: no, articles });
  document.body.append(dialog);
  dialog.showModal();
}

function enterDungeon() {
  if (!save.run) save.run = startDungeon(cards, rng(), save.revived);
  save.best.floor = Math.max(save.best.floor, save.run.floor);
  navigate(save.run.battle ? 'battle' : 'dungeon');
}

function returnTown() {
  save.run = null;
  wasFaint = false;
  navigate('town');
}

function openEvent() {
  const run = save.run;
  const event = run?.events[run.step];
  if (!event || run.battle) return;
  message = '';
  if (event.type === 'battle') {
    run.battle = startBattle(save.hero, event, save.skills, rng());
    run.battle.log = [monsterContent(monsters, event).appear];
    navigate('battle');
    return;
  }
  if (event.type === 'npc') event.opened = true;
  if (event.type === 'chest') {
    save.hero = { ...save.hero, gold: save.hero.gold + event.gold };
    message = `보물상자에서 ${event.gold}G를 얻으셨습니다.`;
    run.step++;
  }
  if (event.type === 'rest') {
    const before = save.hero.hp;
    save.hero = heal(save.hero, event.hp);
    message = `쉼터에서 HP ${save.hero.hp - before}을 회복하셨습니다.`;
    run.step++;
  }
  persist(); render();
}

function answerQuiz(value) {
  const run = save.run;
  const event = run?.events[run.step];
  if (event?.type !== 'npc' || !event.opened || !event.choices.includes(value)) return;
  const correct = value === event.article;
  if (correct) save.hero = { ...save.hero, gold: save.hero.gold + event.gold };
  message = `${correct ? `정답입니다! ${event.gold}G를 얻으셨습니다.` : `알맞은 조문은 ${event.article}입니다.`} ${event.quote}`;
  run.step++;
  persist(); render();
}

function act(action) {
  if (!save.run?.battle) return;
  const before = save.run.battle;
  const next = battleAction(before, action, rng());
  if (next === before) return;
  save.run.battle = next;
  save.hero = next.hero;
  save.skills = next.skills;
  save.revived = rememberWrong(save.revived, next);
  if (next.phase === 'won' && !next.wrong) save.revived = save.revived.filter(r => r.cardId !== next.event.cardId || r.v !== next.event.v);
  if (action.type === 'item' || ended(next)) bagOpen = false;
  persist(); render(false, true);
  if (next.phase === 'rebut' && before.phase !== 'rebut') root.querySelector('input')?.focus({ preventScroll: true });
}

function continueBattle() {
  const state = save.run?.battle;
  if (!state || !ended(state)) return;
  if (state.phase === 'lost') {
    save.hero = faint(save.hero);
    save.run = null;
    wasFaint = true;
    navigate('inn');
    return;
  }
  if (save.hero.points > 0) { levelReturn = 'battle'; navigate('levelup'); return; }
  if (state.phase === 'won' && state.event.boss) { storyId = 'boss_clear'; navigate('story'); return; }
  if (state.phase === 'fled' && state.event.boss) { returnTown(); return; }
  save.run.step++;
  save.run.battle = null;
  navigate('dungeon');
}

function finishStory() {
  markSeen(storyId);
  if (storyId === 'boss_clear') { markSeen('chapter2_teaser'); save.run = null; }
  navigate('town');
}

function render(focus = true, animate = false) {
  const hero = save.hero;
  hud.replaceChildren(h('div', { className: 'hero-summary' }, h('strong', {}, `Lv${hero.lv}`), h('span', {}, `${hero.gold}G`)), hpBar(hero.hp, hero.maxHp, '내 HP'));
  const common = { hero, save, story: narrative, articles, message, onTown: () => navigate('town') };
  let screen;
  if (page === 'town') screen = town({ ...common, onEnter: enterDungeon, onPage: navigate });
  if (page === 'dungeon' && save.run) {
    screen = dungeon({ ...common, run: save.run, onEvent: openEvent, onTown: returnTown,
      onNext: () => {
        save.run = nextFloor(save.run, cards, rng());
        save.best.floor = Math.max(save.best.floor, save.run.floor);
        navigate('dungeon');
      } });
    const event = save.run.events[save.run.step];
    if (event?.type === 'npc' && event.opened) {
      const npc = narrative.events.npc[0] ?? { name: '떠돌이 감독관', emoji: '🧓' };
      screen.append(panel(h('h2', {}, `${npc.emoji} ${npc.name}`), h('p', {}, event.text),
        h('p', {}, '이 상황에 맞는 조문을 골라 주세요.'),
        h('div', { className: 'choices' }, event.choices.map(value => button(value, () => answerQuiz(value))))));
    }
  }
  if (page === 'battle' && save.run?.battle) screen = battle({ state: save.run.battle,
    monster: monsterContent(monsters, save.run.battle.event), bagOpen, articles, animate,
    onBag: () => { bagOpen = !bagOpen; render(false); }, onAction: act, onContinue: continueBattle, onArticle: showArticle });
  if (page === 'levelup') screen = levelup({ hero, onAllocate: stat => {
    save.hero = allocatePoint(save.hero, stat);
    if (save.run?.battle) save.run.battle.hero = save.hero;
    persist(); render(false);
  }, onDone: () => { if (!save.hero.points) navigate(levelReturn); } });
  if (page === 'shop') screen = shop({ ...common, onBuy: id => {
    const result = buy(save.hero, id); save.hero = result.hero; message = result.message; persist(); render(false);
  } });
  if (page === 'inn') screen = inn({ ...common, wasFaint, onStay: () => {
    const result = stay(save.hero); save.hero = result.hero; message = result.message; persist(); render(false);
  } });
  if (page === 'senior') screen = senior({ ...common, seen: save.story.seen, onRead: id => { markSeen(id); persist(); render(false); },
    onPrologue: () => { storyId = 'prologue'; navigate('story'); } });
  if (page === 'skillbook') screen = skillbook({ ...common, skills: save.skills, onArticle: showArticle });
  if (page === 'status') screen = statusScreen({ ...common, best: save.best,
    onLevel: () => { levelReturn = 'status'; navigate('levelup'); }, onUse: id => {
      if (!CONSUMABLES[id]?.hp || save.hero.hp === save.hero.maxHp) return;
      const next = consume(save.hero, id);
      if (next === save.hero) return;
      save.hero = next; message = `${CONSUMABLES[id].name}를 사용하셨습니다.`; persist(); render(false);
    } });
  if (page === 'story') screen = storyScreen({ title: storyId === 'boss_clear' ? '1장 클리어!' : '신입 감독관의 첫날',
    lines: narrative[storyId], teaser: storyId === 'boss_clear' ? narrative.chapter2_teaser : null, onDone: finishStory });
  root.replaceChildren(screen ?? h('p', {}, '마을로 이동해 주세요.'));
  document.body.classList.toggle('in-battle', page === 'battle');
  if (focus) { window.scrollTo(0, 0); root.querySelector('h1')?.focus({ preventScroll: true }); }
}

async function loadJSON(path, optional = false) {
  try {
    const response = await fetch(new URL(path, document.baseURI));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) { if (optional) return null; throw error; }
}

function offlineSetup() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  // 새 워커가 자리를 넘겨받으면 한 번만 새로고침합니다. 첫 설치는 제외합니다.
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

async function boot() {
  root.replaceChildren(h('p', { role: 'status' }, '모험을 준비하고 있습니다…'));
  try {
    const loaded = await Promise.all([loadJSON('data/cards.json'), loadJSON('data/articles.json'), loadJSON('data/monsters.json', true), loadJSON('data/story.json', true)]);
    if (!Array.isArray(loaded[0]) || !rpgCards(loaded[0]).length) throw new Error('카드 자료를 확인해 주세요.');
    cards = rpgCards(loaded[0]);
    articles = loaded[1] && typeof loaded[1] === 'object' ? loaded[1] : {};
    monsters = loaded[2]; narrative = storyContent(loaded[3]);
    try { save = parseSave(localStorage.getItem(STORAGE_KEY)); }
    catch { storageFailed = true; announce('저장소에 접근할 수 없습니다. 현재 창에서 진행해 주세요.'); }
    if (save.hero.hp === 0 && !save.run?.battle) { save.hero = faint(save.hero); wasFaint = true; }
    page = !save.story.seen.includes('prologue') ? 'story' : save.run?.battle ? 'battle' : save.run ? 'dungeon' : wasFaint ? 'inn' : 'town';
    persist(); render(); offlineSetup();
  } catch {
    root.replaceChildren(panel(h('h1', {}, '모험 자료를 불러오지 못했습니다'), h('p', {}, '카드 자료와 연결 상태를 확인하신 뒤 다시 시도해 주세요.'), button('재시도', boot, { className: 'primary full' })));
  }
}

window.addEventListener('offline', () => { if (!storageFailed) announce('오프라인으로 이용하고 계십니다. 저장된 자료로 계속 진행해 주세요.'); });
window.addEventListener('online', () => { if (!storageFailed) announce('다시 연결되었습니다.'); });
boot();
