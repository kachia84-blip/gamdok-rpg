// Seeded mulberry32. Each random stream is owned by its caller.
export function makeRng(seed) {
  let state = typeof seed === 'number' ? seed >>> 0 : 2166136261;
  if (typeof seed !== 'number') for (const char of String(seed)) state = Math.imul(state ^ char.codePointAt(0), 16777619) >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let n = Math.imul(state ^ state >>> 15, 1 | state);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) {
  if (!arr.length) throw new Error('선택할 자료가 없습니다.');
  return arr[Math.floor(rng() * arr.length)];
}

export function shuffle(rng, arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
