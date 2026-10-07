import { fadingEnabled } from "./enabled";

/**
 * 단기 재학습 대기열의 **쓰는 길**의 문 — 환경값 `MATH_FADING_RELEARN`.
 *
 * | 값            | 쓰는 길(증거 넣기 · 확인의 답 · 대조)                              |
 * | ------------- | ------------------------------------------------------------------ |
 * | `on`          | 열림 — 학생 기록의 `fading.relearn` 칸이 생긴다                    |
 * | (없음) · 그 밖 | **닫힘** — 대기열 읽기는 «꺼짐 · 빈 대기열»로 답하고, 행동은 404 다 |
 *
 * 🔴 값이 없으면 **닫힘**이다. 학생 기록의 꼴은 모르는 키를 거절한다 — `relearn` 칸을 **읽고 보존하는** 배포판(`11fdbf48d` 을 품은 main)이
 * 운영에 나가 자리 잡은 것을 확인한 뒤에만 연다. 연 뒤에는 그 배포판 앞으로 되돌리지 않는다(대기열이 생긴 학생의 기록 전체가 옛 코드에서 안 읽힌다).
 * 닫아도 이미 적힌 대기열은 지워지지 않는다(읽는 판이 그대로 보존한다) — 다시 열면 이어진다.
 * 학생 라우트의 문(`MATH_FADING`)이 `on` 이 아니면 늘 닫힘이다. 모르는 값도 닫힘이다(오타가 문을 열어 두지 않는다).
 * 서버 없이 도는 길(`createLocalFadingRelearnSource`)은 이 문을 보지 않는다 — 학생 기록에 쓰지 않는다.
 */
export function fadingRelearnEnabled(): boolean {
  return fadingEnabled() && process.env.MATH_FADING_RELEARN === "on";
}
