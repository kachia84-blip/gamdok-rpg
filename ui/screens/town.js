import { h, button, heading } from './common.js';
export function town({ save, story, onEnter, onPage }) {
  const menu = [['🏪 상점', 'shop'], ['🛏️ 숙직실', 'inn'], ['🧓 선배 감독관', 'senior'], ['📜 스킬북', 'skillbook'], ['📊 능력치', 'status']];
  return h('div', { className: 'game-screen town-screen' }, heading('신입 감독관 RPG', '지청'),
    h('div', { className: 'town-greeting' }, h('p', {}, story.town.greeting[0]),
      h('p', { className: 'muted' }, `최고 도달 ${save.best.floor}층 · 습득 조문 ${save.skills.length}개`)),
    h('nav', { className: 'town-menu', 'aria-label': '지청 시설' },
      button(save.run ? '⚔️ 탐험 계속' : '⚔️ 던전 입장', onEnter, { className: 'primary tile-dungeon' }),
      menu.map(([label, page]) => button(label, () => onPage(page), { className: `tile-${page}` }))));
}
