import { h, button } from './dom.js';
import { emptySave, parseSave, STORAGE_KEY } from '../core/save.js';
import { makeRng } from '../core/rng.js';
import { allocatePoint, faint, heal, xpNeeded, GEAR, effectiveStats } from '../core/hero.js';
import { getChapter, startFloors, TOWER, BOSS_EVERY } from '../core/chapters.js';
import { startDungeon, nextFloor, rememberWrong, rpgCards, AFFIXES, offerPaths, trapChance } from '../core/dungeon.js';
import { offerBoons, applyBoon, BOONS } from '../core/boons.js';
import { todayKey, questFor, dailyState, progressQuest, streakBonus, wantedState, WANTED_GOLD } from '../core/quests.js';
import { RELICS, offerRelics, chooseRelic, forceOffer, merchantStock, merchantPrice, healPrice } from '../core/relics.js';
import { canChooseJob, chooseJob } from '../core/jobs.js';
import { claimMedals } from '../core/medals.js';
import { startBattle, battleAction, ended } from '../core/battle.js';
import { buy, stay, consume, CONSUMABLES } from '../core/shop.js';
import { storyContent, monsterContent, chooseLine } from './content.js';
import { town } from './screens/town.js';
import { dungeon } from './screens/dungeon.js';
import { battle } from './screens/battle.js';
import { levelup } from './screens/levelup.js';
import { job as jobScreen } from './screens/job.js';
import { shop } from './screens/shop.js';
import { inn } from './screens/inn.js';
import { senior } from './screens/senior.js';
import { skillbook } from './screens/skillbook.js';
import { status as statusScreen } from './screens/status.js';
import { dex as dexScreen, FIELD } from './screens/dex.js';
import { story as storyScreen } from './screens/story.js';
import { article } from './screens/article.js';
import { hpBar, panel, fitScreen, sceneScreen } from './screens/common.js';
import { initFx, sfx, battleFx, isSoundEnabled, toggleSound } from './fx.js';

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
let storyReward = null;
let levelReturn = 'town';
let message = '';
let notice = '';
let questShown = false;
let wasFaint = false;
let bagOpen = false;
let storageFailed = false;
let battleView;
let toastTimer;
let disposeScreen;
initFx();
const rng = () => makeRng(crypto.getRandomValues(new Uint32Array(1))[0]);
const announce = text => {
  clearTimeout(toastTimer);
  status.textContent = text;
  toastTimer = setTimeout(() => { status.textContent = ''; }, 2000);
};

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); storageFailed = false; }
  catch { storageFailed = true; announce('이 기기에 저장할 수 없습니다. 현재 창에서는 계속 진행하실 수 있습니다.'); }
}

function navigate(next) {
  page = next;
  // 훈장 같은 알림은 던전이나 마을에 돌아왔을 때 한 번 보여 줍니다.
  message = ['dungeon', 'town', 'inn'].includes(next) ? notice : '';
  if (message) notice = '';
  bagOpen = false;
  persist();
  render();
}

function markSeen(id) {
  if (!save.story.seen.includes(id)) save.story.seen.push(id);
}

function awardMedals() {
  const { earned, gold } = claimMedals(save);
  if (!earned.length) return;
  save.medals.push(...earned.map(medal => medal.id));
  save.hero = { ...save.hero, gold: save.hero.gold + gold };
  const legend = earned.some(medal => medal.id === 'tower10');
  if (legend) save.hero = { ...save.hero, gear: { ...save.hero.gear, [GEAR.pen.slot]: 'pen' } };
  if (save.run?.battle) save.run.battle.hero = save.hero;
  notice = [notice, ...earned.map(medal => `🎖️ 훈장 「${medal.name}」 · ${medal.gold}G`), legend && `${GEAR.pen.name}을 받았습니다`].filter(Boolean).join(' ');
}

function quest(type, value = 1) {
  const result = progressQuest(save.daily, todayKey(), type, value);
  save.daily = result.daily;
  if (!result.gold) return;
  save.hero = { ...save.hero, gold: save.hero.gold + result.gold };
  if (save.run?.battle) save.run.battle.hero = save.hero;
  notice = [notice, `📋 오늘의 의뢰 「${result.quest.text}」 완료 · ${result.gold}G${result.daily.streak >= 2 ? ` · ${result.daily.streak}일 연속!` : ''}`].filter(Boolean).join(' ');
}

