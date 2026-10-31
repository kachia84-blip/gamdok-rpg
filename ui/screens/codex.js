import { h, button, heading } from '../dom.js';
import { FIELDS } from '../../core/fields.js';
import { codexView } from '../../core/codex.js';

export function codex({ save, sites, articles, onArticle, onHome }) {
  const entries = codexView(save.codex, sites, articles);
  return h('section', {}, heading('모으신 조문을 확인해 주세요', `조문 도감 ${entries.filter(entry => entry.got).length}/${entries.length}`),
    FIELDS.map(field => {
      const cards = entries.filter(entry => entry.field === field.id);
      if (!cards.length) return null;
      return h('section', {}, h('h2', {}, `${field.emoji} ${field.name}`), cards.map(entry =>
        h('article', { className: `codex-card${entry.got ? '' : ' uncollected'}` },
          h('h3', {}, entry.got ? `${entry.no} · ${entry.title}` : '제??조 · 아직 못 만났습니다'),
          entry.got && button('원문', () => onArticle(entry.no), { className: 'secondary full' }))));
    }), button('사무실로', onHome, { className: 'primary full' }));
}
