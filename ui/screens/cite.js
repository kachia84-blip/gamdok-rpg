import { h, button, heading, lawLabel } from '../dom.js';
import { judgeCite, judgeLaw } from '../../core/judge.js';
import { FIELDS, fieldOf, fieldLevel, peekFree } from '../../core/fields.js';

export function cite({ v, step, quote, articles, save, st, hasAnswer, value, onAnswer, onNext, onArticle, onItem, reviewMode = false }) {
  const isCite = step === 'cite';
  const correct = hasAnswer && (isCite ? judgeCite(v, value) : judgeLaw(v, value));
  const title = articles[v.article]?.title ?? '조문 원문을 확인해 주세요';
  const field = FIELDS.find(field => field.id === fieldOf(v.article));
  const specialty = !reviewMode && peekFree(save, v.article);
  const free = specialty || st?.freePeek;
  const paidPeek = st?.answers[v.id]?.peek && !st.answers[v.id].peekFree;
  const bookPeek = !free && st?.answers[v.id]?.peekFree;
  return h('section', {}, heading(reviewMode ? '오답 노트입니다' : '지적 근거를 확인해 주세요', isCite ? '어떤 조문에 해당할까요?' : '법 근거를 골라 주세요'),
    h('p', { className: 'quote' }, `지적: ${quote}`),
    isCite && !reviewMode && specialty && h('p', { className: 'specialty' }, `🎖️ ${field.name} Lv${fieldLevel(save.fields[field.id]).level} 특기: 원문 감점 없음`),
    isCite && !hasAnswer && !reviewMode && h('p', { className: free ? 'specialty' : 'notice' }, free ? '원문을 감점 없이 보실 수 있습니다.' : bookPeek ? '다음 원문부터 조문 점수가 절반이 됩니다.' : '원문을 열면 조문 점수가 절반이 됩니다.'),
    isCite && !hasAnswer && !reviewMode && button(`📖 ${save.items.codebook}`, () => onItem('codebook'), {
      disabled: save.items.codebook === 0 || free || paidPeek,
      className: 'secondary', 'aria-label': `법전 수첩 ${save.items.codebook}개`,
    }),
    isCite ? h('div', { className: 'choices' }, v.citeChoices.map(no => h('div', { className: 'choice-row' },
      button(no, () => onAnswer(no), { disabled: hasAnswer, className: value === no ? 'selected choice' : 'choice' }),
      button('원문', () => onArticle(no), { className: 'secondary', 'aria-label': `${no} 원문 보기` }))))
      : h('div', { className: 'choices' }, ['38', '39'].map(basis => button(lawLabel(basis), () => onAnswer(basis), { disabled: hasAnswer, className: value === basis ? 'selected' : '' }))),
    hasAnswer && h('div', { className: `feedback ${correct ? 'success' : 'error'}`, role: 'status' },
      h('strong', {}, correct ? '맞히셨습니다.' : '다시 확인해 주세요.'),
      h('p', {}, isCite ? `정답은 ${v.article}(${title}) ${v.clauseNote ?? ''}입니다.` : `정답은 ${lawLabel(v.lawBasis)}입니다.`),
      button('다음', onNext, { className: 'primary full', dataset: { next: 'true' } })));
}
