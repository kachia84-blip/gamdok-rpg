import { instantiate, supports, satisfies } from './cardgen.js';
import { pick, shuffle } from './rng.js';

export const rpgCards = cards => cards.filter(card => ['fall', 'ppe'].includes(card.field));

export function encounter(card, floor, rng, { revived, boss = false, cards = [] } = {}) {
  let wantViolation = boss || !!revived || rng() < 0.75;
  let source = card;
  if (revived && card.kind === 'num' && Number.isFinite(revived.v) &&
      [...card.param.bad, ...card.param.ok].includes(revived.v)) {
    wantViolation = !satisfies(card.rule, revived.v);
    source = { ...card, param: { ...card.param, [wantViolation ? 'bad' : 'ok']: [revived.v] } };
  }
  const allowEdge = floor >= 3 || !!revived;
  if (!supports(source, wantViolation, allowEdge)) wantViolation = !wantViolation;
  const instance = instantiate(source, '추락의 고층 빌딩', rng, { wantViolation, allowEdge });
  const same = [...new Set(cards.filter(c => c.field === card.field).map(c => c.article))].filter(a => a !== card.article);
  // 보호구 분야는 조문이 2개뿐이므로 나머지는 같은 장의 추락 분야에서 채웁니다.
  const nearby = [...new Set(cards.map(c => c.article))].filter(a => a !== card.article && !same.includes(a));
  const choices = shuffle(rng, [card.article, ...shuffle(rng, same).concat(shuffle(rng, nearby)).slice(0, 3)]);
  const hp = (24 + floor * 7) * (boss ? 2 : 1);
  return { type: 'battle', cardId: card.id, v: instance.v, field: card.field, instance,
    choices, floor, boss, revived: !!revived, lv: floor + (boss ? 2 : 0),
    maxHp: hp, attack: 4 + floor * 2 + (boss ? 3 : 0) };
}

export function generateFloor(cards, floor, rng, revived = []) {
  const pool = rpgCards(cards);
  if (!pool.length) throw new Error('전투 카드가 없습니다.');
  const at = Math.max(1, Math.min(6, Math.floor(floor)));
  const returning = at === 1 ? shuffle(rng, revived.filter(r => pool.some(c => c.id === r.cardId))).slice(0, 2) : [];
  const fights = [0, 1].map(index => {
    const memory = returning[index];
    const card = memory ? pool.find(c => c.id === memory.cardId) : pick(rng, pool);
    return encounter(card, at, rng, { revived: memory, boss: at === 6 && index === 1, cards: pool });
  });
  const type = pick(rng, ['chest', 'rest', 'npc']);
  let extra = { type, gold: 8 + at * 4, hp: 8 + at * 3 };
  if (type === 'npc') {
    const card = pick(rng, pool);
    const sample = encounter(card, at, rng, { cards: pool });
    extra = { ...extra, text: sample.instance.text, article: card.article, choices: sample.choices, quote: card.quote };
  }
  return [fights[0], extra, fights[1]];
}

export function startDungeon(cards, rng, revived = []) {
  return { floor: 1, step: 0, events: generateFloor(cards, 1, rng, revived), battle: null };
}

export function nextFloor(run, cards, rng) {
  if (run.step < run.events.length || run.floor >= 6) return run;
  return { floor: run.floor + 1, step: 0, events: generateFloor(cards, run.floor + 1, rng), battle: null };
}

export function rememberWrong(revived, battle) {
  const { cardId, v } = battle.event;
  if (!battle.wrong) return revived;
  return revived.some(r => r.cardId === cardId && r.v === v) ? revived : [...revived, { cardId, v }];
}
