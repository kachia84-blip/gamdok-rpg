import { instantiate, supports, satisfies } from './cardgen.js';
import { pick, shuffle } from './rng.js';
import { AREAS, BOSS_EVERY, CHAPTERS, chapterCards, getChapter } from './chapters.js';

export const AFFIXES = {
  fierce: { label: '사나운', desc: '공격이 거세지만 경험치 1.5배' },
  golden: { label: '황금', desc: '골드 3배' },
  stubborn: { label: '끈질긴', desc: '반박 기회가 한 번뿐' },
  swift: { label: '재빠른', desc: '도망칠 수 없지만 경험치 1.3배' },
  thief: { label: '손버릇 나쁜', desc: '반격마다 20G를 훔치지만 골드 2배' },
};
// 갈림길에서 고르는 층의 성격.
export const MODS = {
  normal: { label: '평범한 층' },
  danger: { label: '위험 구역(보상 1.5배)' },
  calm: { label: '한적한 층(쉼터·상자)' },
};
export const MAX_FLOOR = 999;
export const rpgCards = cards => cards.filter(card => AREAS.some(chapter => chapter.fields.includes(card.field)));

export function encounter(card, floor, rng, { revived, boss = false, cards = [], chapter = 1, site, danger = false, elite = false } = {}) {
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
  const instance = instantiate(source, area.endless ? getChapter(site ?? 1).name : area.name, rng, { wantViolation, allowEdge });
  const same = [...new Set(pool.filter(c => c.field === card.field).map(c => c.article))].filter(a => a !== card.article);
  const nearby = [...new Set(pool.map(c => c.article))].filter(a => a !== card.article && !same.includes(a));
  const choices = shuffle(rng, [card.article, ...shuffle(rng, same).concat(shuffle(rng, nearby)).slice(0, 3)]);
  const effectiveFloor = floor + area.power;
  const hp = (24 + effectiveFloor * 7) * (boss ? 2 : 1);
  // 수식어는 환영 여부와 상관없이 붙어 정답을 누설하지 않습니다.
  const affix = !boss && !elite && !revived && floor >= 2 && rng() < (danger ? 0.6 : 0.2) ? pick(rng, Object.keys(AFFIXES)) : null;
  return { type: 'battle', cardId: card.id, v: instance.v, field: card.field, instance,
    choices, floor, chapter: area.id, power: area.power, boss, revived: !!revived, lv: effectiveFloor + (boss ? 2 : elite ? 1 : 0),
    maxHp: hp, attack: Math.round((4 + effectiveFloor * 2 + (boss ? 3 : 0)) * (affix === 'fierce' ? 1.4 : elite ? 1.3 : 1)),
    ...(affix ? { affix } : {}), ...(area.endless ? { site: site ?? 1 } : {}), ...(danger && !boss ? { danger: true } : {}), ...(elite ? { elite: true } : {}) };
}

export function generateFloor(cards, floor, rng, revived = [], chapter = 1, site, mod = 'normal') {
  const area = getChapter(chapter);
  const pool = chapterCards(cards, area.id);
  if (!pool.length) throw new Error('전투 카드가 없습니다.');
  const at = Math.max(1, Math.min(area.endless ? MAX_FLOOR : 6, Math.floor(floor)));
  // 합친 던전은 층마다 현장이 무작위입니다. 1~3번째 보스 층은 그 보스의 현장으로 고정합니다.
  const turn = at / BOSS_EVERY;
  if (area.endless) site ??= Number.isInteger(turn) && turn <= CHAPTERS.length ? turn : 1 + Math.floor(rng() * CHAPTERS.length);
  const returning = at === 1 || area.endless ? shuffle(rng, revived.filter(r => pool.some(c => c.id === r.cardId))).slice(0, 2) : [];
  const bossFloor = area.endless ? at % BOSS_EVERY === 0 : at === 6;
  if (!area.endless || bossFloor || !Object.hasOwn(MODS, mod)) mod = 'normal';
  // 정예: 합친 던전의 3·9·15…층 첫 전투. 공격이 거세고, 이기면 보상 2배와 유물을 줍니다.
  const eliteFloor = !!area.endless && at % BOSS_EVERY === 3;
  const fights = [0, 1].map(index => {
    const memory = returning[index];
    const card = memory ? pool.find(c => c.id === memory.cardId) : pick(rng, pool);
    return encounter(card, at, rng, { revived: memory, boss: bossFloor && index === 1, cards: pool, chapter: area.id, site, danger: mod === 'danger',
      elite: eliteFloor && index === 0 && !memory });
  });
  const side = type => {
    let extra = { type, chapter: area.id, power: area.power, gold: 8 + at * 4, hp: 8 + at * 3, ...(area.endless ? { site } : {}) };
    if (type === 'npc') {
      const card = pick(rng, pool);
      const sample = encounter(card, at, rng, { cards: pool, chapter: area.id, site });
      extra = { ...extra, text: sample.instance.text, article: card.article, choices: sample.choices, quote: card.quote };
    }
    return extra;
  };
  // 한적한 층: 전투는 한 번뿐이고 쉼터와 상자가 나옵니다.
  if (mod === 'calm') return [side('rest'), fights[0], side('chest')];
  // 합친 던전에는 제단과 동전 던지기가 더 나옵니다.
  return [fights[0], side(pick(rng, area.endless ? ['chest', 'rest', 'npc', 'altar', 'gamble', 'merchant'] : ['chest', 'rest', 'npc'])), fights[1]];
}

export function startDungeon(cards, rng, revived = [], chapter = 1, startFloor = 1) {
  const area = getChapter(chapter);
  chapter = area.id;
  const floor = area.endless ? Math.max(1, Math.min(MAX_FLOOR, Math.floor(startFloor) || 1)) : 1;
  return { chapter, floor, step: 0, events: generateFloor(cards, floor, rng, revived, chapter), battle: null,
    relics: [], relicOffer: null, combo: 0, paths: null, wins: 0 };
}

// 층을 다 돌면 다음 층 두 갈래를 내밉니다. 다음이 보스 층이면 갈림길이 없습니다.
export function offerPaths(run, rng) {
  if (!getChapter(run.chapter ?? 1).endless || run.step < run.events.length || run.paths?.length ||
      (run.floor + 1) % BOSS_EVERY === 0 || run.floor >= MAX_FLOOR) return run;
  const site = () => 1 + Math.floor(rng() * CHAPTERS.length);
  return { ...run, paths: [{ site: site(), mod: 'normal' }, { site: site(), mod: rng() < 0.5 ? 'danger' : 'calm' }] };
}

export function nextFloor(run, cards, rng, pathIndex = 0) {
  const chapter = run.chapter ?? 1;
  if (run.step < run.events.length || run.floor >= (getChapter(chapter).endless ? MAX_FLOOR : 6)) return run;
  const path = run.paths?.[pathIndex] ?? run.paths?.[0];
  return { chapter, floor: run.floor + 1, step: 0, events: generateFloor(cards, run.floor + 1, rng, [], chapter, path?.site, path?.mod), battle: null, paths: null,
    relics: run.relics ?? [], relicOffer: null, ...(run.relicFloor ? { relicFloor: run.relicFloor } : {}), combo: run.combo ?? 0, wins: run.wins ?? 0 };
}

export function rememberWrong(revived, battle) {
  const { cardId, v } = battle.event;
  if (!battle.wrong) return revived;
  return revived.some(r => r.cardId === cardId && r.v === v) ? revived : [...revived, { cardId, v }];
}
