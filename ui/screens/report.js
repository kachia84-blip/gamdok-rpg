import { h, button, heading } from '../dom.js';
import { hotspotText } from './scene.js';
import { FIELDS } from '../../core/fields.js';
import { ITEMS } from '../../core/items.js';

export function report({ site, result, onHome, onArticle }) {
  const labels = { find: '위반 발견', cite: '조문 선택', law: '법 근거', rebut: '반박 설득', falseMark: '잘못된 지적', missed: '놓친 위반' };
  const violation = id => site.violations.find(v => v.id === id);
  const progress = result.progress;
  return h('section', {}, heading('점검을 마치셨습니다', '점검 결과서'),
    h('article', { className: 'paper report' }, h('p', { className: 'eyebrow' }, site.title),
      h('div', { className: 'grade', 'aria-label': `${result.grade}등급` }, result.grade),
      h('h2', {}, `${result.points}점 · 획득 ${Math.max(0, result.points)} XP`),
      progress?.rankUp && h('p', { className: 'celebration', role: 'status' }, `🎖️ ${progress.rankUp} 승진을 축하드립니다!`),
      progress?.fieldUps.map(field => h('p', { className: 'celebration' }, `🎖️ ${field.name} Lv${field.level} 달성을 축하드립니다!`)),
      progress && h('section', { className: 'progress-summary' }, h('h2', {}, '분야 숙련도'),
        FIELDS.filter(field => progress.fields[field.id] !== 0).map(field => h('p', {}, `${field.emoji} ${field.name} ${progress.fields[field.id] > 0 ? '+' : ''}${progress.fields[field.id]}`)),
        h('h2', {}, '받은 장비'),
        progress.rewards.length ? h('p', {}, progress.rewards.map(id => `${ITEMS[id].emoji} ${ITEMS[id].name}`).join(' · ')) : h('p', {}, '받으신 장비가 없습니다.'),
        progress.overflow > 0 && h('p', { className: 'muted' }, `보유 한도로 장비 ${progress.overflow}개를 받지 못하셨습니다.`),
        progress.articles.length > 0 && h('p', {}, `📚 도감 등록: ${progress.articles.join(', ')}`)),
      h('h2', {}, '사용한 장비'),
      h('p', {}, result.usedItems.length ? result.usedItems.map(id => `${ITEMS[id].emoji} ${ITEMS[id].name}`).join(' · ') : '사용하신 장비가 없습니다.'),
      h('dl', { className: 'breakdown' }, Object.entries(result.breakdown).map(([key, points]) => [h('dt', {}, labels[key]), h('dd', {}, `${points > 0 ? '+' : ''}${points}점`)])),
      h('h2', {}, `적발하신 위반 ${result.found.length}건`),
      result.found.length === 0 && h('p', {}, '적발하신 위반이 없습니다.'),
      result.found.map(id => {
        const v = violation(id);
        const grades = result.perViolation[id];
        return h('div', { className: 'report-item' }, h('h3', {}, v.label),
          grades.peek && h('small', {}, '원문 참고'),
          button(`${v.article} ${v.clauseNote ?? ''} · 원문`, () => onArticle(v.article), { className: 'secondary full' }),
          h('p', {}, v.fix), h('small', {}, `조문 ${grades.cite ? '정답' : '오답'} · 법 근거 ${grades.law ? '정답' : '오답'} · 반박 ${grades.rebut ? '정답' : '오답'}`));
      }),
      h('h2', {}, `놓치신 위반 ${result.missed.length}건`),
      result.missed.map(id => {
        const v = violation(id);
        return h('div', { className: 'missed-news' }, h('small', {}, '며칠 뒤 사고 소식 · 가상 사례입니다'),
          h('h3', {}, v.label), h('p', {}, v.missedNews),
          button(`${v.article} ${v.clauseNote ?? ''} · 원문`, () => onArticle(v.article), { className: 'secondary full' }), h('p', {}, v.fix));
      }),
      h('h2', {}, `잘못 지적하신 사항 ${result.falseMarks.length}건`), result.falseMarks.map(id => h('div', { className: 'report-item' },
        h('p', { className: 'quote' }, hotspotText(site, id)), h('p', {}, site.hotspots[id].why))),
      h('p', { className: 'muted' }, '틀리거나 놓치신 내용은 오답 노트에 담았습니다.')),
    button('사무실로', onHome, { className: 'primary full' }));
}
