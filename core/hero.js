export const GEAR = {
  helmet: { name: '⛑️ 안전모', slot: 'head', defense: 1, price: 30 },
  hardhat: { name: '🪖 고급 안전모', slot: 'head', defense: 3, price: 120 },
  handbook: { name: '📕 산안법 해설서', slot: 'hand', law: 2, price: 50 },
  cases: { name: '📚 판례집', slot: 'hand', law: 5, price: 200 },
  flashlight: { name: '🔦 손전등', slot: 'tool', eye: 2, price: 40 },
  meter: { name: '🔭 측정기 세트', slot: 'tool', eye: 4, price: 150 },
};

export function createHero() {
  return { lv: 1, exp: 0, hp: 30, maxHp: 30, stats: { law: 3, eye: 3, talk: 3 },
    points: 0, gold: 20, gear: { head: null, hand: null, tool: null }, bag: {} };
}

export const xpNeeded = lv => Math.round(20 * lv ** 1.5);

export function effectiveStats(hero) {
  const stats = { ...hero.stats, defense: 0 };
  for (const [slot, id] of Object.entries(hero.gear)) {
    const item = GEAR[id];
    if (item?.slot !== slot) continue;
    for (const key of ['law', 'eye', 'talk', 'defense']) stats[key] += item[key] ?? 0;
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
