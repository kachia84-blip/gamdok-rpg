import { h, button, heading } from '../dom.js';
import { ITEMS } from '../../core/items.js';
import { RELICS } from '../../core/run.js';

export function reward({ run, save, choices, onChoose }) {
  return h('section', {}, heading(`${run.day}일차 점검을 마치셨습니다`, '보상을 골라 주세요'),
    h('p', { className: 'trust' }, `신뢰도 ${run.trust}/100`),
    h('div', { className: 'choices reward-choices' }, choices.map(choice => {
      const item = choice.type === 'item' ? ITEMS[choice.id] : choice.type === 'relic' ? RELICS[choice.id] : null;
      const title = item ? `${item.emoji} ${item.name}` : '신뢰도 +30';
      const detail = choice.type === 'item' ? `장비 1개 · 보유 ${save.items[choice.id]}/3` :
        choice.type === 'relic' ? item.desc : '최대 100까지 회복합니다.';
      return button([h('strong', {}, title), h('small', {}, detail),
        choice.type === 'item' && save.items[choice.id] === 3 && h('small', { className: 'notice' }, '보유 한도에 도달하여 추가로 받으실 수 없습니다.')],
      () => onChoose(choice), { className: 'reward-card' });
    })), h('p', { className: 'muted' }, '런 특기는 이번 런에서만 유지됩니다. 장비와 메타 성장은 계속 남습니다.'));
}
