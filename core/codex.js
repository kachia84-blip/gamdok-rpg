import { fieldOf } from './fields.js';

export function collect(codex, report, site) {
  return [...new Set([...codex, ...site.violations.filter(v => report.perViolation[v.id]?.cite).map(v => v.article)])];
}

export function codexView(codex, sites, articles) {
  const numbers = [...new Set(sites.flatMap(site => site.violations.map(v => v.article)))];
  return numbers.map(no => ({ no, title: articles[no]?.title ?? '', field: fieldOf(no), got: codex.includes(no) }));
}
