export const ITEMS = Object.freeze(Object.fromEntries(Object.entries({
  tape: { name: '줄자', emoji: '📏', desc: '구절 하나가 기준에 맞는지 미리 잽니다(위반인지 아닌지 알려 줌)', where: 'scene' },
  codebook: { name: '법전 수첩', emoji: '📖', desc: '원문을 한 번 감점 없이 봅니다', where: 'cite' },
  checklist: { name: '체크리스트', emoji: '📋', desc: '지금 장소의 위반 개수를 알려 줍니다', where: 'scene' },
  camera: { name: '카메라', emoji: '📷', desc: '이번 점검의 지적 칸이 1개 늘어납니다', where: 'scene' },
  senior: { name: '선배의 조언', emoji: '🧓', desc: '반박 보기 중 틀린 것 하나를 지웁니다(선택형만)', where: 'rebut' },
}).map(([id, item]) => [id, Object.freeze(item)])));

export function itemRewards(report, { firstToday = false, graduated = false } = {}, rng) {
  const count = (report?.grade === 'S' ? 2 : report?.grade === 'A' ? 1 : 0) + Number(firstToday) + Number(graduated);
  const ids = Object.keys(ITEMS);
  return Array.from({ length: count }, () => ids[Math.min(ids.length - 1, Math.max(0, Math.floor(rng() * ids.length)))]);
}

export function useItem(save, id) {
  if (!Object.hasOwn(ITEMS, id) || !(save.items[id] > 0)) return { save, ok: false };
  return { save: { ...save, items: { ...save.items, [id]: save.items[id] - 1 } }, ok: true };
}

export function grantItems(save, rewards) {
  const items = { ...save.items };
  const received = [];
  for (const id of rewards) {
    if (Object.hasOwn(ITEMS, id) && items[id] < 3) {
      items[id] += 1;
      received.push(id);
    }
  }
  return { save: { ...save, items }, received };
}
