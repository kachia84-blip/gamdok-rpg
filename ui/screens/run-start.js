import { h, button, heading } from '../dom.js';

export function runStart({ run, onStart }) {
  return h('section', {}, heading('무작위 현장으로 출동합니다', '5일간의 감독'),
    h('div', { className: 'paper' }, h('h2', {}, '신뢰도 100'),
      h('p', {}, '하루 한 현장을 점검하며 5일차 기획감독에 도전해 주세요.'),
      h('p', {}, '현장을 마칠 때마다 보상 하나를 고르실 수 있습니다. 신뢰도가 0이 되면 런이 종료됩니다.'),
      h('p', { className: 'muted' }, `시드 ${run.seed}`)),
    button('현장 진입', onStart, { className: 'primary full' }));
}
