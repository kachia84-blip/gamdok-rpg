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

// Snapshot preserves the exact phrase, number and choices that were answered.
export function reviewProblem(card, sites = []) {
  if (card?.snapshot?.violation) return { v: card.snapshot.violation, text: card.snapshot.text };
  const site = sites.find(site => site.id === card?.siteId);
  const v = site?.violations.find(v => v.id === card.vid);
  if (!v) return null;
  for (const scene of site.scenes ?? []) for (const para of scene.paras) {
    for (const match of para.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)) if (match[1] === v.id) return { v, text: match[2] };
  }
  return { v, text: v.label };
}
