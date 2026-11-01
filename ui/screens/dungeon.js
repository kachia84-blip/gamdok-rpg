import { h, button, heading, back } from './common.js';
import { msgbox } from './msgbox.js';
import { effectiveStats } from '../../core/hero.js';
import { citeLabel } from '../../core/reveal.js';

export function dungeon({ run, story, hero, save, articles, onEvent, onNext, onTown, onQuiz, onFloorSeen, message }) {
  const floor = story.floors[run.floor - 1];
  const event = run.events[run.step];
  const names = { battle: '몬스터', chest: '보물상자', rest: '쉼터', npc: '떠돌이 감독관' };
  const path = h('ol', { className: 'event-path', 'aria-label': '탐험 경로' }, run.events.map((item, index) =>
    h('li', { className: index < run.step ? 'done' : index === run.step ? 'current' : '', 'aria-current': index === run.step ? 'step' : null },
      `${index + 1}. ${item.boss ? '보스' : names[item.type]}${index < run.step ? ' · 완료' : ''}`)));
  const card = h('section', { className: 'dungeon-card panel', 'aria-label': '현재 칸' });
  if (!event) {
    card.append(h('h2', {}, '이 층을 돌파하셨습니다!'),
      run.floor < 6 && button('다음 층', onNext, { className: 'primary full' }));
  } else if (event.type === 'npc' && event.opened) {
    const npc = story.events.npc[0] ?? { name: '떠돌이 감독관' };
    card.append(h('h2', {}, npc.name), h('p', {}, event.text),
      h('div', { className: 'choices' }, event.choices.map(value =>
        button(citeLabel(value, articles, effectiveStats(hero).law, save.skills), () => onQuiz(value)))));
  } else {
    card.append(h('h2', {}, event.boss ? '마지막 문 앞' : names[event.type]),
      h('p', {}, event.type === 'battle' ? event.revived ? '되살아난 몬스터가 길을 막습니다. 다시 맞서 주세요.' : '수상한 인기척이 들립니다. 준비해 주세요.' :
        event.type === 'npc' ? story.events.npc[0]?.line ?? '이 상황에 맞는 조문을 골라 주세요.' : story.events[event.type][0]),
      button(event.type === 'battle' ? '맞서기' : '살펴보기', onEvent, { className: 'primary full' }));
  }
  const screen = h('div', { className: 'game-screen dungeon-screen' }, heading('1장 · 추락의 고층 빌딩', floor.name),
    h('section', { className: 'dungeon-route' }, path), card, back(onTown));
  const firstEntry = !Array.isArray(run.uiSeenFloors) || !run.uiSeenFloors.includes(run.floor);
  let dialogue;
  if (firstEntry || message) {
    const contents = Array.from(card.children);
    card.classList.add('has-message');
    dialogue = msgbox({ lines: [...(firstEntry ? [floor.enter] : []), ...(message ? [message] : [])], speaker: firstEntry ? floor.name : '탐험',
      onDone: () => {
        dialogue.dispose();
        if (firstEntry) onFloorSeen();
        card.replaceChildren(...contents);
        card.classList.remove('has-message');
        card.querySelector('button')?.focus({ preventScroll: true });
      } });
    card.replaceChildren(dialogue);
  }
  screen.dispose = () => dialogue?.dispose();
  return screen;
}
