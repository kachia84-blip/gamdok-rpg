import { FIELDS, fieldGains, fieldLevel } from './fields.js';
import { ITEMS, itemRewards, grantItems } from './items.js';
import { collect } from './codex.js';
import { rankOf } from './score.js';

const GRADES = ['C', 'B', 'A', 'S'];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeId = id => /^[a-zA-Z0-9_-]+$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id);

export function emptySave() {
  return {
    v: 3, xp: 0, cleared: {}, review: [], settings: {},
    fields: Object.fromEntries(FIELDS.map(field => [field.id, 0])),
    items: Object.fromEntries(Object.keys(ITEMS).map(id => [id, 1])),
    codex: [], lastPlayDay: '', bestRun: null, run: null,
  };
}

export function parseSave(text) {
  try {
    const s = JSON.parse(text);
    if (!record(s) || ![1, 2, 3].includes(s.v) || !Number.isFinite(s.xp) || s.xp < 0 ||
        !record(s.cleared) || !Array.isArray(s.review) || !record(s.settings)) return emptySave();
    if (!Object.entries(s.cleared).every(([id, c]) => safeId(id) && record(c) && GRADES.includes(c.best) && Number.isFinite(c.points))) return emptySave();
    if (!s.review.every(c => record(c) && safeId(c.siteId) && safeId(c.vid) &&
        ['cite', 'law', 'rebut'].includes(c.step) && c.key === `${c.siteId}:${c.vid}:${c.step}` &&
        Number.isInteger(c.box) && c.box >= 1 && c.box <= 5 && Number.isFinite(c.due))) return emptySave();
    if (new Set(s.review.map(c => c.key)).size !== s.review.length) return emptySave();
    const migrated = { ...emptySave(), xp: s.xp, cleared: s.cleared, review: s.review, settings: s.settings };
    if (s.v === 1) return migrated;
    for (const id of Object.keys(migrated.fields)) {
      if (record(s.fields) && Number.isFinite(s.fields[id]) && s.fields[id] >= 0) migrated.fields[id] = s.fields[id];
    }
    for (const id of Object.keys(migrated.items)) {
      if (record(s.items) && Number.isInteger(s.items[id]) && s.items[id] >= 0 && s.items[id] <= 3) migrated.items[id] = s.items[id];
    }
    if (Array.isArray(s.codex)) migrated.codex = [...new Set(s.codex.filter(no => typeof no === 'string' && /^제\d+조$/.test(no)))];
    if (typeof s.lastPlayDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.lastPlayDay)) migrated.lastPlayDay = s.lastPlayDay;
    if (s.v === 3) {
      if (validSummary(s.bestRun)) migrated.bestRun = s.bestRun;
      if (validRun(s.run)) migrated.run = s.run;
    }
    return migrated;
  } catch {
    return emptySave();
  }
}

export function applyResult(save, siteId, report) {
  if (!safeId(siteId) || !GRADES.includes(report.grade) || !Number.isFinite(report.points)) return save;
  const previous = save.cleared[siteId];
  const best = previous && GRADES.indexOf(previous.best) > GRADES.indexOf(report.grade) ? previous.best : report.grade;
  return {
    ...save, xp: save.xp + Math.max(0, report.points),
    cleared: { ...save.cleared, [siteId]: { best, points: Math.max(previous?.points ?? -Infinity, report.points) } },
    review: save.review.map(card => ({ ...card })), settings: { ...save.settings },
  };
}

export function applyProgress(before, site, report, day, rng) {
  const gains = fieldGains(report, site);
  const fields = Object.fromEntries(FIELDS.map(field => [field.id, Math.max(0, before.fields[field.id] + (gains[field.id] ?? 0))]));
  const codex = collect(before.codex, report, site);
  const rewards = site.generated ? [] : itemRewards(report, { firstToday: before.lastPlayDay !== day }, rng);
  const granted = grantItems({ ...applyResult(before, site.id, report), fields, codex, lastPlayDay: day }, rewards);
  const save = granted.save;
  return { save, progress: {
    fields: Object.fromEntries(FIELDS.map(field => [field.id, fields[field.id] - before.fields[field.id]])),
    rewards: granted.received, overflow: rewards.length - granted.received.length,
    articles: codex.filter(no => !before.codex.includes(no)),
    rankUp: rankOf(save.xp).min > rankOf(before.xp).min ? rankOf(save.xp).name : null,
    fieldUps: FIELDS.filter(field => fieldLevel(fields[field.id]).level > fieldLevel(before.fields[field.id]).level)
      .map(field => ({ ...field, level: fieldLevel(fields[field.id]).level })),
  } };
}

function validSummary(summary) {
  return record(summary) && Number.isInteger(summary.days) && summary.days >= 0 && summary.days <= 5 &&
    Number.isFinite(summary.score) && Number.isFinite(summary.xp) && summary.xp >= 0 && typeof summary.won === 'boolean';
}

function validRun(run) {
  if (!record(run) || !['string', 'number'].includes(typeof run.seed) ||
    typeof run.seed === 'number' && !Number.isFinite(run.seed) ||
    !Number.isInteger(run.day) || run.day < 1 || run.day > 5 ||
    !Number.isFinite(run.trust) || run.trust < 0 || run.trust > 100 ||
    !['site', 'reward', 'won', 'failed'].includes(run.phase) ||
    !Number.isFinite(run.score) || !Number.isFinite(run.xp) || run.xp < 0 ||
    !Array.isArray(run.reports) || run.reports.length > 5 ||
    !run.reports.every(r => record(r) && Number.isInteger(r.day) && Number.isFinite(r.points) && Number.isFinite(r.trust)) ||
    !Array.isArray(run.relics) || !run.relics.every(id => ['vest', 'light', 'books', 'calculator'].includes(id)) ||
    new Set(run.relics).size !== run.relics.length || !Array.isArray(run.rewards) || typeof run.trapUsed !== 'boolean') return false;
  if (run.site != null && (!record(run.site) || !safeId(run.site.id) || !Array.isArray(run.site.violations) ||
    !record(run.site.hotspots) || !Array.isArray(run.site.scenes) || !run.site.scenes.length)) return false;
  const st = run.inspection;
  if (st != null && (!run.site || !record(st) || st.siteId !== run.site.id ||
    !['scene', 'cite', 'law', 'rebut', 'report'].includes(st.phase) ||
    !Array.isArray(st.marks) || !st.marks.every(id => Object.hasOwn(run.site.hotspots, id)) ||
    !Array.isArray(st.queue) || !st.queue.every(id => run.site.violations.some(v => v.id === id)) ||
    !Number.isInteger(st.cur) || st.cur < 0 || !record(st.answers))) return false;
  return true;
}
