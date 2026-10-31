export function judgeCite(v, articleNo) {
  return articleNo === v.article;
}

export function judgeLaw(v, basis) {
  return String(basis) === v.lawBasis;
}

export function judgeRebut(v, input) {
  const r = v.rebuttal;
  if (typeof input !== 'string' && typeof input !== 'number') return false;
  if (r.type === 'pick') {
    if (String(input).trim() === '') return false;
    const index = Number(input);
    return Number.isInteger(index) && index >= 0 && index < r.choices.length && index === r.answer;
  }
  if (r.type !== 'num') return false;
  const numeric = String(input).replace(/[^0-9.+-]/g, '');
  if (!numeric || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(numeric)) return false;
  const number = Number(numeric);
  return Number.isFinite(number) && number === r.answer;
}
