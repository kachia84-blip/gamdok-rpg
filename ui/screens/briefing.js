import { h, button, heading } from '../dom.js';

export function briefing({ site, onStart, onHome }) {
  return h('section', {}, heading(`점검 의뢰 ${String(site.order).padStart(2, '0')} · ${site.kind}`, site.title),
    h('p', { className: 'muted' }, site.place),
    h('article', { className: 'paper' }, h('h2', {}, '점검 배경을 확인해 주세요'), site.briefing.map(p => h('p', {}, p))),
    h('p', {}, '현장 글의 점선 구절을 눌러 위반을 지적해 주세요. 모든 장소를 살핀 뒤 점검을 종료해 주세요.'),
    button('현장 들어가기', onStart, { className: 'primary full' }),
    button('사무실로', onHome, { className: 'secondary full' }));
}
