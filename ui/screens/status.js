import { h, button, heading, panel, back } from './common.js';
import { effectiveStats, GEAR, xpNeeded } from '../../core/hero.js';
import { CONSUMABLES, bagCount } from '../../core/shop.js';
export function status({ hero, best, onLevel, onUse, onTown, message }) {
  const stats = effectiveStats(hero);
  return h('div', {}, heading('신입 감독관', '📊 능력치'), panel(h('h2', {}, `Lv${hero.lv}`),
    h('p', {}, `경험치 ${hero.exp} / ${xpNeeded(hero.lv)} · 최고 도달 ${best.floor}층`),
    h('p', {}, `법지식 ${stats.law} · 관찰력 ${stats.eye} · 설득력 ${stats.talk} · 방어 ${stats.defense}`),
    hero.points > 0 && button(`포인트 배분 (${hero.points})`, onLevel, { className: 'primary full' })),
    panel(h('h2', {}, '장비'), [['head', '머리'], ['hand', '손'], ['tool', '도구']].map(([slot, name]) => h('p', {}, `${name}: ${GEAR[hero.gear[slot]]?.name ?? '없음'}`))),
    panel(h('h2', {}, `🎒 가방 ${bagCount(hero)} / 10`), message && h('p', { role: 'status' }, message),
      Object.entries(CONSUMABLES).map(([id, item]) => h('div', { className: 'shop-row' }, h('p', {}, `${item.name} ×${hero.bag[id] ?? 0}`),
        item.hp && button('사용', () => onUse(id), { disabled: !(hero.bag[id] > 0) || hero.hp === hero.maxHp })))), back(onTown));
}
