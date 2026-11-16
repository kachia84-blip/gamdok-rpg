// 훈장: 기록을 세우면 골드를 받습니다. 판정은 저장 자료만 봅니다.
export const MEDALS = [
  { id: 'first_win', name: '첫 승리', hint: '전투 1승', gold: 20, test: s => s.stats.wins >= 1 },
  { id: 'combo5', name: '거침없는 점검', hint: '5연속 승리', gold: 100, test: s => s.stats.maxCombo >= 5 },
  { id: 'phantom10', name: '환영 사냥꾼', hint: '환영 10번 간파', gold: 100, test: s => s.stats.phantoms >= 10 },
  { id: 'wins50', name: '현장의 단골', hint: '전투 50승', gold: 200, test: s => s.stats.wins >= 50 },
  { id: 'skills20', name: '걸어 다니는 법전', hint: '조문 20개 습득', gold: 200, test: s => s.skills.length >= 20 },
  { id: 'combo10', name: '무결점 감독관', hint: '10연속 승리', gold: 300, test: s => s.stats.maxCombo >= 10 },
  { id: 'clear3', name: '세 현장의 해결사', hint: '1~3장 모두 클리어', gold: 500, test: s => [1, 2, 3].every(n => s.cleared.includes(n)) },
  { id: 'dex30', name: '현장 백과', hint: '도감 30종 채우기', gold: 300, test: s => s.dex.length >= 30 },
  { id: 'tower10', name: '깊은 곳의 전설', hint: '던전 20층 돌파', gold: 500, test: s => s.best.tower >= 20 },
];
export const validMedal = id => MEDALS.some(medal => medal.id === id);
export const nextMedal = save => MEDALS.find(medal => !save.medals.includes(medal.id)) ?? null;

// 새로 딴 훈장과 합계 골드를 돌려줍니다. 저장 자료는 바꾸지 않습니다.
export function claimMedals(save) {
  const earned = MEDALS.filter(medal => !save.medals.includes(medal.id) && medal.test(save));
  return { earned, gold: earned.reduce((sum, medal) => sum + medal.gold, 0) };
}
