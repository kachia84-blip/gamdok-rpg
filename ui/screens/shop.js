import { h, button, heading, panel, paragraphs, back } from './common.js';
import { GOODS, bagCount } from '../../core/shop.js';
export function shop({ hero, story, onBuy, onTown, message }) {
  return h('div', {}, heading('지청', '🏪 상점'), panel(...paragraphs(story.town.shop), h('p', {}, `가방 ${bagCount(hero)} / 10`)),
    message && h('p', { className: 'notice', role: 'status' }, message),
    ...[['head', '머리'], ['hand', '손'], ['tool', '도구'], [null, '소모품']].map(([slot, name]) => panel(h('h2', {}, name),
      Object.entries(GOODS).filter(([, item]) => (item.slot ?? null) === slot).map(([id, item]) =>
        h('div', { className: 'shop-row' }, h('div', {}, h('strong', {}, item.name),
          h('small', {}, item.defense ? `방어 +${item.defense}` : item.law ? `법지식 +${item.law}` : item.eye ? `관찰력 +${item.eye}` : item.hp ? `HP ${item.hp} 회복` : id === 'tape' ? '환영 여부 확인' : '조문 보기 2개 제거')),
        button(hero.gear[slot] === id ? '장착 중' : `${item.price}G`, () => onBuy(id), {
          disabled: hero.gold < item.price || !!slot && hero.gear[slot] === id || !slot && bagCount(hero) >= 10 }))))), back(onTown));
}
