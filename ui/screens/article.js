import { h, button } from '../dom.js';

export function article({ articleNo, articles }) {
  const item = articles[articleNo];
  const previousFocus = document.activeElement;
  const dialog = h('dialog', { className: 'article-sheet', 'aria-labelledby': 'article-title' });
  dialog.append(h('div', { className: 'sheet-header' }, h('h2', { id: 'article-title' }, `${articleNo} · ${item?.title ?? '조문 원문'}`),
    button('닫기', () => dialog.close(), { className: 'secondary', autofocus: true })),
  h('p', { className: 'eyebrow' }, '산업안전보건기준에 관한 규칙'),
  h('div', { className: 'article-text' }, item?.text ?? '원문 데이터가 없습니다. 잠시 뒤 다시 확인해 주세요.'));
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientY < bounds.top || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY > bounds.bottom) dialog.close();
  } });
  dialog.addEventListener('close', () => { dialog.remove(); previousFocus?.focus(); });
  return dialog;
}
