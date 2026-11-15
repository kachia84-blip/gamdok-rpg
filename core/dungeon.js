import { instantiate, supports, satisfies } from './cardgen.js';
import { pick, shuffle } from './rng.js';
import { CHAPTERS, chapterCards, getChapter } from './chapters.js';

export const rpgCards = cards => cards.filter(card => CHAPTERS.some(chapter => chapter.fields.includes(card.field)));

export function encounter(card, floor, rng, { revived, boss = false, cards = [], chapter = 1 } = {}) {
  const area = getChapter(chapter);
  const pool = chapterCards(cards, area.id);
  if (!area.fields.includes(card.field)) throw new Error('이 장의 전투 카드가 아닙니다.');
  let wantViolation = boss || !!revived || rng() < 0.75;
  let source = card;
  if (revived && card.kind === 'num' && Number.isFinite(revived.v) &&
      [...card.param.bad, ...card.param.ok].includes(revived.v)) {
    wantViolation = !satisfies(card.rule, revived.v);
    source = { ...card, param: { ...card.param, [wantViolation ? 'bad' : 'ok']: [revived.v] } };
  }
  const allowEdge = floor >= 3 || !!revived;
  if (!supports(source, wantViolation, allowEdge)) wantViolation = !wantViolation;
  const instance = instantiate(source, area.name, rng, { wantViolation, allowEdge });
  const same = [...new Set(pool.filter(c => c.field === card.field).map(c => c.article))].filter(a => a !== card.article);
  const nearby = [...new Set(pool.map(c => c.article))].filter(a => a !== card.article && !same.includes(a));
  const choices = shuffle(rng, [card.article, ...shuffle(rng, same).concat(shuffle(rng, nearby)).slice(0, 3)]);
  const effectiveFloor = floor + area.power;
  const hp = (24 + effectiveFloor * 7) * (boss ? 2 : 1);
  return { type: 'battle', cardId: card.id, v: instance.v, field: card.field, instance,
    choices, floor, chapter: area.id, power: area.power, boss, revived: !!revived, lv: effectiveFloor + (boss ? 2 : 0),
    maxHp: hp, attack: 4 + effectiveFloor * 2 + (boss ? 3 : 0) };
}

export function generateFloor(cards, floor, rng, revived = [], chapter = 1) {
  const area = getChapter(chapter);
  const pool = chapterCards(cards, area.id);
  if (!pool.length) throw new Error('전투 카드가 없습니다.');
  const at = Math.max(1, Math.min(6, Math.floor(floor)));
  const returning = at === 1 ? shuffle(rng, revived.filter(r => pool.some(c => c.id === r.cardId))).slice(0, 2) : [];
  const fights = [0, 1].map(index => {
    const memory = returning[index];
    const card = memory ? pool.find(c => c.id === memory.cardId) : pick(rng, pool);
    return encounter(card, at, rng, { revived: memory, boss: at === 6 && index === 1, cards: pool, chapter: area.id });
  });
  const type = pick(rng, ['chest', 'rest', 'npc']);
  let extra = { type, chapter: area.id, power: area.power, gold: 8 + at * 4, hp: 8 + at * 3 };
  if (type === 'npc') {
    const card = pick(rng, pool);
    const sample = encounter(card, at, rng, { cards: pool, chapter: area.id });
    extra = { ...extra, text: sample.instance.text, article: card.article, choices: sample.choices, quote: card.quote };
  }
  return [fights[0], extra, fights[1]];
}

export function startDungeon(cards, rng, revived = [], chapter = 1) {
  chapter = getChapter(chapter).id;
  return { chapter, floor: 1, step: 0, events: generateFloor(cards, 1, rng, revived, chapter), battle: null };
}

export function nextFloor(run, cards, rng) {
  if (run.step < run.events.length || run.floor >= 6) return run;
  const chapter = run.chapter ?? 1;
  return { chapter, floor: run.floor + 1, step: 0, events: generateFloor(cards, run.floor + 1, rng, [], chapter), battle: null };
}

export function rememberWrong(revived, battle) {
  const { cardId, v } = battle.event;
  if (!battle.wrong) return revived;
  return revived.some(r => r.cardId === cardId && r.v === v) ? revived : [...revived, { cardId, v }];
}
