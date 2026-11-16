export const CHAPTERS = [
  { id: 1, name: '추락의 고층 빌딩', fields: ['fall', 'ppe'], power: 0 },
  { id: 2, name: '질식의 밀폐 맨홀', fields: ['confined', 'ground'], power: 5 },
  { id: 3, name: '협착과 감전의 기계공장', fields: ['machine', 'lift', 'elec'], power: 10, dlc: true },
];
// 하나로 합친 던전: 모든 분야가 섞여 나오고 층 제한이 없습니다. 층마다 현장(site 1~3)이 무작위로 바뀝니다.
// 6·12·18층에 1·2·3장 보스가 나오고, 그 뒤로는 6층마다 문지기가 나옵니다.
export const TOWER = { id: 4, name: '뒤섞인 현장', fields: [...CHAPTERS.flatMap(chapter => chapter.fields), 'etc'], power: 0, endless: true };
export const BOSS_EVERY = 6;
// 보스를 잡은 곳 바로 다음 층에서 다시 출발할 수 있습니다(지름길).
export const startFloors = (cleared = []) => [1, ...CHAPTERS.filter(chapter => cleared.includes(chapter.id)).map(chapter => chapter.id * BOSS_EVERY + 1)];
export const AREAS = [...CHAPTERS, TOWER];

export const getChapter = id => AREAS.find(chapter => chapter.id === id) ?? CHAPTERS[0];
export const chapterCards = (cards, id) => cards.filter(card => getChapter(id).fields.includes(card.field));
export const unlockedChapters = (cleared = []) => AREAS.filter(chapter => chapter.id === 1 || cleared.includes(chapter.id - 1));
