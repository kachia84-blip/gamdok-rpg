// 출발 선물: 탐험을 시작할 때 셋 중 하나를 고릅니다.
import { RELICS } from './relics.js';

export const BOONS = {
  breakfast: { name: '🍙 든든한 아침', desc: 'HP를 모두 회복' },
  allowance: { name: '💵 출장비', desc: '80G 받기' },
  gift: { name: '🎁 선배의 선물', desc: '무작위 유물 1개' },
  vow: { name: '🔥 고행의 맹세', desc: '유물 2개, 대신 받는 피해 1.3배' },
};
export const validBoons = list => list == null || Array.isArray(list) && list.length <= 3 && list.every(id => Object.hasOwn(BOONS, id));

function shuffled(rng, items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

export const offerBoons = rng => shuffled(rng, Object.keys(BOONS)).slice(0, 3);

// 고른 선물을 적용한 탐험과 주인공을 돌려줍니다. 내민 적 없는 선물이면 그대로 돌려줍니다.
export function applyBoon(run, hero, id, rng) {
  if (!run.boonOffer?.includes(id)) return { run, hero };
  const owned = run.relics ?? [];
  const pool = shuffled(rng, Object.keys(RELICS).filter(key => !RELICS[key].curse && !owned.includes(key)));
  const next = { ...run, boonOffer: null };
  if (id === 'breakfast') return { run: next, hero: { ...hero, hp: hero.maxHp } };
  if (id === 'allowance') return { run: next, hero: { ...hero, gold: hero.gold + 80 } };
  if (id === 'gift') return { run: { ...next, relics: [...owned, ...pool.slice(0, 1)] }, hero };
  return { run: { ...next, relics: [...owned, ...pool.slice(0, 2), 'vow'] }, hero };
}
