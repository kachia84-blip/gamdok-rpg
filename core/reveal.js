// 조문 제목 가리기: 법지식이 오를수록 앞에서부터 한 글자씩 보이고, 스킬북에 익힌 조문은 전부 보인다.
// 법지식 3(시작값)이면 1글자, 1 오를 때마다 1글자 더. 띄어쓰기는 그대로 둬서 낱말 길이는 힌트로 남긴다.
export const MASK = '#';

export function shownCount(law) {
  return Math.max(1, Math.floor(law) - 2);
}

export function maskTitle(title, law, learned = false) {
  if (learned) return title;
  let left = shownCount(law);
  return [...title].map(ch => {
    if (/\s/.test(ch)) return ch;
    if (left > 0) { left -= 1; return ch; }
    return MASK;
  }).join('');
}

export function citeLabel(articleNo, articles, law, skills = []) {
  const title = articles?.[articleNo]?.title;
  return title ? `${articleNo} ${maskTitle(title, law, skills.includes(articleNo))}` : articleNo;
}
