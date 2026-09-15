/**
 * 학원 날짜(KST, UTC+9) — **이 셈은 여기 한 곳에만 둔다** (learn-screens 보고서 §7-6 · D-128 ⑷ 리드).
 *
 * 🔴 「오늘」은 학원 시간이다 — 서버 시계의 UTC 자정이 아니다(KST 00:00~09:00 에는 UTC 날짜가 아직 어제다).
 * 한국은 서머타임이 없어 +9시간 고정이다(`metrics.ts` 가 SQL 경계에 `+09:00` 을 쓰는 것과 같은 전제).
 *
 * 부르는 곳: 원장님 «오늘의 개념» 판(`concept/adminService`) · 확인테스트(`api/tests/daily-review`) ·
 * 학생 목록(`components/learn/LectureList`) · 날짜 글자(`components/unified/conceptFormat`).
 * 네 곳이 같은 «+9시간»을 각자 적고 있었다 — 한쪽만 고쳐지면 원장님 판과 학생 목록의 «오늘»이 갈린다.
 * 다른 파일이 다시 적으면 `kstDate.test.ts` 가 운다.
 */
export const KST_OFFSET_MS = 9 * 3_600_000;

/** 그 시각의 학원 날짜(YYYY-MM-DD) */
export function kstDateOf(at: Date): string {
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}
