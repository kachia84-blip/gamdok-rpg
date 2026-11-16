import { h, button, heading, back } from './common.js';
import { msgbox } from './msgbox.js';
import { effectiveStats } from '../../core/hero.js';
import { citeLabel } from '../../core/reveal.js';
import { RELICS, merchantPrice, healPrice } from '../../core/relics.js';
import { MODS } from '../../core/dungeon.js';
import { getChapter, BOSS_EVERY } from '../../core/chapters.js';

const SITE_ICON = { 1: '🏢', 2: '🕳️', 3: '🏭' };
const MOD_ICON = { danger: '⚠️', calm: '🌿' };
const SIDE_TEXT = { altar: '낡은 제단이 희미하게 빛나고 있습니다.', gamble: '누군가 동전을 튕기며 내기를 청합니다.',
  merchant: '짐을 잔뜩 멘 상인이 손짓합니다.' };

export function dungeon({ run, story, hero, save, articles, onEvent, onNext, onTown, onQuiz, onFloorSeen, message, floorInfo, endless = false, onRelic, onSide }) {
  const floor = floorInfo ?? story.floors[run.floor - 1];
  const event = run.events[run.step];
  const names = { battle: '몬스터', chest: '보물상자', rest: '쉼터', npc: '떠돌이 감독관', altar: '수상한 제단', gamble: '동전 던지기', merchant: '떠돌이 상인' };
  const turn = run.floor + run.step;
  const line = list => list[turn % list.length];
  const path = h('ol', { className: 'event-path', 'aria-label': '탐험 경로' }, run.events.map((item, index) =>
    h('li', { className: index < run.step ? 'done' : index === run.step ? 'current' : '', 'aria-current': index === run.step ? 'step' : null },
      `${index + 1}. ${item.boss ? '보스' : item.elite ? '정예' : names[item.type]}${index < run.step ? ' · 완료' : ''}`)));
  const info = [run.combo >= 2 && `🔥 ${run.combo}연속`, (run.relics ?? []).map(id => RELICS[id]?.name.split(' ')[0]).join('')].filter(Boolean).join(' · ');
  const card = h('section', { className: 'dungeon-card panel', 'aria-label': '현재 칸' });
  if (run.relicOffer?.length) {
    card.append(h('h2', {}, '🎁 유물을 하나 고르세요'), h('div', { className: 'relic-choices' }, run.relicOffer.map(id =>
      button(`${RELICS[id].name} · ${RELICS[id].desc}`, () => onRelic(id), { className: 'full' }))));
  } else if (!event) {
    if (run.paths?.length) {
      card.append(h('h2', {}, '🔀 갈림길 · 어느 쪽으로 갈까요?'), h('div', { className: 'relic-choices' }, run.paths.map((path, index) =>
        button(`${MOD_ICON[path.mod] ?? SITE_ICON[path.site]} ${getChapter(path.site).name} · ${MODS[path.mod].label}`, () => onNext(index), { className: 'full' }))));
    } else {
      card.append(h('h2', {}, '이 층을 돌파하셨습니다!'),
        (endless || run.floor < 6) && button(endless && (run.floor + 1) % BOSS_EVERY === 0 ? '다음 층 · 우두머리가 기다립니다' : '다음 층', () => onNext(0), { className: 'primary full' }));
    }
  } else if (event.type === 'altar' && event.opened) {
    card.append(h('h2', {}, '⛩️ 수상한 제단'), h('p', {}, `지금 HP의 4분의 1(${Math.floor(hero.hp / 4)})을 바치면 유물 하나를 고를 수 있습니다.`),
      h('div', { className: 'choices' }, button('바친다', () => onSide(true), { className: 'primary' }), button('지나친다', () => onSide(false))));
  } else if (event.type === 'gamble' && event.opened) {
    const stake = Math.min(hero.gold, event.gold * 2);
    card.append(h('h2', {}, '🪙 동전 던지기'), h('p', {}, `${stake}G를 걸고 동전을 던집니다. 앞면이면 그만큼 따고, 뒷면이면 잃습니다.`),
      h('div', { className: 'choices' }, button('건다', () => onSide(true), { className: 'primary', disabled: stake < 1 }), button('지나친다', () => onSide(false))));
  } else if (event.type === 'merchant' && event.opened) {
    const relic = event.relic && !(run.relics ?? []).includes(event.relic) ? RELICS[event.relic] : null;
    card.append(h('h2', {}, '🧳 떠돌이 상인 · 하나만 살 수 있습니다'),
      h('p', {}, relic ? `${relic.name}(${relic.desc}) ${merchantPrice(event)}G · 응급 치료(HP 전부) ${healPrice(event)}G` : `유물은 다 팔렸습니다. 응급 치료(HP 전부) ${healPrice(event)}G`),
      h('div', { className: 'relic-choices' },
        relic && button(`유물 사기 · ${merchantPrice(event)}G`, () => onSide('relic'), { className: 'full', disabled: hero.gold < merchantPrice(event) }),
        button(`치료받기 · ${healPrice(event)}G`, () => onSide('heal'), { className: 'full', disabled: hero.gold < healPrice(event) || hero.hp === hero.maxHp }),
        button('지나친다', () => onSide(false), { className: 'full' })));
  } else if (event.type === 'npc' && event.opened) {
    const npc = (story.events.npc.length ? line(story.events.npc) : null) ?? { name: '떠돌이 감독관' };
    card.append(h('h2', {}, npc.name), h('p', {}, event.text),
      h('div', { className: 'choices' }, event.choices.map(value =>
        button(citeLabel(value, articles, effectiveStats(hero).law, save.skills), () => onQuiz(value)))));
  } else {
    card.append(h('h2', {}, event.boss ? '마지막 문 앞' : event.elite ? '정예 몬스터' : names[event.type]),
      h('p', {}, event.type === 'battle' ? event.elite ? '👑 정예 몬스터의 기척입니다. 공격이 거세지만 보상이 큽니다.' : event.revived ? '되살아난 몬스터가 길을 막습니다. 다시 맞서 주세요.' : '수상한 인기척이 들립니다. 준비해 주세요.' :
        event.type === 'npc' ? (story.events.npc.length ? line(story.events.npc).line : null) ?? '이 상황에 맞는 조문을 골라 주세요.' :
        SIDE_TEXT[event.type] ?? line(story.events[event.type])),
      button(event.type === 'battle' ? '맞서기' : '살펴보기', onEvent, { className: 'primary full' }));
  }
  const screen = h('div', { className: 'game-screen dungeon-screen' }, heading('1장 · 추락의 고층 빌딩', floor.name),
    h('section', { className: 'dungeon-route' }, path, info && h('p', { className: 'run-info' }, info)), card, back(onTown));
  const firstEntry = !Array.isArray(run.uiSeenFloors) || !run.uiSeenFloors.includes(run.floor);
  let dialogue;
  if (firstEntry || message) {
    const contents = Array.from(card.children);
    card.classList.add('has-message');
    dialogue = msgbox({ lines: [...(firstEntry ? [floor.enter] : []), ...(message ? [message] : [])], speaker: firstEntry ? floor.name : '탐험',
      onDone: () => {
        dialogue.dispose();
        if (firstEntry) onFloorSeen();
        card.replaceChildren(...contents);
        card.classList.remove('has-message');
        card.querySelector('button')?.focus({ preventScroll: true });
      } });
    card.replaceChildren(dialogue);
  }
  screen.dispose = () => dialogue?.dispose();
  return screen;
}
