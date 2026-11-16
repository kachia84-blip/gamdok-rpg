import { h, button, heading, panel } from './common.js';

// 도감: 이긴 몬스터는 이름으로, 아직 못 만난 몬스터는 분야와 조문 번호로만 보입니다.
export const FIELD = { fall: '추락', ppe: '보호구', confined: '밀폐공간', ground: '굴착', machine: '기계', lift: '양중', elec: '전기', etc: '기타' };
const PER_PAGE = 10;

export function dex({ cards, seen = [], lookup, onArticle, onBack, wanted = null }) {
  const order = Object.keys(FIELD);
  const list = [...cards].sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field));
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const met = list.filter(card => seen.includes(card.id)).length;
  let pageNo = 0;
  const grid = h('div', { className: 'dex-grid' });
  const label = h('p', { className: 'dex-page', role: 'status' });
  const prev = button('이전', () => { pageNo--; draw(); });
  const next = button('다음', () => { pageNo++; draw(); });
  function draw() {
    const items = list.slice(pageNo * PER_PAGE, (pageNo + 1) * PER_PAGE);
    label.textContent = `${pageNo + 1} / ${pages}쪽 · ${[...new Set(items.map(card => FIELD[card.field] ?? '기타'))].join('·')}`;
    grid.replaceChildren(...items.map(card => {
      if (!seen.includes(card.id)) return button(`${card.id === wanted ? '🎯' : '❓'} ${FIELD[card.field] ?? '기타'} · ${card.article}`, () => onArticle(card.article), { className: 'dex-unknown' });
      const monster = lookup(card);
      return button(`${monster.emoji} ${monster.name}`, () => onArticle(card.article, [monster.name, card.label, card.quote].filter(Boolean).join('\n\n')));
    }));
    prev.disabled = pageNo === 0; next.disabled = pageNo >= pages - 1;
  }
  draw();
  return h('div', { className: 'dex-screen' }, heading('이긴 몬스터 모음', `📔 도감 ${met}/${list.length}`),
    panel(h('p', {}, `눌러서 조문 원문을 볼 수 있습니다. ❓는 아직 못 이긴 몬스터${wanted ? ', 🎯는 오늘의 현상수배(150G)' : ''}입니다.`), label, grid, h('div', { className: 'choices' }, prev, next)),
    button('능력치로', onBack, { className: 'secondary full' }));
}
