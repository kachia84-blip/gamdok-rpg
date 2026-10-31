import { effectiveStats, gainExp } from './hero.js';
import { CONSUMABLES, consume, grantItem } from './shop.js';
import { shuffle, pick } from './rng.js';

export const ended = battle => ['won', 'lost', 'fled'].includes(battle.phase);

export function startBattle(hero, event, skills, rng) {
  return { hero: structuredClone(hero), skills: [...skills], event: structuredClone(event),
    monster: { hp: event.maxHp, maxHp: event.maxHp, attack: event.attack, lv: event.lv },
    phase: 'action', attempts: 0, wrong: false, revealed: null, hiddenChoices: [],
    weakness: rng() < Math.min(1, effectiveStats(hero).eye * 0.04), log: ['몬스터가 나타났습니다.'],
    effect: null, reward: null };
}

function log(battle, message) { battle.log.push(message); }

function counter(battle, multiplier = 1) {
  const damage = Math.max(1, Math.round(battle.monster.attack * multiplier) - effectiveStats(battle.hero).defense);
  battle.hero.hp = Math.max(0, battle.hero.hp - damage);
  battle.effect = { target: 'hero', damage };
  log(battle, `반격! HP가 ${damage} 줄었습니다.`);
  if (!battle.hero.hp) { battle.phase = 'lost'; log(battle, '쓰러지셨습니다. 숙직실로 이동합니다.'); }
}

function win(battle, rng, phantom = false) {
  battle.phase = 'won';
  battle.monster.hp = 0;
  const { floor, boss, instance } = battle.event;
  const stats = effectiveStats(battle.hero);
  const exp = phantom ? 4 + floor * 2 : (10 + floor * 5) * (boss ? 3 : 1);
  const gold = phantom ? 0 : (6 + floor * 4 + stats.talk) * (boss ? 3 : 1);
  const gained = gainExp({ ...battle.hero, gold: battle.hero.gold + gold }, exp);
  battle.hero = gained.hero;
  const learned = !phantom && !battle.skills.includes(instance.article);
  if (learned) battle.skills.push(instance.article);
  let drop = null;
  if (!phantom && rng() < 0.25) {
    const id = pick(rng, Object.keys(CONSUMABLES));
    const next = grantItem(battle.hero, id);
    if (next !== battle.hero) { battle.hero = next; drop = id; }
  }
  battle.reward = { exp, gold, levels: gained.levels, learned, drop };
  log(battle, phantom ? `환영 소멸! ${instance.why}` : '몬스터를 물리치셨습니다!');
  log(battle, `경험치 +${exp} · ${gold}G 획득`);
  if (learned) log(battle, `📜 ${instance.article} 스킬을 습득하셨습니다.`);
  if (drop) log(battle, `${CONSUMABLES[drop].name} 획득`);
  if (gained.levels) log(battle, `레벨업! Lv${battle.hero.lv} · 능력치 포인트 +${gained.levels * 3}`);
}

export function correctRebuttal(rebuttal, value) {
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') return false;
  if (rebuttal.type === 'pick') return Number.isInteger(Number(value)) && Number(value) === rebuttal.answer;
  if (rebuttal.type !== 'num') return false;
  const text = String(value).trim();
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) && Number(text) === rebuttal.answer;
}

