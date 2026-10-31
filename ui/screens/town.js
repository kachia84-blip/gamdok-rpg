import { h, button, heading, panel, paragraphs } from './common.js';
export function town({ save, story, onEnter, onPage }) {
  const menu = [['🏪 상점', 'shop'], ['🛏️ 숙직실', 'inn'], ['🧓 선배 감독관', 'senior'], ['📜 스킬북', 'skillbook'], ['📊 능력치', 'status']];
  return h('div', {}, heading('신입 감독관 RPG', '지청'),
    panel(h('div', { className: 'town-art', 'aria-hidden': true }, '📚'), ...paragraphs(story.town.greeting),
      h('p', { className: 'muted' }, `최고 도달 ${save.best.floor}층 · 습득 조문 ${save.skills.length}개`)),
    button(save.run ? '⚔️ 탐험 계속' : '⚔️ 던전 입장', onEnter, { className: 'primary full enter' }),
    h('nav', { className: 'town-menu', 'aria-label': '지청 시설' }, menu.map(([label, page]) => button(label, () => onPage(page)))));
}
