export const CHAPTERS = [
  { id: 1, name: '추락의 고층 빌딩', fields: ['fall', 'ppe'], power: 0 },
  { id: 2, name: '질식의 밀폐 맨홀', fields: ['confined', 'ground'], power: 5 },
  { id: 3, name: '협착과 감전의 기계공장', fields: ['machine', 'lift', 'elec'], power: 10, dlc: true },
];
// 끝없는 탑: 모든 분야가 섞여 나오고 층 제한이 없습니다. 3장을 클리어하면 열립니다.
export const TOWER = { id: 4, name: '끝없는 합동점검', fields: [...CHAPTERS.flatMap(chapter => chapter.fields), 'etc'], power: 15, endless: true };
export const AREAS = [...CHAPTERS, TOWER];

export const getChapter = id => AREAS.find(chapter => chapter.id === id) ?? CHAPTERS[0];
export const chapterCards = (cards, id) => cards.filter(card => getChapter(id).fields.includes(card.field));
export const unlockedChapters = (cleared = []) => AREAS.filter(chapter => chapter.id === 1 || cleared.includes(chapter.id - 1));
