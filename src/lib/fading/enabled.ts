/**
 * «오늘의 기억» 새 앱의 서버 문 — 환경값 `MATH_FADING` 의 세 상태.
 *
 * | 값              | 열리는 것                                                                 |
 * | --------------- | ------------------------------------------------------------------------- |
 * | (없음) · `on`   | 전부 — 학생 라우트와 학생 화면까지(학생이 풀면 새 칸이 생긴다)            |
 * | `read`          | **읽기만** — 교사 현황의 읽기 둘. 학생 기록의 새 칸 `fading` 을 쓰지 않는다 |
 * | `off` · 그 밖   | 아무것도 — 학생 라우트 · 학생 화면 · 교사 현황이 전부 404 다              |
 *
 * 값이 없으면 **켜짐**이다(원장님 2026-10-06 «새 SRS 로 보이도록» — 그 전까지는 꺼짐이 기본이었다). 끄려면 `off`, 교사 읽기만 두려면 `read` 를 넣는다.
 * 모르는 값은 꺼짐이다(끄려다 낸 오타가 문을 열어 두지 않는다).
 *
 * 🔴 켜진 채로 «새 칸을 읽고 보존하는 배포판»(main `c77df4669`, 2026-10-06) 앞으로 되돌리면 새 칸이 생긴 학생의 기록 전체가 안 읽힌다 —
 * 학생 기록의 꼴은 모르는 키를 거절한다(`docs/planning/srs-overhaul-20261006.md` §13 · §14). 그보다 오래된 가지 · 작업본을 공유 DB 에 붙여 돌릴 때도 같다.
 * `read` 는 새 칸을 쓰지 않으므로 되돌려도 깨지는 기록이 없다.
 */
export type FadingGate = "off" | "read" | "on";

export function fadingGate(): FadingGate {
  const value = process.env.MATH_FADING;
  if (value === undefined || value === "" || value === "on") return "on";
  return value === "read" ? "read" : "off";
}

/** 학생 라우트와 학생 화면 — 새 칸을 쓰는 길이라 `on` 에서만 열린다. */
export function fadingEnabled(): boolean {
  return fadingGate() === "on";
}

/** 교사 현황의 읽기 — 새 칸을 쓰지 않으므로 `read` 에서도 열린다. */
export function fadingReadable(): boolean {
  return fadingGate() !== "off";
}