export function battleAction(before, action, rng) {
  if (ended(before)) return before;
  const battle = structuredClone(before);
  const { instance } = battle.event;
  const phantom = instance.kind === 'ok';
  const stats = effectiveStats(battle.hero);
  battle.effect = null;
  if (action.type === 'cancel' && battle.phase === 'cite') { battle.phase = 'action'; return battle; }
  if (action.type === 'slash' && battle.phase === 'action') { battle.phase = 'cite'; return battle; }
  if (action.type === 'cite' && battle.phase === 'cite') {
    if (!battle.event.choices.includes(action.value) || battle.hiddenChoices.includes(action.value)) return before;
    if (phantom) {
      battle.wrong = true; battle.phase = 'action';
      log(battle, '억지 지적! 환영에 휘둘리셨습니다.'); counter(battle, 1.5);
    } else if (action.value !== instance.article) {
      battle.wrong = true; battle.phase = 'action';
      log(battle, '빗나갔습니다. 조문을 다시 살펴보세요.'); counter(battle);
    } else {
      const mastery = battle.skills.includes(instance.article) ? 1.2 : 1;
      const base = Math.max(Math.ceil(battle.monster.maxHp / 2), 8 + stats.law * 2 + Math.floor(rng() * 5) - 2);
      const damage = Math.round(base * mastery);
      // 첫 공격은 반드시 버티기와 반박으로 이어집니다.
      const previousHp = battle.monster.hp;
      battle.monster.hp = Math.max(1, previousHp - damage);
      battle.effect = { target: 'monster', damage: previousHp - battle.monster.hp };
      battle.phase = 'rebut'; battle.attempts = 0;
      log(battle, `💥 조문 베기! ${battle.effect.damage} 피해${mastery > 1 ? ' · 숙련 +20%' : ''}`);
      log(battle, instance.violation.rebuttal.claim ?? '몬스터가 버팁니다. 반박해 주세요.');
    }
    return battle;
  }
  if (action.type === 'rebut' && battle.phase === 'rebut') {
    const rebuttal = instance.violation.rebuttal;
    if (correctRebuttal(rebuttal, action.value)) {
      const damage = battle.monster.hp + stats.talk * 3;
      battle.effect = { target: 'monster', damage, critical: true };
      log(battle, `💥 반박 치명타! ${damage} 피해`); win(battle, rng);
    } else {
      battle.wrong = true; battle.attempts++;
      log(battle, battle.attempts < 2 ? '반박이 막혔습니다. 한 번 더 도전해 주세요.' : `반박 기회를 소진하셨습니다. ${rebuttal.explain}`);
      counter(battle);
      if (battle.phase !== 'lost' && battle.attempts >= 2) battle.phase = 'action';
    }
    return battle;
  }
  if (action.type === 'item' && ['action', 'cite', 'rebut'].includes(battle.phase)) {
    const id = action.id;
    if (!Object.hasOwn(CONSUMABLES, id) || !(battle.hero.bag[id] > 0)) return before;
    if (CONSUMABLES[id].hp && battle.hero.hp === battle.hero.maxHp) return before;
    if (id === 'tape' && battle.revealed !== null) return before;
    if (id === 'notebook' && (battle.hiddenChoices.length || battle.phase !== 'cite')) return before;
    battle.hero = consume(battle.hero, id);
    if (id === 'tape') { battle.revealed = phantom; log(battle, phantom ? '📏 환영입니다. 간파해 주세요.' : '📏 진짜 위험입니다. 조문으로 맞서 주세요.'); }
    else if (id === 'notebook') {
      battle.hiddenChoices = shuffle(rng, battle.event.choices.filter(a => a !== instance.article)).slice(0, 2);
      log(battle, '📖 조문 보기 두 개를 지웠습니다.');
    } else log(battle, `${CONSUMABLES[id].name} 사용 · HP 회복`);
    return battle;
  }
  if (battle.phase !== 'action') return before;
  if (action.type === 'insight') {
    if (phantom) win(battle, rng, true);
    else { battle.wrong = true; log(battle, '방심했다! 진짜 위험의 치명 반격입니다.'); counter(battle, 2); }
    return battle;
  }
  if (action.type === 'flee') {
    if (rng() < Math.min(1, 0.5 + stats.eye * 0.05)) { battle.phase = 'fled'; log(battle, '도망에 성공하셨습니다.'); }
    else { log(battle, '도망길이 막혔습니다.'); counter(battle); }
    return battle;
  }
  return before;
}
