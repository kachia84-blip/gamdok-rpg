import { h, button, heading, panel, paragraphs, back } from './common.js';
export function senior({ story, seen, onRead, onTown, onPrologue }) {
  const talks = story.town.senior.length ? story.town.senior : [{ id: 'hint', lines: ['🧓 조문을 맞히면 몬스터가 버팁니다. 반박으로 마무리해 주세요.', '환영은 간파로 사라집니다. 자신이 없으면 줄자를 사용해 주세요.', '관찰력은 약점 발견과 도망을 돕습니다. 층을 돌파한 뒤 귀환하셔도 성장은 남습니다.'] }];
  return h('div', {}, heading('지청', '🧓 선배 감독관'), ...talks.map(talk => panel(
    h('h2', {}, seen.includes(talk.id) ? '다시 듣는 이야기' : '선배의 이야기'), ...paragraphs(talk.lines),
    !seen.includes(talk.id) && button('기억하기', () => onRead(talk.id)))),
    button('처음 이야기', onPrologue, { className: 'secondary full' }), back(onTown));
}
