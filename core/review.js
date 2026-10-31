const DAY = 86400000;
const INTERVALS = [0, 1, 2, 4, 8, 16];

export function addWrong(list, card, now) {
  const reset = { ...card, box: 1, due: now };
  return list.some(item => item.key === card.key)
    ? list.map(item => item.key === card.key ? reset : { ...item })
    : [...list.map(item => ({ ...item })), reset];
}

export function markReview(list, key, correct, now) {
  return list.flatMap(card => {
    if (card.key !== key) return [{ ...card }];
    if (correct && card.box === 5) return [];
    const box = correct ? Math.min(5, card.box + 1) : 1;
    return [{ ...card, box, due: correct ? now + INTERVALS[box] * DAY : now }];
  });
}

export function dueCards(list, now) {
  return list.filter(card => card.due <= now).map(card => ({ ...card }));
}
