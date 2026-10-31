import { h, button, heading } from '../dom.js';
import { cite } from './cite.js';
import { rebut } from './rebut.js';
import { reviewProblem } from '../../core/review.js';

export function review({ cards, sites, articles, onAnswer, onNext, onHome, onArticle, hasAnswer, value, completed }) {
  const card = cards[0];
  if (!card) return h('section', {}, heading('오답 노트입니다', '오늘 볼 오답이 없습니다'),
    h('p', {}, completed ? `${completed}개를 복습하셨습니다. 다음 복습일에 다시 만나 주세요.` : '현장 점검을 마치고 다시 찾아와 주세요.'),
    button('사무실로', onHome, { className: 'primary full' }));
  const problem = reviewProblem(card, sites);
  const v = problem?.v;
  if (!v) return h('section', {}, heading('오답 노트입니다', '문제 데이터를 찾을 수 없습니다'),
    button('건너뛰기', onNext, { className: 'primary full' }), button('사무실로', onHome));
  const props = { v, step: card.step, quote: problem.text, articles, hasAnswer, value, onAnswer, onNext, onArticle, reviewMode: true };
  return h('section', {}, h('p', { className: 'eyebrow' }, `${v.label} · ${card.box}번 상자 · 남은 문제 ${cards.length}개`),
    card.step === 'rebut' ? rebut(props) : cite(props), button('사무실로', onHome, { className: 'secondary full' }));
}
