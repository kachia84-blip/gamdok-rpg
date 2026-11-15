export const CHAPTERS = [
  { id: 1, name: '추락의 고층 빌딩', fields: ['fall', 'ppe'], power: 0 },
  { id: 2, name: '질식의 밀폐 맨홀', fields: ['confined', 'ground'], power: 5 },
  { id: 3, name: '협착과 감전의 기계공장', fields: ['machine', 'lift', 'elec'], power: 10, dlc: true },
];

export const getChapter = id => CHAPTERS.find(chapter => chapter.id === id) ?? CHAPTERS[0];
export const chapterCards = (cards, id) => cards.filter(card => getChapter(id).fields.includes(card.field));
export const unlockedChapters = (cleared = []) => CHAPTERS.filter(chapter => chapter.id === 1 || cleared.includes(chapter.id - 1));
