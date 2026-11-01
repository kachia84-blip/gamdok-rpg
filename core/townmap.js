// . = road, g = grass, w = wall, # = building footprint.
export const TOWN_MAP = Object.freeze([
  '###.###',
  '###.###',
  'w.....w',
  '###.###',
  '###.###',
  'g.....g',
  '###.###',
  '###.###',
  'w.....w',
]);
export const TOWN_START = Object.freeze({ x: 3, y: 8 });
export const TOWN_BUILDINGS = Object.freeze([
  { id: 'dungeon', label: '⚔️ 던전 입장', x: 0, y: 0, door: { x: 1, y: 2 } },
  { id: 'shop', label: '🏪 상점', x: 4, y: 0, door: { x: 5, y: 2 } },
  { id: 'inn', label: '🛏️ 숙직실', x: 0, y: 3, door: { x: 1, y: 5 } },
  { id: 'senior', label: '🧓 선배 감독관', x: 4, y: 3, door: { x: 5, y: 5 } },
  { id: 'skillbook', label: '📜 스킬북', x: 0, y: 6, door: { x: 1, y: 8 } },
  { id: 'status', label: '📊 능력치', x: 4, y: 6, door: { x: 5, y: 8 } },
].map(building => Object.freeze({ ...building, door: Object.freeze(building.door) })));

export function isWalkable(point, map = TOWN_MAP) {
  return !!point && Number.isInteger(point.x) && Number.isInteger(point.y) &&
    point.x >= 0 && point.y >= 0 && map?.[point.y]?.[point.x] === '.';
}

// Shortest orthogonal path, including both endpoints. Never mutates its inputs.
export function findPath(start, goal, map = TOWN_MAP) {
  if (!Array.isArray(map) || !map.length || !map[0]?.length ||
      map.some(row => row?.length !== map[0].length) ||
      !isWalkable(start, map) || !isWalkable(goal, map)) return [];
  const key = p => `${p.x},${p.y}`;
  const queue = [{ x: start.x, y: start.y }];
  const parents = new Map([[key(start), null]]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current.x === goal.x && current.y === goal.y) {
      const path = [];
      for (let p = current; p; p = parents.get(key(p))) path.push({ ...p });
      return path.reverse();
    }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (!isWalkable(next, map) || parents.has(key(next))) continue;
      parents.set(key(next), current);
      queue.push(next);
    }
  }
  return [];
}
