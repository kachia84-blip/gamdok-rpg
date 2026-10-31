const lines = (value, fallback) => Array.isArray(value) && value.length && value.every(x => typeof x === 'string') ? value : fallback;
const text = (value, fallback) => typeof value === 'string' && value.trim() ? value : fallback;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function storyContent(raw) {
  const data = record(raw) ? raw : {};
  const town = record(data.town) ? data.town : {};
  const events = record(data.events) ? data.events : {};
  return {
    prologue: lines(data.prologue, ['지청에 오신 것을 환영합니다. 오늘부터 당신은 신입 감독관입니다.', '추락의 고층 빌딩에 수상한 그림자가 드리웠습니다. 조문과 관찰력으로 몬스터에 맞서 주세요.']),
    town: { greeting: lines(town.greeting, ['법전을 챙기셨나요? 출발 전에 지청에서 준비해 주세요.']),
      senior: Array.isArray(town.senior) ? town.senior.filter(s => record(s) && typeof s.id === 'string').map(s => ({ id: s.id, lines: lines(s.lines, ['상황을 살피고 알맞은 조문으로 맞서 주세요.']) })) : [],
      inn: lines(town.inn, ['숙직실의 불이 켜져 있습니다. 잠시 쉬어 가세요.']), shop: lines(town.shop, ['든든한 장비와 소모품을 준비해 주세요.']) },
    floors: Array.from({ length: 6 }, (_, index) => {
      const floor = index + 1;
      const item = Array.isArray(data.floors) ? data.floors.find(f => f?.floor === floor) : null;
      return { floor, name: text(item?.name, `${floor}층 · ${floor === 6 ? '마지막 그림자' : '빌딩 탐색'}`), enter: text(item?.enter, '계단 너머로 인기척이 들립니다. 주변을 살펴보세요.') };
    }),
    events: { chest: lines(events.chest, ['남겨진 상자에서 골드를 발견하셨습니다.']), rest: lines(events.rest, ['안전한 쉼터입니다. 잠시 숨을 고르세요.']),
      npc: Array.isArray(events.npc) ? events.npc.filter(record).map(n => ({ name: text(n.name, '떠돌이 감독관'), emoji: text(n.emoji, '🧓'), line: text(n.line, '이 상황에 맞는 조문을 골라 주세요.') })) : [] },
    faint: lines(data.faint, ['숙직실에서 눈을 뜨셨습니다. 골드 절반을 잃었지만 경험과 장비는 남아 있습니다.']),
    boss_clear: lines(data.boss_clear, ['빌딩을 뒤덮던 그림자가 걷혔습니다. 1장을 클리어하셨습니다!']),
    chapter2_teaser: lines(data.chapter2_teaser, ['2장 예고 · 지청에 새로운 소식이 도착합니다. 다음 모험을 기다려 주세요.']),
  };
}

export function monsterContent(raw, event) {
  const chapter = record(raw?.chapter1) ? raw.chapter1 : {};
  const source = record(chapter.monsters?.[event.cardId]) ? chapter.monsters[event.cardId] : {};
  const boss = record(chapter.boss) ? chapter.boss : {};
  const selected = event.boss ? boss : source;
  return { name: text(selected.name, event.boss ? '고층 빌딩의 그림자' : '현장의 망령'), emoji: text(selected.emoji, '🪖'),
    title: text(selected.title, event.boss ? '6층의 지배자' : ''),
    appear: text(event.boss ? boss.lines?.appear : source.appear, '여기까지 왔군!'),
    taunt: text(source.taunt, '{situation}'),
    hit: event.boss ? lines(boss.lines?.hit, ['제법이군!'])[0] : text(source.hit, '아직 끝나지 않았어!'),
    defeat: text(event.boss ? boss.lines?.defeat : source.defeat, '이렇게 사라지다니…'),
    phantom: text(source.phantom, '들켰네. 난 환영이었어!') };
}
