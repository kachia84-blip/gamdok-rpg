export const POINTS = Object.freeze({ find: 20, cite: 20, law: 10, rebut: 30, falseMark: -15, missed: -10 });
export const RANKS = Object.freeze([
  { min: 0, name: '수습 감독관' }, { min: 300, name: '근로감독관' },
  { min: 800, name: '선임 감독관' }, { min: 1500, name: '감독팀장' },
  { min: 2500, name: '산재예방지도과장' },
].map(Object.freeze));

export function rankOf(xp) {
  const value = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const index = RANKS.findLastIndex(rank => value >= rank.min);
  const { name, min } = RANKS[index];
  const next = RANKS[index + 1]?.min ?? null;
  return { name, min, next, progress: next === null ? 1 : (value - min) / (next - min) };
}
