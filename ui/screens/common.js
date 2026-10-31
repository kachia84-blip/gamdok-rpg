import { h, button, heading } from '../dom.js';
export { h, button, heading };
export const panel = (...children) => h('section', { className: 'panel' }, ...children);
export const paragraphs = lines => lines.map(line => h('p', {}, line));
export const back = onTown => button('마을로', onTown, { className: 'secondary full' });
export function hpBar(hp, maxHp, label) {
  return h('div', { className: 'hp-display' }, h('div', { className: 'hp-label' }, label, h('span', {}, `${hp} / ${maxHp}`)),
    h('div', { className: 'hp-track', role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': maxHp, 'aria-valuenow': hp },
      h('div', { className: `hp-fill${hp <= maxHp * 0.3 ? ' low' : ''}`, style: `width:${Math.max(0, Math.min(100, hp / maxHp * 100))}%` })));
}