// 오늘의 현상수배를 최신으로 맞추고, 아직 못 잡았으면 그 카드 번호를 돌려줍니다.
function huntTarget() {
  save.wanted = wantedState(save.wanted, todayKey(), cards, save.dex);
  return save.wanted && !save.wanted.done ? save.wanted.cardId : null;
}
const wantedLabel = () => {
  const card = cards.find(item => item.id === save.wanted?.cardId);
  return card ? `${FIELD[card.field] ?? '기타'} ${card.article}` : '';
};

// 층의 마지막 칸을 넘겼을 때: 탑 기록, 유물 내밀기, 훈장 확인.
function floorDone() {
  const run = save.run;
  if (!run || run.step < run.events.length) return;
  const area = getChapter(run.chapter ?? 1);
  if (area.endless && run.floor > save.best.tower) { save.best.tower = run.floor; run.record = true; }
  save.run = offerPaths(offerRelics(run, rng(), !!area.endless), rng());
  quest('floors');
  awardMedals();
}

function showArticle(no, explanation = null) {
  const dialog = article({ articleNo: no, articles, explanation });
  document.body.append(dialog);
  dialog.showModal();
}

function enterDungeon(startFloor = 1) {
  if (!save.run) {
    if (!startFloors(save.cleared).includes(startFloor)) return;
    save.run = startDungeon(cards, rng(), save.revived, TOWER.id, startFloor, huntTarget());
    save.run.boonOffer = offerBoons(rng());
  }
  save.best.floor = Math.max(save.best.floor, save.run.floor);
  navigate(save.run.battle ? 'battle' : 'dungeon');
}

// 탐험을 마칠 때 한 줄로 결과를 알려 줍니다.
function summarize() {
  const run = save.run;
  if (!run || !(run.wins > 0 || run.step > 0)) return;
  notice = [notice, `🧾 이번 탐험: ${run.floor}층 · ${run.wins ?? 0}승 · 유물 ${(run.relics ?? []).filter(id => !RELICS[id]?.curse).length}개${run.record ? ' · 🏆 신기록!' : ''}`].filter(Boolean).join(' ');
}

function returnTown() {
  summarize();
  save.run = null;
  battleView = null;
  wasFaint = false;
  navigate('town');
}

function openEvent() {
  const run = save.run;
  const event = run?.events[run.step];
  if (!event || run.battle) return;
  message = '';
  if (event.type === 'battle') {
    battleView = null;
    run.battle = startBattle(save.hero, event, save.skills, rng(), { relics: run.relics ?? [], combo: run.combo ?? 0 });
    run.battle.log = [monsterContent(monsters, event).appear];
    navigate('battle');
    return;
  }
  if (['npc', 'altar', 'gamble', 'merchant'].includes(event.type)) event.opened = true;
  if (event.type === 'merchant' && event.relic === undefined) event.relic = merchantStock(run, rng());
  const magnet = (run.relics ?? []).includes('magnet') ? 2 : 1;
  if (event.type === 'chest') {
    save.hero = { ...save.hero, gold: save.hero.gold + event.gold * magnet };
    message = `보물상자에서 ${event.gold * magnet}G를 얻으셨습니다.`;
    run.step++;
    sfx('coin');
  }
  if (event.type === 'trap') {
    if (rng()() < trapChance(effectiveStats(save.hero, run.relics ?? []).eye)) {
      save.hero = { ...save.hero, gold: save.hero.gold + event.gold };
      message = `함정을 알아채고 피했습니다! 숨겨진 ${event.gold}G도 찾았습니다.`; sfx('coin');
    } else {
      const damage = Math.min(Math.max(0, save.hero.hp - 1), event.hp);
      save.hero = { ...save.hero, hp: save.hero.hp - damage };
      message = `함정에 걸렸습니다! HP가 ${damage} 줄었습니다. 관찰력이 높을수록 잘 피합니다.`; sfx('miss');
    }
    run.step++;
  }
  if (event.type === 'rest') {
    const before = save.hero.hp;
    save.hero = heal(save.hero, event.hp);
    message = `쉼터에서 HP ${save.hero.hp - before}을 회복하셨습니다.`;
    run.step++;
    sfx('heal');
  }
  floorDone();
  if (notice) { message = `${message} ${notice}`; notice = ''; }
  persist(); render();
}

