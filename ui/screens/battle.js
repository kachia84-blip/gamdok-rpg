import { h, button, hpBar } from './common.js';
import { CONSUMABLES } from '../../core/shop.js';
import { ended } from '../../core/battle.js';
import { effectiveStats } from '../../core/hero.js';
import { citeLabel } from '../../core/reveal.js';
import { tauntOnly, shortClause, briefLog } from '../battle-text.js';

function highlighted(text, enabled) {
  if (!enabled) return text;
  return text.split(/(\d+(?:\.\d+)?)/g).map((part, index) => index % 2 ? h('mark', {}, part) : part);
}

export function battle({ state, monster, bagOpen, onBag, onAction, onContinue, onArticle, onExplain, articles, tutorial = false, animate = false, previous = null, entering = false }) {
  const { event, phase, effect } = state;
  const done = ended(state);
  const r = event.instance.violation?.rebuttal;
  const hit = animate && effect;
  const insight = animate && phase === 'won' && event.instance.kind === 'ok';
  const dialogue = phase === 'rebut' ? `${monster.hit} ${r.claim ?? ''}` : phase === 'won' ?
    (event.instance.kind === 'ok' ? monster.phantom : monster.defeat) : tauntOnly(monster.taunt);
  const section = h('div', { className: `battle-screen${hit?.target === 'hero' ? ' hero-hit' : ''}${hit?.critical ? ' critical-impact' : ''}${insight ? ' insight-success' : ''}` },
    h('section', { className: `monster-arena${event.boss ? ' boss-arena' : ''}${phase === 'won' ? ' defeated' : ''}${hit?.target === 'monster' ? ' monster-hit' : ''}${hit?.critical ? ' critical-hit' : ''}`, 'aria-label': '몬스터 무대' },
      h('header', { className: 'monster-heading' },
        h('p', { className: 'eyebrow' }, `${event.floor}층${event.boss ? ' · 보스' : event.revived ? ' · 되살아난 몬스터' : ''}`),
        h('h1', { tabIndex: -1 }, monster.name),
        h('p', { className: 'monster-title' }, `Lv${state.monster.lv}${monster.title ? ' · ' + monster.title : ''}`)),
      h('div', { className: 'monster-stage' },
        h('span', { className: 'monster-shadow', 'aria-hidden': true }),
        h('span', { className: `monster-sprite${entering && !done ? ' entering' : ''}`, 'aria-hidden': true },
          h('span', { className: 'monster-emoji' }, monster.emoji), h('span', { className: 'hit-flash' })),
        hit?.target === 'monster' && h('span', { className: 'slash-light', 'aria-hidden': true }),
        insight && h('span', { className: 'insight-wave', 'aria-hidden': true }),
        hit && h('span', { className: `damage-float ${effect.target}${effect.critical ? ' critical' : ''}`, role: 'status' }, `💥 ${effect.damage}${effect.critical ? ' 치명타' : ''}`)),
      hpBar(state.monster.hp, state.monster.maxHp, '몬스터 HP', previous?.monster.hp, previous?.monster.maxHp)),
    h('div', { className: 'speech-wrap' }, h('blockquote', { className: 'speech' }, dialogue)),
    h('section', { className: 'situation', 'aria-label': '현장 상황' },
      h('p', {}, '📋 ', highlighted(event.instance.text, state.weakness)),
      state.revealed !== null && h('p', { className: 'reveal' }, state.revealed ? '📏 환영입니다.' : '📏 진짜 위험입니다.')),
    h('div', { className: 'battle-messages' },
      h('section', { className: 'battle-log', 'aria-label': '전투 기록', 'aria-live': 'polite', role: 'log' },
        state.log.slice(-2).map(line => h('p', {}, briefLog(line)))),
      tutorial && h('aside', { className: 'tutorial', role: 'status' }, '🧓 기준을 어겼으면 ⚔️ 조문 베기, 기준에 맞으면 🔍 간파!')));

  // Exactly one dock occupies the same grid row in every phase.
  const dock = h('section', { className: 'battle-controls', 'aria-label': '전투 조작판', dataset: { phase: done ? 'result' : bagOpen ? 'bag' : phase } });
  if (done) {
    const reward = state.reward;
    dock.append(h('h2', { className: phase === 'won' ? 'victory-banner' : '' }, phase === 'won' ? '전투 승리!' : phase === 'lost' ? '숙직실로…' : '도망 성공'),
      h('div', { className: 'result-summary' },
        reward && h('p', {}, `경험치 +${reward.exp} · ${reward.gold}G${reward.drop ? ` · ${CONSUMABLES[reward.drop]?.name ?? ''} 획득` : ''}`),
        reward?.learned && h('p', { className: 'learned' }, `📜 ${shortClause(event.instance.article, event.instance.violation?.clauseNote)} '${articles[event.instance.article]?.title ?? '조문'}' 습득`),
        reward?.levels > 0 && h('p', { className: 'celebrate' }, `LEVEL UP! 레벨업! Lv${state.hero.lv} · 포인트 +${reward.levels * 3}`)),
      h('div', { className: 'result-links' },
        button('📖 원문 보기', () => onArticle(event.instance.article), { className: 'secondary' }),
        button('해설', onExplain, { className: 'secondary' })),
      button(phase === 'lost' ? '일어나기' : state.hero.points > 0 ? '능력치 배분' : '계속', onContinue, { className: 'primary full' }));
  } else if (bagOpen) {
    dock.append(h('h2', {}, '🎒 가방'), h('div', { className: 'choices' },
      Object.entries(CONSUMABLES).map(([id, item]) => button(`${item.name} ×${state.hero.bag[id] ?? 0}`, () => onAction({ type: 'item', id }), {
        disabled: !(state.hero.bag[id] > 0) || item.hp && state.hero.hp === state.hero.maxHp ||
          id === 'notebook' && (phase !== 'cite' || state.hiddenChoices.length > 0) || id === 'tape' && state.revealed !== null }))),
      h('p', { className: 'muted' }, '법전 수첩은 조문 보기에서 사용해 주세요.'),
      button('닫기', onBag, { className: 'secondary full' }));
  } else if (phase === 'cite') {
    dock.append(h('h2', {}, '어느 조문으로 베시겠습니까?'),
      h('div', { className: 'choices' }, event.choices.filter(value => !state.hiddenChoices.includes(value)).map(value =>
        button(citeLabel(value, articles, effectiveStats(state.hero).law, state.skills), () => onAction({ type: 'cite', value })))),
      h('div', { className: 'dock-tools' }, button('돌아가기', () => onAction({ type: 'cancel' }), { className: 'secondary' }),
        button('🎒 가방', onBag, { className: 'secondary', 'aria-expanded': false })));
  } else if (phase === 'rebut') {
    dock.append(h('h2', {}, `반박 · 남은 기회 ${2 - state.attempts}회`), h('p', {}, r.ask));
    if (r.type === 'pick') dock.append(h('div', { className: 'pick-choices' }, r.choices.map((choice, index) => button(choice, () => onAction({ type: 'rebut', value: index })))));
    else {
      const input = h('input', { id: 'rebut-answer', type: 'text', inputMode: 'decimal', autocomplete: 'off', required: true, placeholder: '숫자 입력' });
      dock.append(h('form', { onsubmit: e => { e.preventDefault(); if (input.value.trim()) onAction({ type: 'rebut', value: input.value }); } },
        h('label', { htmlFor: 'rebut-answer' }, `기준값 (${r.unit ?? '숫자'})`),
        h('div', { className: 'input-row' }, input, h('button', { type: 'submit', className: 'primary' }, '반박'))));
    }
    dock.append(button('🎒 가방', onBag, { className: 'secondary full', 'aria-expanded': false }));
  } else {
    dock.append(h('nav', { className: 'battle-actions', 'aria-label': '전투 행동' },
      button('⚔️ 조문 베기', () => onAction({ type: 'slash' }), { className: 'action-slash' }),
      button('🔍 간파', () => onAction({ type: 'insight' }), { className: 'action-insight' }),
      button('🎒 가방', onBag, { className: 'action-bag', 'aria-expanded': false }),
      button('🏃 도망', () => onAction({ type: 'flee' }), { className: 'action-flee' })));
  }
  section.append(dock);
  return section;
}
