import { h, button, heading, panel } from './common.js';
import { JOBS } from '../../core/jobs.js';

export function job({ onChoose }) {
  return h('div', { className: 'job-screen' }, heading('성장', '전문 분야 고르기'),
    panel(h('p', {}, 'Lv5가 되셨습니다. 한 번 고르면 바꿀 수 없습니다.'),
      Object.entries(JOBS).map(([id, item]) => h('div', { className: 'stat-row' },
        h('div', {}, h('strong', {}, item.name), h('small', {}, item.desc)),
        button('선택', () => onChoose(id), { 'aria-label': `${item.name} 선택` })))));
}
