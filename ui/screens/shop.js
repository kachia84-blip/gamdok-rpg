import { h, button, heading, panel, back } from './common.js';
import { GOODS, CONSUMABLES, bagCount } from '../../core/shop.js';
import { GEAR } from '../../core/hero.js';
export function shop({ hero, save, onBuy, onTown, message }) {
  const cleared = save.cleared ?? [];
  const open = item => item.tier === 1 || cleared.includes(item.tier - 1);
  const row = ([id, item]) => h('div', { className: 'shop-row' }, h('div', {}, h('strong', {}, item.name),
    h('small', {}, item.defense ? `방어 +${item.defense}` : item.law ? `법지식 +${item.law}` : item.eye ? `관찰력 +${item.eye}` : item.hp ? `HP ${item.hp} 회복` : id === 'tape' ? '환영 여부 확인' : id === 'extinguisher' ? '다음 반격 1회 막기' : '조문 보기 2개 제거')),
    open(item) ? button(`${item.price}G`, () => onBuy(id), {
      disabled: hero.gold < item.price || !item.slot && bagCount(hero) >= 10 }) : h('span', { className: 'muted' }, `🔒 ${item.tier - 1}장 클리어`));
  const recovery = Object.entries(CONSUMABLES).filter(([, item]) => item.hp && open(item)).sort((a, b) => b[1].hp - a[1].hp).slice(0, 2);
  return h('div', { className: 'shop-screen' }, heading('지청', '🏪 상점'),
    panel(...[['head', '머리'], ['hand', '손'], ['tool', '도구']].map(([slot, name]) => {
      const current = GEAR[hero.gear[slot]];
      const next = Object.entries(GOODS).filter(([, item]) => item.slot === slot && !item.rare && item.tier > (current?.tier ?? 0))
        .sort((a, b) => a[1].tier - b[1].tier || a[1].price - b[1].price)[0];
      return h('div', { className: 'gear-slot' }, h('p', {}, `${name}: ${current?.name ?? '없음'}`),
        next ? row(next) : h('p', { className: 'muted' }, '최고 단계'));
    })),
    panel(h('h2', {}, `소모품 · 가방 ${bagCount(hero)} / 10`), [...recovery, ['tape', CONSUMABLES.tape], ['notebook', CONSUMABLES.notebook]].map(row),
      message && h('p', { className: 'notice', role: 'status' }, message)), back(onTown));
}
