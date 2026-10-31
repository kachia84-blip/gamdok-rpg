import { makeRng, pick } from './rng.js';
import { ITEMS } from './items.js';
import { makeSite } from './sitegen.js';

export const RELICS = Object.freeze({
  vest: Object.freeze({ emoji: '🦺', name: '안전조끼', desc: '첫 함정 지적 1회를 무효로 합니다.' }),
  light: Object.freeze({ emoji: '🔦', name: '현장 손전등', desc: '현장마다 지적 칸이 1개 늘어납니다.' }),
  books: Object.freeze({ emoji: '📚', name: '조문 묶음', desc: '현장마다 원문을 1회 무료로 봅니다.' }),
  calculator: Object.freeze({ emoji: '🧮', name: '계산기', desc: '숫자 반박 정답마다 신뢰도 5를 회복합니다.' }),
});

export function startRun(seed) {
  return { seed, day: 1, trust: 100, phase: 'site', score: 0, xp: 0, reports: [], relics: [], trapUsed: false, rewards: [] };
}

export function makeRunSite(run, cards, places, articles) {
  const previous = run.reports.at(-1);
  return makeSite(run.day, makeRng(`${run.seed}:site:${run.day}`), cards, places, articles,
    { previousPlace: previous?.placeId });
}

export function resolveReport(run, report) {
  if (report.waivedFalseMark || !run.relics.includes('vest') || run.trapUsed || !report.falseMarks.length) return report;
  const points = report.points + 15;
  const ratio = Math.max(0, points) / ((report.found.length + report.missed.length) * 80 || 1);
  return { ...report, waivedFalseMark: report.falseMarks[0], falseMarks: report.falseMarks.slice(1),
    points, grade: ratio >= .95 ? 'S' : ratio >= .8 ? 'A' : ratio >= .6 ? 'B' : 'C',
    breakdown: { ...report.breakdown, falseMark: report.breakdown.falseMark + 15 } };
}

export function afterSite(run, report) {
  if (run.phase !== 'site') return run;
  const adjusted = resolveReport(run, report);
  const citeWrong = adjusted.found.filter(id => !adjusted.perViolation[id]?.cite).length;
  const rebutWrong = adjusted.found.filter(id => !adjusted.perViolation[id]?.rebut).length;
  const damage = adjusted.falseMarks.length * 15 + adjusted.missed.length * 20 + citeWrong * 5 + rebutWrong * 10;
  // A lethal inspection cannot be rescued by a relic or a later reward.
  const remaining = run.trust - damage;
  const recovery = remaining > 0 && run.relics.includes('calculator') ? (adjusted.numericCorrect ?? 0) * 5 : 0;
  const trust = Math.min(100, Math.max(0, remaining + recovery));
  return { ...run, trust, phase: trust <= 0 ? 'failed' : 'reward',
    score: run.score + adjusted.points, xp: run.xp + Math.max(0, adjusted.points),
    reports: [...run.reports, { day: run.day, points: adjusted.points, trust,
      placeId: adjusted.placeId ?? run.site?.placeId, kind: adjusted.kind ?? run.site?.kind }],
    trapUsed: run.trapUsed || !!adjusted.waivedFalseMark };
}

export function rewardChoices(run, rng) {
  if (run.phase !== 'reward') return [];
  const available = Object.keys(RELICS).filter(id => !run.relics.includes(id));
  const itemId = pick(rng, Object.keys(ITEMS));
  return [{ type: 'item', id: itemId }, { type: 'trust', amount: 30 },
    available.length ? { type: 'relic', id: pick(rng, available) } : { type: 'item', id: pick(rng, Object.keys(ITEMS).filter(id => id !== itemId)) }];
}

export function takeReward(run, choice) {
  if (run.phase !== 'reward') return run;
  if (!choice || !(choice.type === 'item' && Object.hasOwn(ITEMS, choice.id) ||
    choice.type === 'trust' && choice.amount === 30 || choice.type === 'relic' &&
    Object.hasOwn(RELICS, choice.id) && !run.relics.includes(choice.id))) return run;
  if (run.choices && !run.choices.some(item => item.type === choice.type && item.id === choice.id && item.amount === choice.amount)) return run;
  const next = { ...run, rewards: [...run.rewards, { ...choice }],
    trust: choice.type === 'trust' ? Math.min(100, run.trust + 30) : run.trust,
    relics: choice.type === 'relic' ? [...run.relics, choice.id] : [...run.relics],
    phase: run.day === 5 ? 'won' : 'site', day: Math.min(5, run.day + 1) };
  delete next.site;
  delete next.inspection;
  delete next.result;
  delete next.page;
  delete next.choices;
  return next;
}

export function runSummary(run) {
  return { seed: run.seed, days: run.reports.length, score: run.score, xp: run.xp, trust: run.trust, won: run.phase === 'won' };
}

export function bestRun(previous, run) {
  const summary = runSummary(run);
  if (!previous || Number(summary.won) > Number(previous.won) ||
    (summary.won === previous.won && (summary.days > previous.days || summary.days === previous.days && summary.score > previous.score))) return summary;
  return previous;
}
