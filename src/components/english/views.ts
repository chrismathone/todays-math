/**
 * 오늘의 영어 — 뷰 셋의 id (D-148 · 25 §1.2). 셸(`UnifiedWorkspace`)과 뷰 뿌리(`EnglishStudio`)가 같이 쓴다.
 * React 를 모르는 작은 모듈이라 셸이 정적으로 불러도 영어 화면 묶음이 같이 실리지 않는다.
 * 권한은 메뉴 `english` **하나**를 본다 — 뷰 셋은 화면이 나눈 것이다.
 */
export const ENGLISH_VIEWS = [
  "english",
  "english-maker",
  "english-library",
] as const;
export type EnglishView = (typeof ENGLISH_VIEWS)[number];

export const isEnglishView = (value: string): value is EnglishView =>
  (ENGLISH_VIEWS as readonly string[]).includes(value);

/** 셸 알림 줄 — `role="status"` / `"alert"` (토스트 없음). 기본은 status */
export type EnglishNotice = (
  message: string,
  tone?: "status" | "alert",
) => void;
