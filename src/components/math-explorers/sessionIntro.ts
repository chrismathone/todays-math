import type { ExplorerState } from "@/contracts/mathExplorers.contract";

type Session = NonNullable<ExplorerState["session"]>;
export type SessionIntroKind = "memory" | "replay";

/**
 * «오늘 다시 만날 개념» 한 장을 둘 세션인가(원장님 2026-09-28, 05 §8.18 · D-143 ③).
 * 새 개념은 첫날 «뜻 만나기»로 만나지만 기억 복습 날 · 지난 학습 다시 풀기는 뜻 없이 바로 조립으로 들어간다 —
 * 그 두 세션의 **첫 활동 앞**에만 둔다. 오답 복습 · 남은 문제 다시 풀기 · 첫 활동 뒤에는 없다.
 * 화면만의 한 장이라 엔진(15활동 · 날짜 규칙)은 그대로다.
 */
export function sessionIntroKind(session: Session): SessionIntroKind | null {
  if (
    session.done ||
    session.index !== 0 ||
    session.round !== 0 ||
    session.continuation
  )
    return null;
  if (session.reviewOnly) return "replay";
  return session.route === "memory" ? "memory" : null;
}

/*
 * 한 세션에 한 번 — 시작을 누른 세션은 다시 안 보인다(첫 활동을 풀기 전에 나갔다가 이어하기로 들어와도).
 * 이 기기에만 남는 편의 표시라 저장소가 막히면(사생활 창 등) 조용히 «안 봄»으로 읽는다.
 */
const key = (sessionId: string) => `explorer-session-intro:${sessionId}`;
export function sessionIntroSeen(sessionId: string): boolean {
  try {
    return window.localStorage.getItem(key(sessionId)) === "1";
  } catch {
    return false;
  }
}
export function markSessionIntroSeen(sessionId: string) {
  try {
    window.localStorage.setItem(key(sessionId), "1");
  } catch {
    // 저장소가 막혀도 이번 화면은 넘어간다(부르는 쪽이 세션 id 를 기억한다).
  }
}
