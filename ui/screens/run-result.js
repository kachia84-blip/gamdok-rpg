import { h, button, heading } from '../dom.js';
import { runSummary } from '../../core/run.js';

export function runResult({ run, save, onHome }) {
  const result = runSummary(run);
  return h('section', {}, heading(result.won ? '5일을 완주하셨습니다' : '이번 출동을 마치셨습니다', result.won ? '기획감독 완료' : '런 종료'),
    h('article', { className: 'paper' }, h('h2', {}, `${result.days}일 · ${result.score}점`),
      h('p', {}, `받은 XP ${result.xp}`),
      h('p', {}, `최고 기록 ${save.bestRun?.days ?? result.days}일 · ${save.bestRun?.score ?? result.score}점`),
      h('p', {}, '숙련도·장비·도감·오답 노트는 다음 출동에도 이어집니다.')),
    button('사무실로', onHome, { className: 'primary full' }));
}
