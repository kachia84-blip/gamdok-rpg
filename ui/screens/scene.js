import { h, button, heading } from '../dom.js';
import { canMark } from '../../core/inspect.js';
import { ITEMS } from '../../core/items.js';

export function hotspotText(site, id) {
  for (const scene of site.scenes) for (const para of scene.paras) {
    for (const match of para.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)) if (match[1] === id) return match[2];
  }
  return id;
}

function paragraph(text, st, onMark) {
  const parts = [];
  let end = 0;
  for (const match of text.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)) {
    parts.push(text.slice(end, match.index));
    const [, id, label] = match;
    const marked = st.marks.includes(id);
    parts.push(h('span', {
      role: 'button', tabIndex: 0, className: `hotspot${marked ? ' marked' : ''}`,
      'aria-pressed': String(marked), 'aria-label': `${label}${marked ? ' · 지적 취소' : ' · 지적하기'}`,
      onclick: () => onMark(id), onkeydown: event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onMark(id); }
      },
    }, marked ? '📌 ' : '', label));
    if (st.revealed?.[id]) parts.push(h('small', { className: `measurement ${st.revealed[id] === 'fine' ? 'success' : 'error'}` },
      st.revealed[id] === 'fine' ? '기준 충족' : '기준 미달'));
    end = match.index + match[0].length;
  }
  parts.push(text.slice(end));
  return h('p', {}, parts);
}

export function scene({ site, st, save, run, onMark, onFinish, onItem, tapeArmed }) {
  const place = site.scenes[0];
  return h('section', { className: 'scene-screen' }, heading('현장 점검 중입니다', site.title),
    h('div', { className: 'site-intro' }, site.briefing.map(text => h('p', {}, text))),
    h('article', { className: 'scene-text', 'aria-label': place.name }, place.paras.map(p => paragraph(p, st, onMark))),
    tapeArmed && h('p', { role: 'status', className: 'notice' }, '기준을 잴 구절을 골라 주세요. 줄자를 다시 누르면 취소하실 수 있습니다.'),
    Object.hasOwn(st.checks ?? {}, place.id) && h('p', { role: 'status' }, `📋 이 장소의 위반은 ${st.checks[place.id]}개입니다.`),
    !canMark(st, site) && h('p', { role: 'status', className: 'notice' }, '지적 수가 가득 찼습니다. 기존 지적을 취소하면 더 표시하실 수 있습니다.'),
    h('div', { className: 'bottom-bar' },
      h('span', { className: 'trust', role: 'status' }, `신뢰도 ${run.trust}`),
      h('div', { className: 'equipment', role: 'group', 'aria-label': '점검 장비' }, ['tape', 'checklist', 'camera'].map(id => {
        const item = ITEMS[id];
        return button(`${item.emoji} ${save.items[id]}`, () => onItem(id), {
          disabled: save.items[id] === 0 || (id === 'checklist' && Object.hasOwn(st.checks ?? {}, place.id)),
          className: tapeArmed && id === 'tape' ? 'selected' : '', title: item.desc,
          'aria-label': `${item.name} ${save.items[id]}개`, ...(id === 'tape' ? { 'aria-pressed': String(tapeArmed) } : {}),
        });
      })),
      h('strong', { 'aria-live': 'polite' }, `지적 ${st.marks.length}/${site.violations.length + 1 + (st.extraMarks ?? 0)}`),
      button('점검 종료', onFinish, { className: 'primary' })));
}
