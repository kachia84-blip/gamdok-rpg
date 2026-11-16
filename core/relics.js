// 유물: 한 번의 탐험(run) 동안만 지니는 무작위 보상입니다.
export const RELICS = {
  thermos: { name: '🍵 보온병', desc: '전투에서 이길 때마다 HP 5 회복' },
  vest: { name: '🦺 형광 조끼', desc: '방어 +3', defense: 3 },
  loupe: { name: '🔍 돋보기', desc: '관찰력 +4', eye: 4 },
  megaphone: { name: '📣 확성기', desc: '설득력 +4', talk: 4 },
  memo: { name: '📌 조문 메모', desc: '법지식 +4', law: 4 },
  purse: { name: '💰 두둑한 지갑', desc: '전투 골드 1.5배' },
  clover: { name: '🍀 네잎클로버', desc: '아이템을 두 배 자주 줍습니다' },
  shield: { name: '🛡️ 안전 방패', desc: '전투마다 첫 반격을 막습니다' },
};
export const validRelics = list => Array.isArray(list) && list.length <= Object.keys(RELICS).length &&
  list.every(id => Object.hasOwn(RELICS, id)) && new Set(list).size === list.length;

function shuffled(rng, items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

// 층을 다 돌면 아직 없는 유물 3개를 내밉니다. 끝없는 탑은 홀수 층에서만, 일반 장은 1~5층에서만.
export function offerRelics(run, rng, endless = false) {
  if (run.step < run.events.length || run.relicFloor === run.floor || run.relicOffer?.length) return run;
  if (endless ? run.floor % 2 === 0 : run.floor >= 6) return run;
  const owned = run.relics ?? [];
  const rest = Object.keys(RELICS).filter(id => !owned.includes(id));
  if (!rest.length) return run;
  return { ...run, relicOffer: shuffled(rng, rest).slice(0, 3) };
}

export function chooseRelic(run, id) {
  if (!run.relicOffer?.includes(id)) return run;
  return { ...run, relics: [...(run.relics ?? []), id], relicOffer: null, relicFloor: run.floor };
}
