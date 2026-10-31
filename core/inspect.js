import { POINTS } from './score.js';
import { judgeCite, judgeLaw, judgeRebut } from './judge.js';
import { ITEMS } from './items.js';

// toggleMark's public signature has no site argument. Keep its limit on the state
// as non-enumerable metadata so the specified public state shape stays unchanged.
const markLimit = Symbol('markLimit');
function stateWithLimit(st, limit) {
  return Object.defineProperty(st, markLimit, { value: limit });
}
function update(st, patch) {
  return stateWithLimit({ ...st, ...patch }, st[markLimit]);
}

export function startInspection(site) {
  return stateWithLimit({ siteId: site.id, marks: [], phase: 'scene', queue: [], cur: 0, answers: {} }, site.violations.length + 1);
}

export function canMark(st, site) {
  return st.marks.length < site.violations.length + 1 + (st.extraMarks ?? 0);
}

export function toggleMark(st, hotspotId) {
  if (st.phase !== 'scene') return st;
  const selected = st.marks.includes(hotspotId);
  if (!selected && st.marks.length >= (st[markLimit] ?? 0) + (st.extraMarks ?? 0)) return st;
  return update(st, { marks: selected ? st.marks.filter(id => id !== hotspotId) : [...st.marks, hotspotId] });
}

export function finishScene(st, site) {
  if (st.phase !== 'scene') return st;
  const queue = site.violations.filter(v => st.marks.includes(v.id)).map(v => v.id);
  return update(st, { queue, cur: 0, phase: queue.length ? 'cite' : 'report' });
}

export function answer(st, step, vid, value) {
  if (!['cite', 'law', 'rebut', 'peek'].includes(step) || !st.queue.includes(vid)) return st;
  if (step === 'peek' && (st.phase !== 'cite' || st.queue[st.cur] !== vid
    || Object.hasOwn(st.answers[vid] ?? {}, 'cite') || value !== true)) return st;
  return update(st, { answers: { ...st.answers, [vid]: { ...st.answers[vid], [step]: value } } });
}

export function openPeek(st, vid, free = false) {
  const next = answer(st, 'peek', vid, true);
  if (next === st) return st;
  const previous = st.answers[vid];
  // A later free opening cannot undo an earlier penalty. A book covers one opening.
  if (previous?.peek && !previous.peekFree) return st;
  const waived = free || !!st.freePeek;
  if (!previous?.peek && !waived) return next;
  if (previous?.peekFree && free && !st.freePeek) return st;
  return update(next, {
    freePeek: false,
    answers: { ...next.answers, [vid]: { ...next.answers[vid], peekFree: waived } },
  });
}

export function sceneViolationCount(site, sceneId) {
  const scene = site.scenes.find(place => place.id === sceneId);
  const ids = new Set((scene?.paras ?? []).flatMap(para => [...para.matchAll(/\[\[([^|\]]+)\|[^\]]+\]\]/g)].map(match => match[1])));
  return site.violations.filter(v => ids.has(v.id)).length;
}

// Inventory is consumed by the caller only when this returns a changed state.
export function useInspectionItem(st, site, id, { hotspotId, sceneId, rng } = {}) {
  if (!Object.hasOwn(ITEMS, id) || ITEMS[id].where !== st.phase) return st;
  let patch;
  if (id === 'camera') patch = { extraMarks: (st.extraMarks ?? 0) + 1 };
  if (id === 'tape') {
    const hotspot = site.hotspots[hotspotId];
    if (!hotspot || st.revealed?.[hotspotId]) return st;
    patch = { revealed: { ...st.revealed, [hotspotId]: hotspot.kind === 'violation' ? 'violation' : 'fine' } };
  }
  if (id === 'checklist') {
    if (!site.scenes.some(scene => scene.id === sceneId) || Object.hasOwn(st.checks ?? {}, sceneId)) return st;
    patch = { checks: { ...st.checks, [sceneId]: sceneViolationCount(site, sceneId) } };
  }
  if (id === 'codebook') {
    const vid = current(st)?.vid;
    if (!vid || st.freePeek || (st.answers[vid]?.peek && !st.answers[vid].peekFree)
      || Object.hasOwn(st.answers[vid] ?? {}, 'cite')) return st;
    patch = { freePeek: true };
  }
  if (id === 'senior') {
    const vid = current(st)?.vid;
    const r = site.violations.find(v => v.id === vid)?.rebuttal;
    if (r?.type !== 'pick' || Object.hasOwn(st.answers[vid] ?? {}, 'rebut')) return st;
    const removed = st.removed?.[vid] ?? [];
    const wrong = r.choices.map((_, index) => index).filter(index => index !== r.answer && !removed.includes(index));
    if (!wrong.length) return st;
    const index = wrong[Math.min(wrong.length - 1, Math.max(0, Math.floor(rng() * wrong.length)))];
    patch = { removed: { ...st.removed, [vid]: [...removed, index] } };
  }
  return patch ? update(st, { ...patch, usedItems: [...(st.usedItems ?? []), id] }) : st;
}

export function current(st) {
  return ['cite', 'law', 'rebut'].includes(st.phase) && st.queue[st.cur]
    ? { vid: st.queue[st.cur], step: st.phase } : null;
}

export function nextStep(st) {
  if (!current(st)) return st;
  if (st.phase === 'cite') return update(st, { phase: 'law' });
  if (st.phase === 'law') return update(st, { phase: 'rebut' });
  const cur = st.cur + 1;
  return update(st, { cur, phase: cur < st.queue.length ? 'cite' : 'report' });
}

export function buildReport(st, site) {
  const found = site.violations.filter(v => st.marks.includes(v.id)).map(v => v.id);
  const missed = site.violations.filter(v => !found.includes(v.id)).map(v => v.id);
  const falseMarks = st.marks.filter(id => site.hotspots[id]?.kind === 'ok');
  const perViolation = Object.fromEntries(site.violations.map(v => {
    const a = st.answers[v.id] ?? {};
    const marked = found.includes(v.id);
    return [v.id, {
      cite: marked && judgeCite(v, a.cite), law: marked && judgeLaw(v, a.law),
      rebut: marked && judgeRebut(v, a.rebut),
      peek: marked && a.peek === true,
      ...(marked && a.peekFree === true ? { peekFree: true } : {}),
    }];
  }));
  const breakdown = {
    find: found.length * POINTS.find,
    cite: Object.values(perViolation).reduce((sum, v) => sum + (v.cite ? (v.peek && !v.peekFree ? Math.floor(POINTS.cite / 2) : POINTS.cite) : 0), 0),
    law: Object.values(perViolation).filter(v => v.law).length * POINTS.law,
    rebut: Object.values(perViolation).filter(v => v.rebut).length * POINTS.rebut,
    falseMark: falseMarks.length ? falseMarks.length * POINTS.falseMark : 0,
    missed: missed.length ? missed.length * POINTS.missed : 0,
  };
  const points = Object.values(breakdown).reduce((sum, n) => sum + n, 0);
  const maximum = site.violations.length * (POINTS.find + POINTS.cite + POINTS.law + POINTS.rebut);
  const ratio = maximum ? Math.max(0, points) / maximum : 0;
  const grade = ratio >= 0.95 ? 'S' : ratio >= 0.8 ? 'A' : ratio >= 0.6 ? 'B' : 'C';
  return { found, missed, falseMarks, perViolation, points, breakdown, grade, usedItems: [...(st.usedItems ?? [])] };
}
