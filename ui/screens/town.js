import { h, button, heading } from './common.js';
import { TOWN_MAP, TOWN_START, TOWN_BUILDINGS, findPath } from '../../core/townmap.js';
import { reducedMotion, sfx } from '../fx.js';
import { msgbox } from './msgbox.js';
import { chooseLine } from '../content.js';

export function town({ save, story, onEnter, onPage }) {
  let position = { ...TOWN_START };
  let walking = false, disposed = false, timer;
  const player = h('span', { className: 'town-player', 'aria-hidden': true },
    h('span', { className: 'town-player-icon' }, '👷'));
  const map = h('nav', { className: 'town-menu town-map', 'aria-label': '지청 시설과 길 · 건물이나 길을 눌러 이동', dataset: { walking: 'false' } });
  const place = () => player.setAttribute('style', `transform:translate(${position.x * 100}%,${position.y * 100}%)`);
  const move = (goal, arrive) => {
    if (walking || disposed) return;
    const path = findPath(position, goal);
    if (!path.length) return;
    if (reducedMotion()) {
      position = { ...goal }; place(); arrive?.(); return;
    }
    walking = true;
    map.dataset.walking = 'true';
    map.setAttribute('aria-busy', 'true');
    let index = 1;
    const step = () => {
      if (disposed) return;
      if (index >= path.length) {
        walking = false;
        map.dataset.walking = 'false';
        map.setAttribute('aria-busy', 'false');
        arrive?.(); return;
      }
      position = path[index++]; place(); sfx('step');
      timer = setTimeout(step, 90);
    };
    step();
  };
  TOWN_MAP.forEach((row, y) => [...row].forEach((tile, x) => {
    const attrs = { className: `town-cell terrain-${tile === '.' ? 'road' : tile === 'g' ? 'grass' : tile === 'w' ? 'wall' : 'plot'}`,
      style: `grid-column:${x + 1};grid-row:${y + 1}` };
    map.append(tile === '.' ? button('', () => move({ x, y }), { ...attrs, 'aria-label': `길 ${x + 1}, ${y + 1}로 이동` }) :
      h('span', { ...attrs, 'aria-hidden': true }));
  }));
  map.append(...TOWN_BUILDINGS.map(building => button(
    building.id === 'dungeon' && save.run ? '⚔️ 탐험 계속' : building.label,
    () => move(building.door, () => building.id === 'dungeon' ? onEnter() : onPage(building.id)),
    { className: `town-building tile-${building.id}${building.id === 'dungeon' ? ' primary' : ''}`,
      style: `grid-column:${building.x + 1}/span 3;grid-row:${building.y + 1}/span 2`,
      dataset: { building: building.id }, title: '길을 따라 이동해서 들어가기' })));
  place(); map.append(player);
  const screen = h('div', { className: 'game-screen town-screen' }, heading('신입 감독관 RPG', '지청'),
    map);
  const greeting = msgbox({ lines: [chooseLine(story.town.chatter, story.town.greeting[0])], speaker: '지청 주민',
    onDone: () => { greeting.dispose(); overlay.hidden = true; overlay.replaceChildren(); map.inert = false; } });
  const overlay = h('div', { className: 'message-overlay' }, greeting);
  map.inert = true;
  screen.append(overlay);
  screen.dispose = () => { disposed = true; clearTimeout(timer); greeting.dispose(); };
  return screen;
}
