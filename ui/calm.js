// 배터리·발열 줄이기(2026-11-14): 손을 뗀 지 15초가 지나거나 화면이 가려지면 계속 도는 배경·숨쉬기 효과를 멈추고,
// 화면을 만지면 다시 움직인다. 배터리 20% 미만이면서 충전 중이 아니면 반복 효과를 한 번만 돌고 멈추게 한다. 짝 CSS는 style.css 끝.
(() => {
  const root = document.documentElement, IDLE_MS = 15000;
  let timer = 0;
  const idle = on => { if (on) root.dataset.idle = '1'; else delete root.dataset.idle; };
  const wake = () => { idle(false); clearTimeout(timer); timer = setTimeout(() => idle(true), IDLE_MS); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(t => addEventListener(t, wake, {passive: true, capture: true}));
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(timer); idle(true); } else wake(); });
  wake();
  try {
    if (navigator.getBattery) navigator.getBattery().then(b => {
      const check = () => { if (b.level < 0.2 && !b.charging) root.dataset.lowbat = '1'; else delete root.dataset.lowbat; };
      b.addEventListener('levelchange', check); b.addEventListener('chargingchange', check); check();
    }).catch(() => {});
  } catch (e) {}
})();
