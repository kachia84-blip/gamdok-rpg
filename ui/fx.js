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

// frequency, end frequency, start, duration; every sound ends within 280ms.
const NOTES = {
  slash: [[720, 150, 0, .12]], hit: [[150, 55, 0, .13]],
  crit: [[150, 50, 0, .12], [880, 1320, .08, .16]],
  miss: [[180, 100, 0, .09]], insight: [[520, 1040, 0, .22]],
  heal: [[440, 660, 0, .1], [660, 880, .1, .12]],
  coin: [[1040, 1040, 0, .065], [1560, 1560, .075, .09]],
  levelup: [[523, 523, 0, .08], [659, 659, .08, .08], [784, 1046, .16, .12]],
  step: [[95, 60, 0, .035]], click: [[460, 340, 0, .035]],
  defeat: [[220, 55, 0, .26]],
};

export function sfx(name) {
  if (!soundOn || !audio || audio.state !== 'running' || !NOTES[name]) return;
  try {
    const now = audio.currentTime;
    for (const [from, to, offset, duration] of NOTES[name]) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = now + offset, end = start + duration;
      oscillator.type = ['hit', 'crit', 'step', 'slash'].includes(name) ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(from, start);
      oscillator.frequency.exponentialRampToValueAtTime(to, end);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(name === 'step' ? .018 : .045, start + .005);
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

export function battleFx(previous, next, el) {
  if (next.log.slice(previous.log.length).some(line => /빗나/.test(line))) sfx('miss');
  if (next.effect?.target === 'hero') {
    sfx('hit'); buzz(80); shake(el);
  } else if (next.effect?.critical) {
    sfx('crit'); buzz([30, 40, 80]); shake(el, true);
  } else if (next.effect?.target === 'monster') sfx('slash');
  else if (next.phase === 'won' && previous.phase !== 'won') sfx('insight');
  else if (next.hero.hp > previous.hero.hp) sfx('heal');
  else if (next.log.length > previous.log.length && /빗나|실패/.test(next.log.at(-1))) sfx('miss');
  if (next.phase === 'lost' && previous.phase !== 'lost') sfx('defeat');
  if (next.phase === 'won' && previous.phase !== 'won') {
    sfx('coin');
    if (next.reward?.levels > 0) { sfx('levelup'); buzz([40, 40, 80]); }
  }
}
