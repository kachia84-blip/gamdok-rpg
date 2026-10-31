import { pick } from './rng.js';

export function satisfies(rule, value) {
  switch (rule.op) {
    case '>=': return value >= rule.value;
    case '<=': return value <= rule.value;
    case '>': return value > rule.value;
    case '<': return value < rule.value;
    case '==': case '===': return value === rule.value;
    case '!=': return value !== rule.value;
    default: throw new Error(`지원하지 않는 기준: ${rule.op}`);
  }
}

function fill(value, params) {
  if (typeof value === 'string') return value.replace(/\{(place|v)\}/g, (_, key) => String(params[key] ?? ''));
  if (Array.isArray(value)) return value.map(item => fill(item, params));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fill(item, params)]));
  return value;
}

export function supports(card, wantViolation, allowEdge) {
  if (card.kind === 'text') return card.variants.some(variant => variant.ok === !wantViolation);
  return card.param[wantViolation ? 'bad' : 'ok'].some(v => (allowEdge || v !== card.param.edge) && satisfies(card.rule, v) === !wantViolation);
}

export function instantiate(card, place, rng, { wantViolation, allowEdge }) {
  const location = typeof place === 'string' ? place : place.name;
  let v = null;
  let text;
  let why;
  if (card.kind === 'num') {
    v = pick(rng, card.param[wantViolation ? 'bad' : 'ok'].filter(value =>
      (allowEdge || value !== card.param.edge) && satisfies(card.rule, value) === !wantViolation));
    text = pick(rng, card.phrases);
    why = `${card.article} ${card.clauseNote ?? ''}: ${card.quote}`;
  } else {
    const variant = pick(rng, card.variants.filter(variant => variant.ok === !wantViolation));
    text = variant.phrase;
    why = variant.why ?? `${card.article}: ${card.quote}`;
  }
  const params = { place: location, v };
  const result = { hid: card.id, cardId: card.id, v, kind: wantViolation ? 'violation' : 'ok', text: fill(text, params), article: card.article };
  if (!wantViolation) return { ...result, why: fill(why, params) };
  const r = card.rebuttal;
  const rebuttal = fill(r, params);
  rebuttal.speaker = r.speakers?.length ? fill(pick(rng, r.speakers), params) : rebuttal.speaker;
  rebuttal.claim = r.claims?.length ? fill(pick(rng, r.claims), params) : rebuttal.claim;
  rebuttal.explain ??= fill(card.quote, params);
  delete rebuttal.speakers;
  delete rebuttal.claims;
  return { ...result, violation: {
    id: card.id, cardId: card.id, v, article: card.article, clauseNote: card.clauseNote,
    citeChoices: [], lawBasis: card.lawBasis, label: fill(card.label, params),
    fix: fill(card.fix, params), rebuttal, missedNews: fill(card.news, params),
  } };
}
