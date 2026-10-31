import { h, button, heading, panel, paragraphs, back } from './common.js';
import { INN_PRICE } from '../../core/shop.js';
export function inn({ hero, story, onStay, onTown, message, wasFaint }) {
  return h('div', {}, heading('지청', '🛏️ 숙직실'), panel(...paragraphs(wasFaint ? story.faint : story.town.inn),
    h('p', {}, `HP ${hero.hp} / ${hero.maxHp}`), h('p', {}, `숙박 ${INN_PRICE}G · HP를 모두 회복합니다.`),
    message && h('p', { role: 'status' }, message),
    button('쉬기', onStay, { className: 'primary full', disabled: hero.hp === hero.maxHp || hero.gold < INN_PRICE })), back(onTown));
}
