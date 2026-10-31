export const FIELDS = Object.freeze([
  { id: 'fall', name: '추락·통로', emoji: '🪜', articles: ['제13조', '제14조', '제22조', '제23조', '제24조', '제27조', '제28조', '제42조', '제43조', '제44조', '제56조', '제62조', '제63조', '제67조', '제68조'] },
  { id: 'ppe', name: '보호구', emoji: '⛑️', articles: ['제32조'] },
  { id: 'machine', name: '기계', emoji: '⚙️', articles: ['제87조', '제103조', '제104조'] },
  { id: 'lift', name: '운반·양중', emoji: '🚜', articles: ['제20조', '제133조', '제134조', '제179조', '제180조'] },
  { id: 'ground', name: '굴착·붕괴', emoji: '🕳️', articles: ['제38조', '제339조', '제340조', '제344조', '제347조'] },
  { id: 'elec', name: '전기', emoji: '⚡', articles: ['제301조', '제302조', '제304조'] },
  { id: 'confined', name: '밀폐공간', emoji: '🫁', articles: ['제618조', '제620조', '제621조', '제624조', '제625조'] },
  { id: 'etc', name: '조도·화재 등', emoji: '📁', articles: [] },
].map(field => Object.freeze({ ...field, articles: Object.freeze(field.articles) })));

export const FIELD_LEVELS = Object.freeze([0, 30, 80, 150, 250]);

export function fieldOf(articleNo) {
  return FIELDS.find(field => field.articles.includes(articleNo))?.id ?? 'etc';
}

export function fieldLevel(fxp) {
  const value = Number.isFinite(fxp) ? Math.max(0, fxp) : 0;
  const index = FIELD_LEVELS.findLastIndex(min => value >= min);
  const next = FIELD_LEVELS[index + 1] ?? null;
  return { level: index + 1, next, progress: next === null ? 1 : (value - FIELD_LEVELS[index]) / (next - FIELD_LEVELS[index]) };
}

export function fieldGains(report, site) {
  const gains = {};
  const add = (article, amount) => {
    if (!amount) return;
    const id = fieldOf(article);
    gains[id] = (gains[id] ?? 0) + amount;
  };
  for (const v of site.violations) {
    const graded = report.perViolation[v.id];
    add(v.article, (graded?.cite ? (graded.peek ? 5 : 10) : 0) + (graded?.rebut ? 5 : 0));
    if (report.missed.includes(v.id)) add(v.article, -5);
  }
  for (const id of report.falseMarks) {
    const hotspot = site.hotspots[id];
    if (hotspot?.kind === 'ok') add(hotspot.article, -5);
  }
  return gains;
}

export function peekFree(save, articleNo) {
  return fieldLevel(save.fields?.[fieldOf(articleNo)] ?? 0).level >= 3;
}
