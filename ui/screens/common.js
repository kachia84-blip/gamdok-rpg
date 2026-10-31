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
export function sceneScreen(screen, scene) {
  return h('div', { className: 'scene-screen' },
    h('div', { className: 'scenery', dataset: { scene }, 'aria-hidden': true }), screen);
}
export function hpBar(hp, maxHp, label, previousHp = hp, previousMaxHp = maxHp) {
  const ratio = (value, max) => Math.max(0, Math.min(1, value / Math.max(1, max)));
  const current = ratio(hp, maxHp);
  const previous = Math.max(current, ratio(previousHp, previousMaxHp));
  return h('div', { className: 'hp-display' }, h('div', { className: 'hp-label' }, label, h('span', {}, `${hp} / ${maxHp}`)),
    h('div', { className: 'hp-track', role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': maxHp, 'aria-valuenow': hp },
      h('div', { className: `hp-trail${previous > current ? ' draining' : ''}`, style: `--hp-from:${previous};--hp-to:${current};transform:scaleX(${current})`, 'aria-hidden': true }),
      h('div', { className: `hp-fill${hp <= maxHp * 0.3 ? ' low' : ''}`, style: `transform:scaleX(${current})` })));
}
