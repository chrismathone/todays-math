/**
 * «오늘의 기억» 새 앱의 서버 문 — 환경값 `MATH_FADING` 의 세 상태.
 *
 * | 값     | 열리는 것                                                                 |
 * | ------ | ------------------------------------------------------------------------- |
 * | (없음) | 아무것도 — 학생 라우트 · 학생 화면 · 교사 현황이 전부 404 다              |
 * | `read` | **읽기만** — 교사 현황의 읽기 둘. 학생 기록의 새 칸 `fading` 을 쓰지 않는다 |
 * | `on`   | 전부 — 학생 라우트와 학생 화면까지(학생이 풀면 새 칸이 생긴다)            |
 *
 * 모르는 값은 꺼짐이다(오타가 문을 열지 않는다).
 *
 * 🔴 `on` 으로 켜는 것은 «새 칸을 읽고 보존하는 배포판»이 운영에 나가 있는 것을 확인한 **뒤**다. 학생 기록의 꼴은 모르는 키를 거절한다 —
 * 켠 채로 그 앞 배포판으로 되돌리면 새 칸이 생긴 학생의 기록 전체가 안 읽힌다(`docs/planning/srs-overhaul-20261006.md` §13 · §14).
 * `read` 는 그 «읽는 배포판»의 자리다 — 새 칸을 쓰지 않으므로 되돌려도 깨지는 기록이 없고, 공유 DB 에 붙은 개발 서버에서도 켤 수 있다.
 */
export type FadingGate = "off" | "read" | "on";

export function fadingGate(): FadingGate {
  const value = process.env.MATH_FADING;
  return value === "on" ? "on" : value === "read" ? "read" : "off";
}

/** 학생 라우트와 학생 화면 — 새 칸을 쓰는 길이라 `on` 에서만 열린다. */
export function fadingEnabled(): boolean {
  return fadingGate() === "on";
}

/** 교사 현황의 읽기 — 새 칸을 쓰지 않으므로 `read` 에서도 열린다. */
export function fadingReadable(): boolean {
  return fadingGate() !== "off";
}
