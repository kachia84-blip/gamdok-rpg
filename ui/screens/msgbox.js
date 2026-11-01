import { h, button } from './common.js';
import { reducedMotion } from '../fx.js';

// A self-contained queue: completing text and advancing are separate gestures.
export function msgbox({ lines = [], speaker = '', onDone = () => {} }) {
  const queue = lines.map(line => typeof line === 'string' ? { text: line } : line)
    .filter(line => typeof line?.text === 'string' && line.text.trim());
  let index = 0, count = 0, timer, disposed = false, finished = false, characters = [];
  const name = h('span', { className: 'msgbox-speaker' });
  const reserve = h('span', { className: 'msgbox-reserve', 'aria-hidden': true });
  const text = h('span', { className: 'msgbox-text', 'aria-hidden': true });
  const announcement = h('span', { className: 'msgbox-announcement', role: 'status', 'aria-live': 'polite', 'aria-atomic': true });
  const next = h('span', { className: 'msgbox-next', 'aria-hidden': true }, '▼');
  const copy = h('span', { className: 'msgbox-copy' }, reserve, text);
  const box = button('', advance, { className: 'rpg-msgbox', 'aria-label': '메시지 넘기기', dataset: { messageBox: '', typing: 'false' } });
  box.append(name, copy, announcement, next);

  function complete() {
    clearTimeout(timer);
    count = characters.length;
    text.textContent = characters.join('');
    box.dataset.typing = 'false';
  }
  function type() {
    if (disposed || finished) return;
    text.textContent = characters.slice(0, ++count).join('');
    if (count < characters.length) timer = setTimeout(type, 18);
    else box.dataset.typing = 'false';
  }
  function show() {
    clearTimeout(timer);
    const line = queue[index];
    box.dataset.index = String(index);
    next.hidden = index === queue.length - 1;
    box.title = index === queue.length - 1 ? '누르면 글 완성 · 다시 누르면 계속' : '누르면 글 완성 · 다시 누르면 다음';
    name.textContent = line.speaker ?? speaker;
    name.hidden = !name.textContent;
    reserve.textContent = line.text;
    text.className = `msgbox-text${line.className ? ' ' + line.className : ''}`;
    announcement.textContent = [name.textContent, line.text].filter(Boolean).join(' · ');
    copy.scrollTop = 0;
    characters = Array.from(line.text);
    count = 0;
    text.textContent = '';
    if (reducedMotion()) complete();
    else { box.dataset.typing = 'true'; timer = setTimeout(type, 18); }
  }
  function advance() {
    if (disposed || finished) return;
    if (count < characters.length) { complete(); return; }
    if (++index < queue.length) { show(); return; }
    finished = true;
    clearTimeout(timer);
    onDone();
  }
  box.dispose = () => { disposed = true; clearTimeout(timer); };
  if (queue.length) show();
  else { finished = true; box.hidden = true; queueMicrotask(() => { if (!disposed) onDone(); }); }
  return box;
}
