import { pick, shuffle } from './rng.js';
import { instantiate, supports } from './cardgen.js';
import { fieldOf } from './fields.js';

export function dayCounts(day, rng) {
  if (day === 1) return { violations: pick(rng, [2, 3]), ok: 2, plain: 2 };
  return [{}, {}, { violations: 3, ok: 2, plain: 2 }, { violations: 3, ok: 3, plain: 3 },
    { violations: 4, ok: 3, plain: 3 }, { violations: 5, ok: 4, plain: 3 }][day];
}

export function citeChoices(card, cards, articles, rng) {
  const numbers = Object.keys(articles);
  if (!Object.hasOwn(articles, card.article) || numbers.length < 4) throw new Error('조문 보기는 원문 4개 이상이 필요합니다.');
  const field = no => cards.find(c => c.article === no)?.field ?? fieldOf(no);
  const same = shuffle(rng, numbers.filter(no => no !== card.article && field(no) === card.field));
  const other = shuffle(rng, numbers.filter(no => no !== card.article && field(no) !== card.field));
  const selected = [card.article];
  if (same.length) selected.push(same.shift());
  if (other.length) selected.push(other.shift());
  selected.push(...shuffle(rng, [...same, ...other]).slice(0, 4 - selected.length));
  return shuffle(rng, selected);
}

export function makeSite(day, rng, cards, places, articles, { previousPlace = null } = {}) {
  if (!Number.isInteger(day) || day < 1 || day > 5) throw new Error('점검일은 1~5일입니다.');
  const counts = dayCounts(day, rng);
  const allowEdge = day >= 3;
  const poolFor = place => cards.filter(card => card.places.includes(place.id));
  // Cards supporting both outcomes are assigned last, so scarce outcomes stay available.
  const eligible = place => {
    const pool = poolFor(place);
    return pool.filter(c => supports(c, true, allowEdge)).length >= counts.violations &&
      pool.filter(c => supports(c, false, allowEdge)).length >= counts.ok &&
      pool.filter(c => supports(c, true, allowEdge) || supports(c, false, allowEdge)).length >= counts.violations + counts.ok;
  };
  const candidates = places.filter(place => place.id !== previousPlace && eligible(place));
  const place = pick(rng, candidates);
  const pool = shuffle(rng, poolFor(place));
  const onlyBad = pool.filter(c => supports(c, true, allowEdge) && !supports(c, false, allowEdge));
  const onlyOk = pool.filter(c => supports(c, false, allowEdge) && !supports(c, true, allowEdge));
  const both = pool.filter(c => supports(c, true, allowEdge) && supports(c, false, allowEdge));
  const bad = onlyBad.slice(0, counts.violations);
  bad.push(...both.splice(0, counts.violations - bad.length));
  const ok = onlyOk.slice(0, counts.ok);
  ok.push(...both.splice(0, counts.ok - ok.length));
  const entries = [...bad.map(card => instantiate(card, place, rng, { wantViolation: true, allowEdge })),
    ...ok.map(card => instantiate(card, place, rng, { wantViolation: false, allowEdge }))];
  const violations = entries.filter(entry => entry.violation).map(entry => ({ ...entry.violation,
    citeChoices: citeChoices(cards.find(card => card.id === entry.cardId), cards, articles, rng),
  }));
  const hotspots = Object.fromEntries(entries.map(({ hid, violation, ...entry }) => [hid, entry]));
  const used = new Set(Object.keys(hotspots));
  const plains = shuffle(rng, place.plains);  // 한 현장 안에서 같은 문장이 두 번 나오지 않게 섞어서 차례로 씀
  const fillers = shuffle(rng, place.fillers ?? []);
  for (let i = 0; i < counts.plain; i++) {
    let hid = `plain-${i}`;
    while (used.has(hid)) hid = `_${hid}`;
    used.add(hid);
    entries.push({ hid, text: plains[i % plains.length] });
    hotspots[hid] = { kind: 'plain' };
  }
  const phrases = shuffle(rng, entries).map(entry => `[[${entry.hid}|${entry.text}]]`);
  const paragraphs = phrases.length <= 7 ? 2 : 3;
  const paras = Array.from({ length: paragraphs }, (_, i) => [
    fillers.length ? fillers[i % fillers.length] : '',
    ...phrases.slice(Math.floor(i * phrases.length / paragraphs), Math.floor((i + 1) * phrases.length / paragraphs)),
  ].filter(Boolean).join(' '));
  return { id: `run-day-${day}`, generated: true, order: day, day, placeId: place.id,
    kind: place.kind, title: day === 5 ? `기획감독 · ${place.name}` : place.name, place: place.name,
    briefing: [pick(rng, place.intro), '구절을 살펴보시고 위반 사항을 지적해 주세요.'],
    scenes: [{ id: 'scene', name: place.name, paras }], hotspots, violations };
}
