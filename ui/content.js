import { AREAS, getChapter } from '../core/chapters.js';

const lines = (value, fallback) => Array.isArray(value) && value.length && value.every(x => typeof x === 'string') ? value : fallback;
const text = (value, fallback) => typeof value === 'string' && value.trim() ? value : fallback;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const chooseLine = (values, fallback, random = Math.random) => {
  const choices = Array.isArray(values) ? values.filter(value => typeof value === 'string' && value.trim()) : [];
  return choices.length ? choices[Math.floor(random() * choices.length)] : fallback;
};

export function storyContent(raw, chapter = 1) {
  const data = record(raw) ? raw : {};
  const town = record(data.town) ? data.town : {};
  const events = record(data.events) ? data.events : {};
  const chapters = Object.fromEntries(AREAS.filter(area => area.id > 1).map(area => {
    const source = record(data.chapters?.[area.id]) ? data.chapters[area.id] : {};
    return [area.id, {
      title: text(source.title, `${area.id}장 · ${area.name}`),
      intro: lines(source.intro, [`${area.name}에 도착하셨습니다.`, '주변을 살피고 새로운 모험을 시작해 주세요.']),
      floors: Array.from({ length: 6 }, (_, index) => {
        const floor = index + 1;
        const item = Array.isArray(source.floors) ? source.floors.find(f => f?.floor === floor) : null;
        return { floor, name: text(item?.name, `${floor}층 · ${area.name}`), enter: text(item?.enter, '앞에서 인기척이 들립니다. 주변을 살펴보세요.') };
      }),
      boss_clear: lines(source.boss_clear, [`${area.name}의 그림자가 걷혔습니다.`, `${area.id}장을 클리어하셨습니다!`]),
      teaser: lines(source.teaser, area.id === 2 ? ['기계공장에서 새로운 소식이 도착했습니다.'] : ['지청에 평온이 찾아왔습니다. 함께해 주셔서 감사합니다.']),
    }];
  }));
  return {
    chapters,
    ch2_intro: chapters[2].intro, ch3_intro: chapters[3].intro, ch4_intro: chapters[4].intro,
    ch2_clear: chapters[2].boss_clear, ch3_clear: chapters[3].boss_clear,
    prologue: lines(data.prologue, ['지청에 오신 것을 환영합니다. 오늘부터 당신은 신입 감독관입니다.', '추락의 고층 빌딩에 수상한 그림자가 드리웠습니다. 조문과 관찰력으로 몬스터에 맞서 주세요.']),
    town: { greeting: lines(town.greeting, ['법전을 챙기셨나요? 출발 전에 지청에서 준비해 주세요.']),
      chatter: lines(town.chatter, lines(town.greeting, ['법전을 챙기셨나요? 출발 전에 지청에서 준비해 주세요.'])),
      senior: Array.isArray(town.senior) ? town.senior.filter(s => record(s) && typeof s.id === 'string').map(s => ({ id: s.id, lines: lines(s.lines, ['상황을 살피고 알맞은 조문으로 맞서 주세요.']) })) : [],
      inn: lines(town.inn, ['숙직실의 불이 켜져 있습니다. 잠시 쉬어 가세요.']), shop: lines(town.shop, ['든든한 장비와 소모품을 준비해 주세요.']) },
    floors: getChapter(chapter).id > 1 ? chapters[getChapter(chapter).id].floors : Array.from({ length: 6 }, (_, index) => {
      const floor = index + 1;
      const item = Array.isArray(data.floors) ? data.floors.find(f => f?.floor === floor) : null;
      return { floor, name: text(item?.name, `${floor}층 · ${floor === 6 ? '마지막 그림자' : '빌딩 탐색'}`), enter: text(item?.enter, '계단 너머로 인기척이 들립니다. 주변을 살펴보세요.') };
    }),
    events: { chest: lines(events.chest, ['남겨진 상자에서 골드를 발견하셨습니다.']), rest: lines(events.rest, ['안전한 쉼터입니다. 잠시 숨을 고르세요.']),
      npc: Array.isArray(events.npc) ? events.npc.filter(record).map(n => ({ name: text(n.name, '떠돌이 감독관'), emoji: text(n.emoji, '🧓'), line: text(n.line, '이 상황에 맞는 조문을 골라 주세요.') })) : [] },
    faint: lines(data.faint, ['숙직실에서 눈을 뜨셨습니다. 골드 절반을 잃었지만 경험과 장비는 남아 있습니다.']),
    boss_clear: lines(data.boss_clear, ['빌딩을 뒤덮던 그림자가 걷혔습니다. 1장을 클리어하셨습니다!']),
    chapter2_teaser: lines(data.chapter2_teaser, ['2장 예고 · 질식의 밀폐 맨홀에서 새로운 모험이 이어집니다.']),
  };
}

export function monsterContent(raw, event) {
  const area = getChapter(event.chapter ?? 1);
  const chapter = record(raw?.[`chapter${area.id}`]) ? raw[`chapter${area.id}`] : {};
  let source = record(chapter.monsters?.[event.cardId]) ? chapter.monsters[event.cardId] : {};
  // 끝없는 탑은 앞 장의 몬스터를 그대로 불러옵니다.
  if (area.endless && !record(chapter.monsters?.[event.cardId])) {
    for (const n of [1, 2, 3]) {
      const found = raw?.[`chapter${n}`]?.monsters?.[event.cardId];
      if (record(found)) { source = found; break; }
    }
  }
  const bosses = Array.isArray(chapter.bosses) ? chapter.bosses.filter(record) : [];
  const boss = bosses.length ? bosses[(Math.ceil(event.floor / 5) - 1) % bosses.length] : record(chapter.boss) ? chapter.boss : {};
  const selected = event.boss ? boss : source;
  return { name: text(selected.name, event.boss ? area.id === 1 ? '고층 빌딩의 그림자' : `${area.name}의 그림자` : '현장의 망령'), emoji: text(selected.emoji, '🪖'),
    title: text(selected.title, event.boss ? `${event.floor}층의 지배자` : ''),
    appear: text(event.boss ? boss.lines?.appear : source.appear, '여기까지 왔군!'),
    taunt: chooseLine(selected.taunts ?? (event.boss ? boss.lines?.taunts : null), text(selected.taunt, text(source.taunt, '{situation}'))),
    hits: lines(selected.hits, event.boss ? lines(boss.lines?.hits, lines(boss.lines?.hit, ['제법이군!'])) : [text(source.hit, '아직 끝나지 않았어!')]),
    hit: chooseLine(selected.hits, event.boss ? chooseLine(boss.lines?.hits ?? boss.lines?.hit, '제법이군!') : text(source.hit, '아직 끝나지 않았어!')),
    defeat: text(event.boss ? boss.lines?.defeat : source.defeat, '이렇게 사라지다니…'),
    phantom: text(source.phantom, '들켰네. 난 환영이었어!') };
}

