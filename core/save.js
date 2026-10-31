import { createHero, GEAR } from './hero.js';
import { CONSUMABLES } from './shop.js';

export const STORAGE_KEY = 'gamdok_rpg_v1';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (n, min = 0, max = 1e9) => Number.isInteger(n) && n >= min && n <= max;
const article = value => typeof value === 'string' && /^제\d+조$/.test(value);
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);

export function emptySave() {
  return { v: 4, hero: createHero(), skills: [], revived: [], best: { floor: 0 }, story: { seen: [] }, run: null };
}

function validHero(hero) {
  return record(hero) && integer(hero.lv, 1, 10000) && integer(hero.exp) && integer(hero.maxHp, 1) &&
    integer(hero.hp, 0, hero.maxHp) && integer(hero.points) && integer(hero.gold) &&
    record(hero.stats) && ['law', 'eye', 'talk'].every(k => integer(hero.stats[k], 0)) &&
    record(hero.gear) && ['head', 'hand', 'tool'].every(k => hero.gear[k] === null ||
      Object.hasOwn(GEAR, hero.gear[k]) && GEAR[hero.gear[k]].slot === k) &&
    record(hero.bag) && Object.entries(hero.bag).every(([k, v]) => Object.hasOwn(CONSUMABLES, k) && integer(v, 0, 10)) &&
    Object.values(hero.bag).reduce((a, b) => a + b, 0) <= 10;
}

function validRebuttal(r) {
  return record(r) && (r.type === 'num' && Number.isFinite(r.answer) ||
    r.type === 'pick' && Array.isArray(r.choices) && r.choices.every(c => typeof c === 'string') && integer(r.answer, 0, r.choices.length - 1));
}

function validEvent(event) {
  if (!record(event)) return false;
  if (event.type === 'battle') {
    const instance = event.instance;
    return id(event.cardId) && integer(event.floor, 1, 6) && integer(event.lv, 1, 20) &&
      integer(event.maxHp, 1) && integer(event.attack, 1) && record(instance) && article(instance.article) &&
      typeof instance.text === 'string' && ['ok', 'violation'].includes(instance.kind) &&
      (event.v === null || Number.isFinite(event.v)) &&
      Array.isArray(event.choices) && event.choices.length >= 1 && event.choices.length <= 4 &&
      event.choices.every(article) && event.choices.includes(instance.article) &&
      (instance.kind === 'ok' || record(instance.violation) && validRebuttal(instance.violation.rebuttal));
  }
  return ['chest', 'rest', 'npc'].includes(event.type) && integer(event.gold) && integer(event.hp) &&
    (event.type !== 'npc' || typeof event.text === 'string' && article(event.article) &&
      Array.isArray(event.choices) && event.choices.every(article) && event.choices.includes(event.article));
}

function validBattle(battle, event) {
  return record(battle) && validHero(battle.hero) && validEvent(battle.event) && battle.event.cardId === event?.cardId &&
    battle.event.v === event?.v && record(battle.monster) && integer(battle.monster.maxHp, 1) &&
    integer(battle.monster.hp, 0, battle.monster.maxHp) && integer(battle.monster.attack, 1) &&
    ['action', 'cite', 'rebut', 'won', 'lost', 'fled'].includes(battle.phase) &&
    (battle.phase !== 'rebut' || battle.event.instance.kind === 'violation') &&
    Array.isArray(battle.skills) && battle.skills.every(article) && Array.isArray(battle.hiddenChoices) &&
    battle.hiddenChoices.every(article) && integer(battle.attempts, 0, 2) &&
    Array.isArray(battle.log) && battle.log.every(line => typeof line === 'string') &&
    (battle.reward === null || record(battle.reward) && ['exp', 'gold', 'levels'].every(k => integer(battle.reward[k])));
}

function validRun(run) {
  return record(run) && integer(run.floor, 1, 6) && Array.isArray(run.events) && run.events.length === 3 &&
    run.events.every(validEvent) && integer(run.step, 0, run.events.length) &&
    (run.battle === null || run.step < run.events.length && validBattle(run.battle, run.events[run.step]));
}

export function parseSave(text) {
  try {
    const s = JSON.parse(text);
    if (!record(s)) return emptySave();
    if ([1, 2, 3].includes(s.v)) {
      const fresh = emptySave();
      fresh.hero.gold += Number.isFinite(s.xp) && s.xp >= 0 ? Math.floor(s.xp / 10) : 0;
      if (Array.isArray(s.codex)) fresh.skills = [...new Set(s.codex.filter(article))];
      return fresh;
    }
    if (s.v !== 4 || !validHero(s.hero)) return emptySave();
    const fresh = emptySave();
    fresh.hero = s.hero;
    fresh.skills = Array.isArray(s.skills) ? [...new Set(s.skills.filter(article))] : [];
    fresh.revived = Array.isArray(s.revived) ? s.revived.filter(r => record(r) && id(r.cardId) && (r.v === null || Number.isFinite(r.v))) : [];
    fresh.best.floor = integer(s.best?.floor, 0, 6) ? s.best.floor : 0;
    fresh.story.seen = Array.isArray(s.story?.seen) ? [...new Set(s.story.seen.filter(id))] : [];
    fresh.run = validRun(s.run) ? s.run : null;
    if (fresh.run?.battle) { fresh.hero = fresh.run.battle.hero; fresh.skills = fresh.run.battle.skills; }
    return fresh;
  } catch { return emptySave(); }
}
