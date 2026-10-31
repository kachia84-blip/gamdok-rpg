import { h, button, heading, panel, hpBar } from './common.js';
import { CONSUMABLES } from '../../core/shop.js';
import { ended } from '../../core/battle.js';

function highlighted(text, enabled) {
  if (!enabled) return text;
  return text.split(/(\d+(?:\.\d+)?)/g).map((part, index) => index % 2 ? h('mark', {}, part) : part);
}

export function battle({ state, monster, bagOpen, onBag, onAction, onContinue, onArticle, articles, animate = false }) {
  const { event, phase, effect } = state;
  const done = ended(state);
  const r = event.instance.violation?.rebuttal;
  const dialogue = phase === 'rebut' ? `${monster.hit} ${r.claim ?? ''}` : phase === 'won' ?
    (event.instance.kind === 'ok' ? monster.phantom : monster.defeat) : monster.taunt.replaceAll('{situation}', event.instance.text);
  const section = h('div', { className: `battle-screen${animate && effect ? ' shake' : ''}` },
    heading(`${event.floor}층${event.boss ? ' · 보스' : event.revived ? ' · 되살아난 몬스터' : ''}`, monster.name),
    panel(h('div', { className: `monster-stage${phase === 'won' ? ' defeated' : ''}` },
      h('span', { className: 'monster-emoji', 'aria-hidden': true }, monster.emoji),
      animate && effect && h('span', { className: `damage-float ${effect.target}`, role: 'status' }, `💥 ${effect.damage}${effect.critical ? ' 치명타' : ''}`)),
      h('p', { className: 'monster-title' }, `Lv${state.monster.lv}${monster.title ? ' · ' + monster.title : ''}`),
      hpBar(state.monster.hp, state.monster.maxHp, '몬스터 HP')),
    h('blockquote', { className: 'speech' }, highlighted(dialogue, state.weakness)),
    phase === 'rebut' && h('p', { className: 'situation' }, highlighted(event.instance.text, state.weakness)),
    state.revealed !== null && h('p', { className: 'reveal' }, state.revealed ? '📏 환영입니다.' : '📏 진짜 위험입니다.'),
    h('section', { className: 'battle-log', 'aria-label': '전투 기록', 'aria-live': 'polite', role: 'log' }, state.log.slice(-4).map(line => h('p', {}, line))));

  if (phase === 'cite' && !bagOpen) section.append(panel(h('h2', {}, '어느 조문으로 베시겠습니까?'),
    h('div', { className: 'choices' }, event.choices.filter(value => !state.hiddenChoices.includes(value)).map(value => button(value, () => onAction({ type: 'cite', value })))),
    button('돌아가기', () => onAction({ type: 'cancel' }), { className: 'secondary full' })));
  if (phase === 'rebut' && !bagOpen) {
    const answer = panel(h('h2', {}, '반박'), h('p', {}, r.ask), h('p', { className: 'muted' }, `남은 기회 ${2 - state.attempts}회`));
    if (r.type === 'pick') answer.append(h('div', { className: 'pick-choices' }, r.choices.map((choice, index) => button(choice, () => onAction({ type: 'rebut', value: index })))));
    else {
      const input = h('input', { id: 'rebut-answer', type: 'text', inputMode: 'decimal', autocomplete: 'off', required: true, placeholder: '숫자 입력' });
      const form = h('form', { onsubmit: e => { e.preventDefault(); if (input.value.trim()) onAction({ type: 'rebut', value: input.value }); } },
        h('label', { htmlFor: 'rebut-answer' }, `기준값 (${r.unit ?? '숫자'})`), h('div', { className: 'input-row' }, input, h('button', { type: 'submit', className: 'primary' }, '반박')));
      answer.append(form);
    }
    section.append(answer);
  }
  if (bagOpen && !done) section.append(panel(h('h2', {}, '🎒 가방'),
    Object.entries(CONSUMABLES).map(([id, item]) => button(`${item.name} ×${state.hero.bag[id] ?? 0}`, () => onAction({ type: 'item', id }), {
      className: 'full', disabled: !(state.hero.bag[id] > 0) || item.hp && state.hero.hp === state.hero.maxHp ||
        id === 'notebook' && (phase !== 'cite' || state.hiddenChoices.length > 0) || id === 'tape' && state.revealed !== null })),
    h('p', { className: 'muted' }, '법전 수첩은 조문 보기에서 사용해 주세요.'), button('닫기', onBag, { className: 'secondary full' })));
  if (done) section.append(panel(
    h('h2', {}, phase === 'won' ? '전투 승리!' : phase === 'lost' ? '숙직실로…' : '도망 성공'),
    phase === 'won' && event.instance.kind === 'ok' && h('p', {}, event.instance.why),
    phase === 'won' && state.reward?.learned && h('p', { className: 'learned' }, `📜 ${event.instance.article} '${articles[event.instance.article]?.title ?? '조문'}' 습득`),
    state.reward?.levels > 0 && h('p', { className: 'celebrate' }, `레벨업! Lv${state.hero.lv} · 축하드립니다!`),
    button('📖 원문 보기', () => onArticle(event.instance.article), { className: 'secondary full' }),
    button(phase === 'lost' ? '일어나기' : state.hero.points > 0 ? '능력치 배분' : '계속', onContinue, { className: 'primary full' })));
  if (!done) section.append(h('nav', { className: 'battle-actions', 'aria-label': '전투 행동' },
    button('⚔️ 조문 베기', () => onAction({ type: 'slash' }), { disabled: phase !== 'action' }),
    button('🔍 간파', () => onAction({ type: 'insight' }), { disabled: phase !== 'action' }),
    button('🎒 가방', onBag, { disabled: done, 'aria-expanded': bagOpen }),
    button('🏃 도망', () => onAction({ type: 'flee' }), { disabled: phase !== 'action' })));
  return section;
}