function answerQuiz(value) {
  const run = save.run;
  const event = run?.events[run.step];
  if (event?.type !== 'npc' || !event.opened || !event.choices.includes(value)) return;
  const correct = value === event.article;
  sfx(correct ? 'coin' : 'miss');
  const prize = event.gold * ((run.relics ?? []).includes('magnet') ? 2 : 1);
  if (correct) save.hero = { ...save.hero, gold: save.hero.gold + prize };
  message = `${correct ? `정답입니다! ${prize}G를 얻으셨습니다.` : `알맞은 조문은 ${event.article}입니다.`} ${event.quote}`;
  run.step++;
  floorDone();
  if (notice) { message = `${message} ${notice}`; notice = ''; }
  persist(); render();
}

// 제단(HP를 바치고 유물), 동전 던지기(골드 걸기), 상인(유물·치료 구입)에 답합니다.
function answerSide(accept) {
  const run = save.run;
  const event = run?.events[run.step];
  if (!['altar', 'gamble', 'merchant'].includes(event?.type) || !event.opened) return;
  if (!accept) message = '그냥 지나쳤습니다.';
  else if (event.type === 'merchant') {
    const price = accept === 'heal' ? healPrice(event) : merchantPrice(event);
    if (!['relic', 'heal'].includes(accept) || save.hero.gold < price) return;
    if (accept === 'relic' && (!event.relic || (run.relics ?? []).includes(event.relic))) return;
    if (accept === 'heal' && save.hero.hp === save.hero.maxHp) return;
    save.hero = { ...save.hero, gold: save.hero.gold - price, ...(accept === 'heal' ? { hp: save.hero.maxHp } : {}) };
    if (accept === 'relic') run.relics = [...(run.relics ?? []), event.relic];
    message = accept === 'relic' ? `${RELICS[event.relic].name} 구입 · ${price}G를 냈습니다.` : `${price}G를 내고 치료받았습니다. HP가 가득 찼습니다.`;
    sfx(accept === 'heal' ? 'heal' : 'coin');
  }
  else if (event.type === 'altar') {
    const offered = forceOffer(run, rng());
    if (offered === run) {
      save.hero = { ...save.hero, gold: save.hero.gold + event.gold };
      message = `제단은 비어 있었습니다. 대신 ${event.gold}G를 주웠습니다.`; sfx('coin');
    } else {
      const cost = Math.floor(save.hero.hp / 4);
      save.hero = { ...save.hero, hp: save.hero.hp - cost };
      save.run = offered;
      message = `HP ${cost}을 바쳤습니다. 유물을 하나 고르세요.`; sfx('miss');
    }
  } else {
    const stake = Math.min(save.hero.gold, event.gold * 2);
    const heads = rng()() < 0.5;
    save.hero = { ...save.hero, gold: save.hero.gold + (heads ? stake : -stake) };
    message = heads ? `앞면! ${stake}G를 땄습니다.` : `뒷면… ${stake}G를 잃었습니다.`;
    sfx(heads ? 'coin' : 'miss');
  }
  save.run.step++;
  floorDone();
  if (notice) { message = `${message} ${notice}`; notice = ''; }
  persist(); render();
}

function act(action) {
  if (!save.run?.battle) return;
  const before = save.run.battle;
  const next = battleAction(before, action, rng());
  if (next === before) return;
  next.ui = { ...next.ui, messages: [] };
  if (next.effect?.target === 'monster') battleView.monster.hit = chooseLine(battleView.monster.hits, battleView.monster.hit);
  if (next.phase === 'rebut' && before.phase !== 'rebut') {
    next.ui.messages = [{ text: [battleView.monster.hit, next.event.instance.violation.rebuttal.claim].filter(Boolean).join(' '), speaker: battleView.monster.name }];
  } else if (action.type === 'rebut' && next.attempts > before.attempts && !ended(next)) {
    next.ui.messages = [{ text: next.log[before.log.length], speaker: '선배 감독관' }];
  }
  save.run.battle = next;
  save.hero = next.hero;
  save.skills = next.skills;
  save.revived = rememberWrong(save.revived, next);
  if (next.phase === 'won' && !next.wrong) save.revived = save.revived.filter(r => r.cardId !== next.event.cardId || r.v !== next.event.v);
  if (ended(next) && !ended(before)) {
    if (next.phase === 'won') {
      save.stats.wins++;
      save.run.wins = (save.run.wins ?? 0) + 1;
      if (next.event.elite) save.stats.elites++;
      if (save.wanted && !save.wanted.done && save.wanted.date === todayKey() && save.wanted.cardId === next.event.cardId) {
        save.wanted = { ...save.wanted, done: true };
        save.stats.wanted++;
        save.hero = { ...save.hero, gold: save.hero.gold + WANTED_GOLD };
        save.run.battle.hero = save.hero;
        notice = [notice, `🎯 현상수배 해결! ${WANTED_GOLD}G를 받았습니다.`].filter(Boolean).join(' ');
      }
      if (next.event.instance.kind === 'ok') save.stats.phantoms++;
      save.run.combo = next.combo ?? 0;
      save.stats.maxCombo = Math.max(save.stats.maxCombo, save.run.combo);
      if (!save.dex.includes(next.event.cardId)) save.dex.push(next.event.cardId);
      quest('wins'); quest('combo', save.run.combo);
      if (next.event.instance.kind === 'ok') quest('phantoms');
    } else if (next.wrong) save.run.combo = 0;
    awardMedals();
  }
  if (action.type === 'item' || ended(next)) bagOpen = false;
  persist(); render(false, true, before);
  battleFx(before, next, root);
}

