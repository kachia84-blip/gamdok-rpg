import { GEAR, heal } from './hero.js';

export const CONSUMABLES = {
  coffee: { name: '☕ 믹스커피', price: 10, hp: 15 },
  tonic: { name: '🥤 박카스', price: 30, hp: 40 },
  tape: { name: '📏 줄자', price: 25 },
  notebook: { name: '📖 법전 수첩', price: 35 },
};
export const GOODS = { ...GEAR, ...CONSUMABLES };
export const bagCount = hero => Object.values(hero.bag).reduce((sum, count) => sum + count, 0);

export function grantItem(hero, id) {
  if (!Object.hasOwn(CONSUMABLES, id) || bagCount(hero) >= 10) return hero;
  return { ...hero, bag: { ...hero.bag, [id]: (hero.bag[id] ?? 0) + 1 } };
}

export function buy(hero, id) {
  const item = Object.hasOwn(GOODS, id) ? GOODS[id] : null;
  if (!item) return { hero, ok: false, message: '상품을 확인해 주세요.' };
  if (hero.gold < item.price) return { hero, ok: false, message: '골드가 부족합니다.' };
  if (item.slot && hero.gear[item.slot] === id) return { hero, ok: false, message: '이미 장착하고 계십니다.' };
  if (!item.slot && bagCount(hero) >= 10) return { hero, ok: false, message: '가방이 가득 찼습니다.' };
  const paid = { ...hero, gold: hero.gold - item.price };
  return { hero: item.slot ? { ...paid, gear: { ...paid.gear, [item.slot]: id } } : grantItem(paid, id),
    ok: true, message: item.slot ? `${item.name} 장착을 마쳤습니다.` : `${item.name} 구입을 마쳤습니다.` };
}

export function consume(hero, id) {
  if (!Object.hasOwn(CONSUMABLES, id) || !(hero.bag[id] > 0)) return hero;
  const next = { ...hero, bag: { ...hero.bag, [id]: hero.bag[id] - 1 } };
  return CONSUMABLES[id].hp ? heal(next, CONSUMABLES[id].hp) : next;
}

export const INN_PRICE = 10;
export function stay(hero) {
  if (hero.hp >= hero.maxHp) return { hero, ok: false, message: '이미 충분히 쉬셨습니다.' };
  if (hero.gold < INN_PRICE) return { hero, ok: false, message: '골드가 부족합니다.' };
  return { hero: { ...hero, gold: hero.gold - INN_PRICE, hp: hero.maxHp }, ok: true, message: '푹 쉬셨습니다. HP를 모두 회복했습니다.' };
}
