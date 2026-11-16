// 전문 분야: Lv5에 한 번 고르는 특기입니다.
export const JOB_LEVEL = 5;
export const JOBS = {
  scholar: { name: '📚 법리파', desc: '전투마다 틀린 조문 보기 하나가 미리 지워집니다' },
  scout: { name: '🔦 현장파', desc: '30% 확률로 환영 여부를 바로 알아보고, 간파 실패 반격이 약해집니다' },
  talker: { name: '📣 협상파', desc: '전투 골드 1.3배, 반박에 막혔을 때 반격 피해 절반' },
};
export const canChooseJob = hero => hero.lv >= JOB_LEVEL && !hero.job;
export function chooseJob(hero, id) {
  return canChooseJob(hero) && Object.hasOwn(JOBS, id) ? { ...hero, job: id } : hero;
}
