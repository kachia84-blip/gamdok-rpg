export const GEAR = {
  helmet: { name: '⛑️ 안전모', slot: 'head', defense: 1, price: 30, tier: 1 },
  hardhat: { name: '🪖 고급 안전모', slot: 'head', defense: 3, price: 120, tier: 1 },
  handbook: { name: '📕 산안법 해설서', slot: 'hand', law: 2, price: 50, tier: 1 },
  cases: { name: '📚 판례집', slot: 'hand', law: 5, price: 200, tier: 1 },
  flashlight: { name: '🔦 손전등', slot: 'tool', eye: 2, price: 40, tier: 1 },
  meter: { name: '🔭 측정기 세트', slot: 'tool', eye: 4, price: 150, tier: 1 },
  airmask: { name: '😷 송기마스크', slot: 'head', defense: 5, price: 300, tier: 2 },
  guidebook: { name: '📘 고시·해석 모음', slot: 'hand', law: 8, price: 350, tier: 2 },
  gasdetector: { name: '📟 가스농도 측정기', slot: 'tool', eye: 7, price: 320, tier: 2 },
  insulated: { name: '🧤 절연 보호구 세트', slot: 'head', defense: 8, price: 600, tier: 3 },
  rulings: { name: '⚖️ 대법원 판결집', slot: 'hand', law: 12, price: 700, tier: 3 },
  thermal: { name: '📸 열화상 카메라', slot: 'tool', eye: 11, price: 650, tier: 3 },
  goggles: { name: '🥽 스마트 보안경', slot: 'head', defense: 12, price: 1300, tier: 4 },
  casebook: { name: '🗂️ 중대재해 사례집', slot: 'hand', law: 17, price: 1500, tier: 4 },
  drone: { name: '🛰️ 점검 드론', slot: 'tool', eye: 15, price: 1400, tier: 4 },
  compass: { name: '🧭 선배의 나침반', slot: 'tool', eye: 9, talk: 3, price: 0, tier: 2, rare: true },
  pen: { name: '🖋️ 전설의 만년필', slot: 'hand', law: 18, eye: 4, talk: 6, price: 0, tier: 4, rare: true },
  badge: { name: '🏅 명예 감독관 배지', slot: 'head', defense: 7, law: 4, talk: 4, price: 0, tier: 3, rare: true },
};

import { RELICS } from './relics.js';

export function createHero() {
  return { lv: 1, exp: 0, hp: 30, maxHp: 30, stats: { law: 3, eye: 3, talk: 3 },
    points: 0, gold: 20, gear: { head: null, hand: null, tool: null }, bag: {}, job: null };
}

export const xpNeeded = lv => Math.round(20 * lv ** 1.5);

export function effectiveStats(hero, relics = []) {
  const stats = { ...hero.stats, defense: 0 };
  for (const [slot, id] of Object.entries(hero.gear)) {
    const item = GEAR[id];
    if (item?.slot !== slot) continue;
    for (const key of ['law', 'eye', 'talk', 'defense']) stats[key] += item[key] ?? 0;
  }
  for (const id of relics) {
    for (const key of ['law', 'eye', 'talk', 'defense']) stats[key] += RELICS[id]?.[key] ?? 0;
  }
  return stats;
}

export function gainExp(hero, amount) {
  let next = { ...hero, exp: hero.exp + Math.max(0, Math.floor(amount)) };
  let levels = 0;
  while (next.exp >= xpNeeded(next.lv)) {
    next = { ...next, exp: next.exp - xpNeeded(next.lv), lv: next.lv + 1,
      maxHp: next.maxHp + 5, hp: Math.min(next.hp + 5, next.maxHp + 5), points: next.points + 3 };
    levels++;
  }
  return { hero: next, levels };
}

export function allocatePoint(hero, stat) {
  if (!['law', 'eye', 'talk'].includes(stat) || hero.points < 1) return hero;
  return { ...hero, points: hero.points - 1, stats: { ...hero.stats, [stat]: hero.stats[stat] + 1 } };
}

export function heal(hero, amount) {
  return { ...hero, hp: Math.min(hero.maxHp, hero.hp + Math.max(0, amount)) };
}

export function faint(hero) {
  return { ...hero, hp: hero.maxHp, gold: Math.floor(hero.gold / 2) };
}
