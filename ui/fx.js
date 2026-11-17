const SOUND_KEY = 'gamdok_sound';
let soundOn = true;
let audio;
const initialized = new WeakSet();
const shakeTimers = new WeakMap();

export function reducedMotion() {
  try { return globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true; }
  catch { return false; }
}

export const isSoundEnabled = () => soundOn;
export function toggleSound() {
  soundOn = !soundOn;
  try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch { /* Storage is optional. */ }
  return soundOn;
}

function unlock() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    audio ??= new Context();
    if (audio.state === 'suspended') audio.resume()?.catch(() => {});
  } catch { /* Silent fallback on unsupported or blocked audio. */ }
}

// Install on boot; construct/resume audio only inside a user gesture.
export function initFx(target = document) {
  try { soundOn = !['off', 'false', '0'].includes(localStorage.getItem(SOUND_KEY)); }
  catch { soundOn = true; }
  if (initialized.has(target)) return;
  initialized.add(target);
  target.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  target.addEventListener('keydown', unlock, { capture: true });
  target.addEventListener('click', event => {
    unlock();
    if (event.target?.closest?.('button:not(:disabled)')) sfx('click');
  }, { capture: true });
}

// frequency, end frequency, start, duration, (gain); every sound ends within 300ms.
// 베기·치명타·피격은 휘두르는 소리 뒤, 맞는 순간(약 0.16초)에 묵직한 저음이 겹칩니다.
const NOTES = {
  slash: [[720, 150, 0, .12], [170, 55, .16, .1, .15]], hit: [[160, 50, .15, .13, .17]],
  crit: [[900, 200, 0, .1], [150, 42, .16, .13, .19], [990, 1480, .19, .1, .07]],
  ko: [[110, 38, 0, .22, .18]],
  miss: [[180, 100, 0, .09]], insight: [[520, 1040, 0, .22]],
  heal: [[440, 660, 0, .1], [660, 880, .1, .12]],
  coin: [[1040, 1040, 0, .065], [1560, 1560, .075, .09]],
  levelup: [[523, 523, 0, .08], [659, 659, .08, .08], [784, 1046, .16, .12]],
  step: [[95, 60, 0, .035]], click: [[460, 340, 0, .035]],
  defeat: [[220, 55, 0, .26]],
};

// 맞는 순간의 "퍽" 소리: 짧은 잡음. start, duration, 밝기(Hz), gain.
const NOISE = { slash: [[.16, .07, 2400, .13]], crit: [[.16, .13, 4200, .2]], hit: [[.15, .11, 950, .2]], ko: [[0, .16, 1400, .16]] };

function noise(now, [offset, duration, tone, level]) {
  const length = Math.ceil(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
  const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
  source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = tone; gain.gain.value = level;
  source.connect(filter); filter.connect(gain); gain.connect(audio.destination);
  source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  source.start(now + offset);
}

export function sfx(name) {
  if (!soundOn || !audio || audio.state !== 'running' || !NOTES[name]) return;
  try { for (const item of NOISE[name] ?? []) noise(audio.currentTime, item); } catch { /* 잡음을 못 내는 기기에서는 음만 냅니다. */ }
  try {
    const now = audio.currentTime;
    for (const [from, to, offset, duration, level] of NOTES[name]) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = now + offset, end = start + duration;
      oscillator.type = ['hit', 'crit', 'step', 'slash', 'ko'].includes(name) ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(from, start);
      oscillator.frequency.exponentialRampToValueAtTime(to, end);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level ?? (name === 'step' ? .018 : .045), start + .005);
      gain.gain.exponentialRampToValueAtTime(.0001, end);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(end);
    }
  } catch { /* Audio must never interrupt play. */ }
}

export function buzz(pattern) {
  try { globalThis.navigator?.vibrate?.(pattern); } catch { /* Haptics are optional. */ }
}

export function shake(el, strong = false) {
  if (!el || reducedMotion()) return;
  clearTimeout(shakeTimers.get(el));
  el.classList.remove('fx-shake', 'fx-shake-strong');
  el.classList.add(strong ? 'fx-shake-strong' : 'fx-shake');
  shakeTimers.set(el, setTimeout(() => {
    el.classList.remove('fx-shake', 'fx-shake-strong');
    shakeTimers.delete(el);
  }, strong ? 420 : 280));
}

// ---- 타격감: 맞는 순간에 불꽃·번쩍임·순간 멈춤·체력바 덜컹을 한꺼번에 터뜨립니다. ----
export const IMPACT_MS = 180;
const later = (ms, run) => { if (reducedMotion()) run(); else setTimeout(run, ms); };

