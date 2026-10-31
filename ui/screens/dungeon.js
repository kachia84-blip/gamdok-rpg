import { h, button, heading, panel, paragraphs, back } from './common.js';
export function dungeon({ run, story, onEvent, onNext, onTown, message }) {
  const floor = story.floors[run.floor - 1];
  const event = run.events[run.step];
  const done = !event;
  const names = { battle: '몬스터', chest: '보물상자', rest: '쉼터', npc: '떠돌이 감독관' };
  return h('div', {}, heading('1장 · 추락의 고층 빌딩', floor.name),
    panel(h('div', { className: 'floor-art', 'aria-hidden': true }, '🔦'), h('p', {}, floor.enter),
      h('ol', { className: 'event-path' }, run.events.map((item, index) => h('li', { className: index < run.step ? 'done' : index === run.step ? 'current' : '' },
        `${index + 1}. ${item.boss ? '보스' : names[item.type]}${index < run.step ? ' · 완료' : ''}`)))),
    message && panel(h('p', { role: 'status' }, message)),
    done ? panel(h('h2', {}, '이 층을 돌파하셨습니다!'), h('p', {}, '계속 탐험하거나 마을로 돌아가실 수 있습니다.'),
      run.floor < 6 && button('다음 층', onNext, { className: 'primary full' })) :
      panel(h('h2', {}, event.boss ? '마지막 문 앞' : names[event.type]),
        event.type === 'battle' ? h('p', {}, event.revived ? '되살아난 몬스터가 길을 막습니다. 다시 맞서 주세요.' : '수상한 인기척이 들립니다. 준비해 주세요.') :
          paragraphs(event.type === 'npc' ? [story.events.npc[0]?.line ?? '이 상황에 맞는 조문을 골라 주세요.'] : story.events[event.type]),
        button(event.type === 'battle' ? '맞서기' : '살펴보기', onEvent, { className: 'primary full' })),
    back(onTown));
}
