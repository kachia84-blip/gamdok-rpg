import { h, button, heading } from '../dom.js';
export { h, button, heading };
export const panel = (...children) => h('section', { className: 'panel' }, ...children);
export const paragraphs = lines => lines.map(line => h('p', {}, line));
export const back = onTown => button('마을로', onTown, { className: 'secondary full' });
export function fitScreen(screen) {
  const children = Array.from(screen.children);
  const header = children.shift();
  const last = children.at(-1);
  const action = last?.tagName.toLowerCase() === 'button' ? children.pop() : null;
  screen.className += ' game-screen';
  screen.replaceChildren(header, h('div', { className: 'screen-content', tabIndex: 0, 'aria-label': '화면 내용' }, children), ...(action ? [action] : []));
  return screen;
}
export function hpBar(hp, maxHp, label) {
  return h('div', { className: 'hp-display' }, h('div', { className: 'hp-label' }, label, h('span', {}, `${hp} / ${maxHp}`)),
    h('div', { className: 'hp-track', role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': maxHp, 'aria-valuenow': hp },
      h('div', { className: `hp-fill${hp <= maxHp * 0.3 ? ' low' : ''}`, style: `width:${Math.max(0, Math.min(100, hp / maxHp * 100))}%` })));
}
