// 오늘의 의뢰: 날짜마다 하나씩 정해지는 작은 목표입니다. 끝내면 골드를 받습니다.
export const QUESTS = [
  { id: 'wins', text: '전투 5번 승리', goal: 5, gold: 80 },
  { id: 'phantoms', text: '환영 3번 간파', goal: 3, gold: 80 },
  { id: 'floors', text: '3개 층 돌파', goal: 3, gold: 100 },
  { id: 'combo', text: '4연속 승리', goal: 4, gold: 100 },
];
const pad = n => String(n).padStart(2, '0');
export const todayKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const validDay = key => typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key);

export function questFor(key) {
  let sum = 0;
  for (const ch of key) sum = (sum * 31 + ch.charCodeAt(0)) % 9973;
  return QUESTS[sum % QUESTS.length];
}

// 날짜가 바뀌면 새 의뢰로 갈아 끼웁니다.
export function dailyState(daily, key) {
  return daily?.date === key ? daily : { date: key, progress: 0, done: false };
}

// type이 오늘 의뢰와 맞으면 진행도를 올립니다. combo는 지금까지의 최고 연속 수를 그대로 받습니다.
export function progressQuest(daily, key, type, value = 1) {
  const state = dailyState(daily, key), quest = questFor(key);
  if (state.done || quest.id !== type) return { daily: state, gold: 0, quest };
  const progress = Math.min(quest.goal, type === 'combo' ? Math.max(state.progress, value) : state.progress + value);
  const done = progress >= quest.goal;
  return { daily: { date: key, progress, done }, gold: done ? quest.gold : 0, quest };
}
