import { h, button, heading, panel, paragraphs } from './common.js';
export function story({ title, lines, teaser, onDone }) {
  return h('div', { className: `story-screen${teaser ? ' chapter-victory' : ''}` }, heading('감독관 RPG', title),
    panel(h('div', { className: 'story-art', 'aria-hidden': true }, '📜'), ...paragraphs(lines)),
    teaser && panel(h('h2', {}, '2장 예고'), ...paragraphs(teaser)),
    button('지청으로', onDone, { className: 'primary full' }));
}
