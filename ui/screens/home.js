import { h, button, heading } from '../dom.js';
import { rankOf } from '../../core/score.js';
import { dueCards } from '../../core/review.js';
import { FIELDS, fieldLevel } from '../../core/fields.js';
import { ITEMS } from '../../core/items.js';
import { codexView } from '../../core/codex.js';

export function home({ save, sites, articles, onDispatch, onReview, onCodex }) {
  const rank = rankOf(save.xp);
  const due = dueCards(save.review, Date.now()).length;
  const entries = codexView(save.codex, sites, articles);
  return h('section', {}, heading('신입 감독관 RPG', '지청 사무실'),
    button('출동', onDispatch, { className: 'primary full dispatch' }),
    save.run && h('p', { className: 'muted' }, `${save.run.day}일차 기록부터 이어서 진행하실 수 있습니다.`),
    save.bestRun && h('p', { className: 'muted' }, `최고 기록 ${save.bestRun.days}일 · ${save.bestRun.score}점${save.bestRun.won ? ' · 5일 완주' : ''}`),
    h('div', { className: 'rank-card' }, h('p', { className: 'eyebrow' }, '오늘도 안전한 현장을 만들어 주세요.'),
      h('h2', {}, rank.name), h('p', {}, `${save.xp} XP`),
      h('progress', { max: 1, value: rank.progress, 'aria-label': '다음 계급까지의 경험치' }),
      h('small', {}, rank.next === null ? '최고 계급에 도달하셨습니다.' : `다음 계급까지 ${rank.next - save.xp} XP 남았습니다.`)),
    h('h2', {}, '분야 숙련도'),
    h('div', { className: 'field-list' }, FIELDS.filter(field => field.id !== 'etc' || save.fields.etc > 0).map(field => {
      const level = fieldLevel(save.fields[field.id]);
      return h('div', { className: 'field-row' }, h('span', {}, `${field.emoji} ${field.name}`),
        h('strong', {}, `Lv${level.level}`), h('progress', { max: 1, value: level.progress, 'aria-label': `${field.name} 숙련도 ${save.fields[field.id]}` }));
    })),
    h('h2', {}, '장비 가방'),
    h('div', { className: 'item-bag' }, Object.entries(ITEMS).map(([id, item]) => h('span', { title: item.desc, 'aria-label': `${item.name} ${save.items[id]}개` }, `${item.emoji}×${save.items[id]}`))),
    button(`조문 도감 ${entries.filter(entry => entry.got).length}/${entries.length}`, onCodex, { className: 'secondary full' }),
    button(`다시 풀기 · 오늘 ${due}개`, onReview, { className: 'secondary full' }),
    h('p', { className: 'muted' }, '현장과 사고 소식은 학습을 위한 가상 사례입니다. 진행 상황은 이 기기에 저장됩니다.'));
}
