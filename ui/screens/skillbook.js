import { h, button, heading, panel, back } from './common.js';
export function skillbook({ skills, articles, onArticle, onTown }) {
  return h('div', {}, heading('습득한 조문', '📜 스킬북'), h('p', {}, '습득한 조문으로 베면 공격력이 20% 오릅니다.'),
    !skills.length && panel(h('p', {}, '몬스터에게 조문을 맞히고 반박으로 이기시면 스킬을 얻으실 수 있습니다.')),
    skills.map(no => panel(h('h2', {}, `${no} · ${articles[no]?.title ?? '조문'}`),
      h('details', {}, h('summary', {}, '원문 펼치기'), h('p', { className: 'article-text' }, articles[no]?.text ?? '원문을 불러오지 못했습니다.')),
      button('📖 원문 보기', () => onArticle(no), { className: 'secondary full' }))), back(onTown));
}
