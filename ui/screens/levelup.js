import { h, button, heading, panel } from './common.js';
export function levelup({ hero, onAllocate, onDone }) {
  return h('div', { className: 'levelup-screen' }, heading('성장', '레벨업!'), panel(h('p', { className: 'levelup-banner' }, 'LEVEL UP!'), h('p', { className: 'celebrate' }, `Lv${hero.lv} · 축하드립니다!`),
    h('p', {}, `최대 HP ${hero.maxHp} · 남은 포인트 ${hero.points}`),
    [['law', '법지식', '조문 베기 피해'], ['eye', '관찰력', '약점 발견·도망 확률'], ['talk', '설득력', '반박 치명타·골드 보너스']].map(([key, name, detail]) =>
      h('div', { className: 'stat-row' }, h('div', {}, h('strong', {}, `${name} ${hero.stats[key]}`), h('small', {}, detail)),
        button('+1', () => onAllocate(key), { disabled: hero.points < 1, 'aria-label': `${name} 1 올리기` })))),
    button('완료', onDone, { className: 'primary full', disabled: hero.points > 0 }));
}
