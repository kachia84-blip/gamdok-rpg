import { h, button, heading } from '../dom.js';
import { judgeRebut } from '../../core/judge.js';

export function rebut({ v, quote, save, st, hasAnswer, value, onAnswer, onNext, onItem, reviewMode = false }) {
  const r = v.rebuttal;
  const correct = hasAnswer && judgeRebut(v, value);
  const input = h('input', { id: 'rebut-number', type: 'text', inputMode: 'decimal', autocomplete: 'off', required: true, disabled: hasAnswer, value: hasAnswer ? value : '', 'aria-describedby': 'number-hint' });
  const operators = { '>=': '이상', '<=': '이하', '<': '미만', '==': '' };
  return h('section', {}, heading(reviewMode ? '오답 노트입니다' : '현장의 반박에 답해 주세요', '근거로 설득해 주세요'),
    h('p', { className: 'quote' }, `지적: ${quote}`),
    h('div', { className: 'speech' }, h('strong', {}, r.speaker), h('p', {}, r.claim)),
    h('h2', {}, r.ask),
    r.type === 'pick' && !hasAnswer && !reviewMode && button(`🧓 ${save.items.senior}`, () => onItem('senior'), {
      disabled: save.items.senior === 0 || (st.removed?.[v.id]?.length ?? 0) >= r.choices.length - 1,
      className: 'secondary', 'aria-label': `선배의 조언 ${save.items.senior}개`,
    }),
    r.type === 'num' ? h('form', { onsubmit: event => { event.preventDefault(); if (!hasAnswer && input.value.trim()) onAnswer(input.value); } },
      h('label', { htmlFor: 'rebut-number' }, '기준 숫자를 입력해 주세요'),
      h('div', { className: 'number-row' }, input, h('span', {}, `${r.unit ?? ''} ${operators[r.op] ?? ''}`)),
      h('small', { id: 'number-hint' }, '범위의 기준이 되는 숫자를 정확히 입력해 주세요.'),
      h('button', { type: 'submit', className: 'primary full', disabled: hasAnswer }, '반박'))
      : h('div', { className: 'choices' }, r.choices.map((choice, index) => st?.removed?.[v.id]?.includes(index) ? null : button(choice, () => onAnswer(index), { disabled: hasAnswer, className: value === index ? 'selected' : '' }))),
    hasAnswer && h('div', { className: `feedback ${correct ? 'success' : 'error'}`, role: 'status' },
      h('strong', {}, correct ? '설득에 성공하셨습니다.' : '근거를 다시 확인해 주세요.'),
      h('p', {}, `정답: ${r.type === 'num' ? `${r.answer}${r.unit ?? ''} ${operators[r.op] ?? ''}` : r.choices[r.answer]}`),
      h('p', {}, r.explain), button('다음', onNext, { className: 'primary full', dataset: { next: 'true' } })));
}