function continueBattle() {
  const state = save.run?.battle;
  if (!state || !ended(state)) return;
  if (state.phase === 'lost') {
    save.hero = faint(save.hero);
    summarize();
    save.run = null;
    wasFaint = true;
    navigate('inn');
    return;
  }
  if (save.hero.points > 0) { levelReturn = 'battle'; navigate('levelup'); return; }
  const turn = state.event.floor / BOSS_EVERY;
  if (state.phase === 'won' && state.event.boss && getChapter(state.event.chapter ?? 1).endless && turn <= 3 && !save.cleared.includes(turn)) {
    // 합친 던전의 1~3번째 보스를 처음 잡았을 때: 클리어 기록·보상·이야기 뒤 계속 내려갑니다.
    save.cleared.push(turn);
    storyReward = null;
    const id = turn === 2 ? 'compass' : turn === 3 ? 'badge' : null;
    if (id) {
      save.hero = { ...save.hero, gear: { ...save.hero.gear, [GEAR[id].slot]: id } };
      storyReward = `${GEAR[id].name}을 받았습니다`;
    }
    save.run.step++; save.run.battle = null; battleView = null;
    floorDone();
    storyId = turn === 1 ? 'boss_clear' : `ch${turn}_clear`;
    navigate('story'); return;
  }
  if (state.phase === 'won' && state.event.boss && !getChapter(state.event.chapter ?? 1).endless) {
    const chapter = state.event.chapter ?? 1;
    storyReward = state.ui?.chapterReward ?? null;
    if (!save.cleared.includes(chapter)) {
      save.cleared.push(chapter);
      const id = chapter === 2 ? 'compass' : chapter === 3 ? 'badge' : null;
      if (id) {
        const item = GEAR[id];
        save.hero = { ...save.hero, gear: { ...save.hero.gear, [item.slot]: id } };
        state.hero = save.hero;
        storyReward = `${item.name}을 받았습니다`;
        state.ui = { ...state.ui, chapterReward: storyReward };
      }
      awardMedals();
    }
    storyId = chapter === 1 ? 'boss_clear' : `ch${chapter}_clear`;
    navigate('story'); return;
  }
  if (state.phase === 'fled' && state.event.boss) { returnTown(); return; }
  save.run.step++;
  save.run.battle = null;
  battleView = null;
  if (state.phase === 'won' && state.event.elite) {
    // 정예를 이기면 층 도중에 유물을 하나 고릅니다.
    const offered = forceOffer(save.run, rng());
    if (offered !== save.run) { save.run = offered; notice = [notice, '👑 정예 격파! 유물을 하나 고르세요.'].filter(Boolean).join(' '); }
  }
  floorDone();
  navigate('dungeon');
}

function finishStory() {
  markSeen(storyId);
  if (/^ch[234]_intro$/.test(storyId)) {
    save.best.floor = Math.max(save.best.floor, save.run.floor);
    navigate('dungeon'); return;
  }
  if (storyId === 'boss_clear' || /^ch[23]_clear$/.test(storyId)) {
    if (storyId === 'boss_clear') markSeen('chapter2_teaser');
    storyReward = null; battleView = null;
    if (save.run && !save.run.battle && getChapter(save.run.chapter ?? 1).endless) { navigate('dungeon'); return; }
    save.run = null;
  }
  navigate('town');
}