// 맞은 자리에서 사방으로 튀는 불꽃과 퍼지는 고리.
export function burst(host, count = 8, kind = '') {
  if (!host?.append || reducedMotion()) return;
  const doc = host.ownerDocument ?? globalThis.document;
  const layer = doc.createElement('span');
  layer.className = `fx-burst ${kind}`.trim();
  layer.setAttribute('aria-hidden', 'true');
  const ring = doc.createElement('span');
  ring.className = 'fx-ring';
  layer.append(ring);
  for (let i = 0; i < count; i++) {
    const spark = doc.createElement('span');
    const angle = (i / count) * Math.PI * 2 + Math.random() * .6;
    const reach = (kind === 'crit' || kind === 'ko' ? 40 : 26) + Math.random() * 26;
    spark.className = 'fx-spark';
    spark.style.setProperty('--dx', `${Math.round(Math.cos(angle) * reach)}px`);
    spark.style.setProperty('--dy', `${Math.round(Math.sin(angle) * reach)}px`);
    layer.append(spark);
  }
  host.append(layer);
  setTimeout(() => layer.remove(), 700);
}

// 화면 전체가 한 번 번쩍입니다.
export function flash(host, kind = '') {
  if (!host?.append || reducedMotion()) return;
  const sheet = (host.ownerDocument ?? globalThis.document).createElement('span');
  sheet.className = `fx-flash ${kind}`.trim();
  sheet.setAttribute('aria-hidden', 'true');
  host.append(sheet);
  setTimeout(() => sheet.remove(), 320);
}

// 순간 멈춤(히트스톱): 맞는 순간 움직임을 잠깐 얼립니다.
export function hitstop(el, ms = 70) {
  if (!el?.classList || reducedMotion()) return;
  el.classList.add('fx-hitstop');
  setTimeout(() => el.classList.remove('fx-hitstop'), ms);
}

function jolt(el) {
  if (!el?.classList || reducedMotion()) return;
  el.classList.remove('fx-jolt');
  void el.offsetWidth;
  el.classList.add('fx-jolt');
  setTimeout(() => el.classList.remove('fx-jolt'), 320);
}

function impact(root, target, critical = false, ko = false) {
  // 처치 효과음은 움직임 줄이기 설정과 상관없이 냅니다.
  if (ko) setTimeout(() => sfx('ko'), reducedMotion() ? 0 : 170);
  // 맞는 순간 전에 다른 화면으로 넘어갔으면 시각 효과를 건너뜁니다.
  if (!root?.querySelector?.('.battle-screen') || reducedMotion()) return;
  const actor = root.querySelector(target === 'hero' ? '.hero-actor' : '.monster-actor');
  const kind = target === 'hero' ? 'hurt' : critical ? 'crit' : '';
  burst(actor, critical ? 14 : 8, kind);
  flash(root.querySelector('.battle-screen'), kind);
  hitstop(root.querySelector('.sideview-stage'), critical ? 130 : 70);
  jolt(target === 'hero' ? root.ownerDocument?.querySelector('#hero-status') : root.querySelector('.monster-arena .hp-display'));
  if (ko) setTimeout(() => { if (root.querySelector('.battle-screen')) burst(root.querySelector('.monster-actor'), 12, 'ko'); }, 170);
}

// 화면 요소가 없는 테스트 객체는 그대로 흔들고, 실제 화면은 아직 전투 중일 때만 흔듭니다.
const onBattle = el => !el?.querySelector || !!el.querySelector('.battle-screen');

export function battleFx(previous, next, el) {
  if (next.log.slice(previous.log.length).some(line => /빗나/.test(line))) sfx('miss');
  const won = next.phase === 'won' && previous.phase !== 'won';
  if (next.effect?.target === 'hero') {
    sfx('hit'); later(IMPACT_MS, () => { buzz(80); if (onBattle(el)) shake(el); impact(el, 'hero'); });
  } else if (next.effect?.critical) {
    sfx('crit'); later(IMPACT_MS, () => { buzz([20, 30, 40, 30, 110]); if (onBattle(el)) shake(el, true); impact(el, 'monster', true, won); });
  } else if (next.effect?.target === 'monster') {
    sfx('slash'); later(IMPACT_MS, () => { buzz(25); if (onBattle(el)) shake(el); impact(el, 'monster'); });
  }
  else if (next.phase === 'won' && previous.phase !== 'won') sfx('insight');
  else if (next.hero.hp > previous.hero.hp) sfx('heal');
  else if (next.log.length > previous.log.length && /빗나|실패/.test(next.log.at(-1))) sfx('miss');
  if (next.phase === 'lost' && previous.phase !== 'lost') sfx('defeat');
  if (next.phase === 'won' && previous.phase !== 'won') {
    sfx('coin');
    if (next.reward?.levels > 0) { sfx('levelup'); buzz([40, 40, 80]); }
  }
}
