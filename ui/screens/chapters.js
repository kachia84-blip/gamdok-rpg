import { h, button } from './common.js';
import { CHAPTERS, unlockedChapters } from '../../core/chapters.js';

export function chapters({ cleared = [], onSelect, onClose }) {
  const open = unlockedChapters(cleared).map(chapter => chapter.id);
  const close = button('닫기', onClose, { className: 'secondary full' });
  return h('section', { className: 'chapters-panel panel', role: 'dialog', 'aria-modal': true, 'aria-label': '장 고르기',
    onkeydown: event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const buttons = Array.from(event.currentTarget.querySelectorAll('button')).filter(item => !item.disabled);
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    } }, h('h2', {}, '장 고르기'), CHAPTERS.map(chapter => button(
      `${cleared.includes(chapter.id) ? '✅ ' : ''}${chapter.id}장 ${chapter.name}${chapter.dlc ? ' · DLC' : ''}${open.includes(chapter.id) ? '' : ` · 🔒 ${chapter.id - 1}장 클리어 후`}`,
      () => onSelect(chapter.id), { className: 'full', disabled: !open.includes(chapter.id) })), close);
}
