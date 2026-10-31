// Presentation only: leave the card and its saved legal explanation intact.
export function tauntOnly(text) {
  return String(text ?? '').replaceAll('{situation}', ' ').replace(/\s+/g, ' ')
    .replace(/\s+([,!?。.!])/g, '$1').trim() || '여기까지 왔군!';
}

export function shortClause(article, note = '') {
  const clause = String(note).split(/[:：]/, 1)[0].trim();
  return [article, clause.replace(new RegExp(`^${article}\\s*`), '')].filter(Boolean).join(' ');
}

export function briefLog(line) {
  return line.replace(/^(환영 소멸!|반박 기회를 소진하셨습니다\.).*$/s, '$1');
}