function render(focus = true, animate = false, previous = null) {
  disposeScreen?.();
  disposeScreen = null;
  const hero = save.hero;
  const soundButton = button(isSoundEnabled() ? '🔊' : '🔇', () => {
    toggleSound();
    soundButton.textContent = isSoundEnabled() ? '🔊' : '🔇';
    soundButton.setAttribute('aria-label', isSoundEnabled() ? '소리 끄기' : '소리 켜기');
    soundButton.setAttribute('aria-pressed', String(isSoundEnabled()));
  }, { className: 'sound-toggle', 'aria-label': isSoundEnabled() ? '소리 끄기' : '소리 켜기', 'aria-pressed': isSoundEnabled() });
  hud.replaceChildren(h('div', { className: 'hero-summary' }, h('strong', {}, `Lv${hero.lv}`), h('span', {}, `${hero.gold}G`)),
    hpBar(hero.hp, hero.maxHp, '내 HP', previous?.hero.hp, previous?.hero.maxHp),
    h('div', { className: 'xp-track', role: 'progressbar', 'aria-label': '경험치', 'aria-valuemin': 0, 'aria-valuemax': xpNeeded(hero.lv), 'aria-valuenow': hero.exp,
      title: `경험치 ${hero.exp} / ${xpNeeded(hero.lv)}` },
    h('div', { className: 'xp-fill', style: `transform:scaleX(${Math.min(1, hero.exp / xpNeeded(hero.lv))})` })), soundButton);
  const chapterLabel = document.querySelector('.brand span:last-child');
  const currentChapter = getChapter(save.run?.chapter ?? TOWER.id);
  const site = currentChapter.endless ? save.run?.events[0]?.site ?? 1 : currentChapter.id;
  if (chapterLabel) chapterLabel.textContent = !save.run ? TOWER.name : currentChapter.endless ? `${save.run.floor}층 · ${getChapter(site).name}` : `${currentChapter.id}장 · ${currentChapter.name}`;
  const common = { hero, save, story: narrative, articles, message, onTown: () => navigate('town') };
  let screen;
  if (page === 'town') {
    const today = questFor(todayKey()), daily = dailyState(save.daily, todayKey()), target = huntTarget();
    screen = town({ ...common, onEnter: enterDungeon, onPage: navigate,
      extra: !daily.done && !questShown ? `📋 오늘의 의뢰: ${today.text} (${daily.progress}/${today.goal}) · 보상 ${Math.round(today.gold * streakBonus(daily.streak))}G${daily.streak ? ` · ${daily.streak}일 연속 중` : ''}` : null,
      extra2: target && !questShown ? `🎯 오늘의 현상수배: ${wantedLabel()} 몬스터 · ${WANTED_GOLD}G` : null });
    questShown = true;
  }
  if (page === 'dungeon' && save.run) {
    const area = getChapter(save.run.chapter ?? 1);
    const floors = site === 1 ? narrative.floors : narrative.chapters[site].floors;
    const floorBase = floors[(save.run.floor - 1) % floors.length];
    screen = dungeon({ ...common, story: { ...narrative, floors }, run: save.run, onEvent: openEvent, onTown: returnTown, onQuiz: answerQuiz,
      endless: !!area.endless,
      floorInfo: area.endless ? { ...floorBase, name: `${save.run.floor}층 · ${floorBase.name.replace(/^\d+층 · /, '')}` } : floorBase,
      onRelic: id => { save.run = chooseRelic(save.run, id); sfx('coin'); persist(); render(false); },
      onBoon: id => {
        const picked = applyBoon(save.run, save.hero, id, rng());
        if (picked.run === save.run) return;
        save.run = picked.run; save.hero = picked.hero;
        message = `${BOONS[id].name}: ${BOONS[id].desc}`; sfx(id === 'breakfast' ? 'heal' : 'coin'); persist(); render(false);
      },
      onFloorSeen: () => { save.run.uiSeenFloors = [...new Set([...(Array.isArray(save.run.uiSeenFloors) ? save.run.uiSeenFloors : []), save.run.floor])]; persist(); },
      onSide: answerSide,
      onNext: (index = 0) => {
        if ((save.run.relics ?? []).includes('battery')) save.hero = heal(save.hero, 10);
        save.run = nextFloor(save.run, cards, rng(), Number.isInteger(index) ? index : 0, huntTarget());
        save.best.floor = Math.max(save.best.floor, save.run.floor);
        navigate('dungeon');
      } });
    screen.querySelector('header').querySelector('p').textContent = area.endless ? getChapter(site).name : `${area.id}장 · ${area.name}`;
  }
  if (page === 'battle' && save.run?.battle) {
    const state = save.run.battle;
    if (!state.ui || typeof state.ui !== 'object' || Array.isArray(state.ui)) state.ui = {};
    if (!battleView) {
      battleView = { monster: monsterContent(monsters, state.event) };
      if (state.event.affix) {
        const affix = AFFIXES[state.event.affix];
        battleView.monster.name = `${affix.label} ${battleView.monster.name}`;
        battleView.monster.appear = `[${affix.label}] ${affix.desc}! ${battleView.monster.appear}`;
      }
      if (save.wanted && !save.wanted.done && save.wanted.cardId === state.event.cardId) battleView.monster.appear = `[🎯 현상수배] 이기면 ${WANTED_GOLD}G! ${battleView.monster.appear}`;
      if (state.event.elite) {
        battleView.monster.name = `정예 ${battleView.monster.name}`;
        battleView.monster.appear = `[정예] 공격이 거세지만 보상 2배, 이기면 유물! ${battleView.monster.appear}`;
      }
    }
    screen = battle({ state, monster: battleView.monster, bagOpen, articles, animate, previous, entering: focus && !animate, tutorial: !save.tutorialDone,
      presentation: state.ui, pending: Array.isArray(state.ui.messages) ? state.ui.messages : [],
      onPresented: kind => {
        if (kind === 'pending') state.ui.messages = [];
        else state.ui[kind] = true;
        if (kind === 'introDone') save.tutorialDone = true;
        persist();
      },
      onBag: () => { bagOpen = !bagOpen; render(false); }, onAction: act, onContinue: continueBattle, onArticle: showArticle,
      onExplain: () => showArticle(state.event.instance.article,
        [state.event.instance.why, state.event.instance.violation?.clauseNote, state.event.instance.violation?.rebuttal?.explain]
          .filter(Boolean).join('\n\n') || '이 전투에는 별도 해설이 없습니다.') });
  }
  if (page === 'levelup') screen = levelup({ hero, onAllocate: stat => {
    save.hero = allocatePoint(save.hero, stat);
    if (save.run?.battle) save.run.battle.hero = save.hero;
    persist(); render(false);
  }, onDone: () => { if (!save.hero.points) navigate(canChooseJob(save.hero) ? 'job' : levelReturn); } });
  if (page === 'job') screen = jobScreen({ onChoose: id => {
    save.hero = chooseJob(save.hero, id);
    if (save.run?.battle) save.run.battle.hero = save.hero;
    navigate(levelReturn);
  } });
  if (page === 'shop') screen = shop({ ...common, onBuy: id => {
    const result = buy(save.hero, id, save.cleared); save.hero = result.hero; message = result.message; persist(); render(false);
    if (result.ok) sfx('coin');
  } });
  if (page === 'inn') screen = inn({ ...common, wasFaint, onStay: () => {
    const beforeHp = save.hero.hp;
    const result = stay(save.hero); save.hero = result.hero; message = result.message; persist(); render(false);
    if (save.hero.hp > beforeHp) sfx('heal');
  } });
  if (page === 'senior') screen = senior({ ...common, seen: save.story.seen, onRead: id => { markSeen(id); persist(); render(false); },
    onPrologue: () => { storyId = 'prologue'; navigate('story'); } });
  if (page === 'skillbook') screen = skillbook({ ...common, skills: save.skills, onArticle: showArticle });
  if (page === 'status') screen = statusScreen({ ...common, best: save.best, total: cards.length,
    quest: { ...questFor(todayKey()), ...dailyState(save.daily, todayKey()) },
    onLevel: () => { levelReturn = 'status'; navigate('levelup'); }, onDex: () => navigate('dex'),
    onJob: () => { levelReturn = 'status'; navigate('job'); }, onUse: id => {
      if (!CONSUMABLES[id]?.hp || save.hero.hp === save.hero.maxHp) return;
      const next = consume(save.hero, id);
      if (next === save.hero) return;
      save.hero = next; message = `${CONSUMABLES[id].name}를 사용하셨습니다.`; persist(); render(false); sfx('heal');
    } });
  if (page === 'dex') screen = dexScreen({ cards, seen: save.dex, wanted: huntTarget(), onArticle: showArticle, onBack: () => navigate('status'),
    lookup: card => monsterContent(monsters, { cardId: card.id, chapter: TOWER.id, floor: 1 }) });
  if (page === 'story') {
    const chapter = /^ch([234])_/.exec(storyId)?.[1];
    const clear = storyId === 'boss_clear' || /^ch[23]_clear$/.test(storyId);
    const merged = clear && !!save.run && !!getChapter(save.run.chapter ?? 1).endless;
    screen = storyScreen({ title: merged ? `${['첫', '두', '세'][Number(chapter ?? 1) - 1]} 번째 우두머리 격파!` : clear ? `${chapter === '3' ? 'DLC · ' : ''}${chapter ?? 1}장 클리어!` :
      chapter ? narrative.chapters[chapter].title : '신입 감독관의 첫날',
      lines: narrative[storyId], reward: storyReward,
      teaser: clear ? chapter ? narrative.chapters[chapter].teaser : narrative.chapter2_teaser : null,
      teaserTitle: merged ? '더 깊은 곳으로' : chapter === '3' ? '엔딩 뒷이야기' : `${chapter ? 3 : 2}장 예고`,
      doneLabel: merged || chapter && !clear ? '던전으로' : '지청으로', onDone: finishStory });
  }
  if (screen && !['battle', 'town', 'dungeon'].includes(page)) screen = fitScreen(screen);
  disposeScreen = screen?.dispose;
  const scene = page === 'story' ? storyId === 'boss_clear' || /^ch[23]_clear$/.test(storyId) ? 'victory' : 'story' :
    page === 'inn' && wasFaint || page === 'battle' && save.run?.battle?.phase === 'lost' ? 'faint' :
    ['battle', 'dungeon'].includes(page) && save.run ?
      page === 'battle' && save.run.battle?.event.boss ? 'boss' : `floor-${(save.run.floor - 1) % 6 + 1}` : 'town';
  root.replaceChildren(sceneScreen(screen ?? h('p', {}, '마을로 이동해 주세요.'), scene,
    ['battle', 'dungeon'].includes(page) && save.run ? site : 1));
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
  root.replaceChildren(sceneScreen(h('p', { role: 'status' }, '모험을 준비하고 있습니다…'), 'story'));
  try {
    const loaded = await Promise.all([loadJSON('data/cards.json'), loadJSON('data/articles.json'), loadJSON('data/monsters.json', true), loadJSON('data/story.json', true)]);
    if (!Array.isArray(loaded[0]) || !rpgCards(loaded[0]).length) throw new Error('카드 자료를 확인해 주세요.');
    cards = rpgCards(loaded[0]);
    articles = loaded[1] && typeof loaded[1] === 'object' ? loaded[1] : {};
    monsters = loaded[2]; narrative = storyContent(loaded[3]);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      save = parseSave(stored);
      // parseSave owns game validation; this optional UI flag stays outside core.
      try { save.tutorialDone = JSON.parse(stored)?.tutorialDone === true; }
      catch { save.tutorialDone = false; }
    }
    catch { storageFailed = true; announce('저장소에 접근할 수 없습니다. 현재 창에서 진행해 주세요.'); }
    if (save.hero.hp === 0 && !save.run?.battle) { save.hero = faint(save.hero); wasFaint = true; }
    // 도입 이야기는 예전 방식(2·3장)으로 진행 중이던 탐험에만 남아 있습니다.
    const pendingIntro = [2, 3].includes(save.run?.chapter) && !save.story.seen.includes(`ch${save.run.chapter}_intro`);
    if (pendingIntro) storyId = `ch${save.run.chapter}_intro`;
    page = !save.story.seen.includes('prologue') || pendingIntro ? 'story' : save.run?.battle ? 'battle' : save.run ? 'dungeon' : wasFaint ? 'inn' : 'town';
    persist(); render(); offlineSetup();
  } catch {
    root.replaceChildren(sceneScreen(panel(h('h1', {}, '모험 자료를 불러오지 못했습니다'), h('p', {}, '카드 자료와 연결 상태를 확인하신 뒤 다시 시도해 주세요.'), button('재시도', boot, { className: 'primary full' })), 'story'));
  }
}

window.addEventListener('offline', () => { if (!storageFailed) announce('오프라인으로 이용하고 계십니다. 저장된 자료로 계속 진행해 주세요.'); });
window.addEventListener('online', () => { if (!storageFailed) announce('다시 연결되었습니다.'); });
boot();
