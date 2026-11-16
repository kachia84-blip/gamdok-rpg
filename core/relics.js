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
  whistle: { name: '📯 호루라기', desc: '도망이 반드시 성공합니다' },
  battery: { name: '🔋 보조 배터리', desc: '다음 층으로 갈 때마다 HP 10 회복' },
  glasses: { name: '👓 도수 안경', desc: '약점 수치가 항상 눈에 띕니다' },
  stamp: { name: '💮 합격 도장', desc: '전투 경험치 1.3배' },
  candle: { name: '🕯️ 촛불', desc: '환영을 간파하면 30G' },
  magnet: { name: '🧲 자석', desc: '보물상자와 퀴즈 골드 2배' },
  // 양날 유물: 좋은 점과 나쁜 점이 함께 옵니다.
  dice: { name: '🎲 주사위', desc: '전투 골드 2배, 대신 받는 피해 1.3배' },
  hourglass: { name: '⏳ 모래시계', desc: '경험치 1.5배, 대신 도망칠 수 없습니다' },
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

// 제단처럼 층 도중에 내미는 유물. 남은 유물이 없으면 그대로 돌려줍니다.
export function forceOffer(run, rng) {
  const rest = Object.keys(RELICS).filter(id => !(run.relics ?? []).includes(id));
  return rest.length ? { ...run, relicOffer: shuffled(rng, rest).slice(0, 3) } : run;
}

// 떠돌이 상인: 아직 없는 유물 하나를 골드로 팝니다. 남은 유물이 없으면 null.
export function merchantStock(run, rng) {
  const rest = Object.keys(RELICS).filter(id => !(run.relics ?? []).includes(id));
  return rest.length ? shuffled(rng, rest)[0] : null;
}
export const merchantPrice = event => 30 + event.gold * 3;
export const healPrice = event => Math.round(merchantPrice(event) / 2);

export function chooseRelic(run, id) {
  if (!run.relicOffer?.includes(id)) return run;
  // 층 도중(제단)에 고른 유물은 층 끝 보상을 막지 않습니다.
  const midFloor = run.step < run.events.length;
  return { ...run, relics: [...(run.relics ?? []), id], relicOffer: null, ...(midFloor ? {} : { relicFloor: run.floor }) };
}
