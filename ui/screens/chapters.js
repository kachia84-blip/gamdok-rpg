import { h, button } from './common.js';

// 출발 층 고르기: 보스를 잡은 곳 다음 층에서 다시 시작할 수 있습니다.
export function chapters({ starts = [1], best = 0, onSelect, onClose }) {
  const close = button('닫기', onClose, { className: 'secondary full' });
  return h('section', { className: 'chapters-panel panel', role: 'dialog', 'aria-modal': true, 'aria-label': '출발 층 고르기',
    onkeydown: event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const buttons = Array.from(event.currentTarget.querySelectorAll('button')).filter(item => !item.disabled);
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    } }, h('h2', {}, `어디서부터 내려갈까요?${best ? ` · 최고 ${best}층` : ''}`), starts.map(floor => button(
      floor === 1 ? '1층부터 · 처음부터 차근차근' : `${floor}층부터 · 지름길`,
      () => onSelect(floor), { className: 'full' })), close);
}
