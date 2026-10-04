/**
 * 작업실이 교재 제작 화면을 떠나려 할 때 먼저 묻는 길 — 옆 메뉴 · 단축키 · 주소의 # · 뒤로가기처럼
 * 링크를 누르지 않고 화면을 바꾸는 이동이 여기를 지난다.
 *
 * 돌려주는 값이 true 면 막는 쪽이 없다 — 부른 쪽이 바로 이동한다.
 * false 면 교재 화면이 이동을 붙잡았다: 저장하지 않은 수정이 있으면 «저장 후 이동 · 버리고 이동 · 계속 편집»을 띄우고,
 * 저장이나 버리기가 **끝난 뒤에만** `proceed` 를 한 번 부른다. «계속 편집»이면 부르지 않는다.
 * 저장 · 조판이 도는 동안에는 붙잡기만 하고 `proceed` 를 부르지 않는다(끝난 뒤 다시 눌러야 한다).
 */
export const TEXTBOOK_BEFORE_LEAVE = "textbook-before-leave";

export type TextbookLeaveDetail = { proceed: () => void };

export function requestTextbookNavigation(proceed: () => void): boolean {
  return window.dispatchEvent(
    new CustomEvent<TextbookLeaveDetail>(TEXTBOOK_BEFORE_LEAVE, {
      cancelable: true,
      detail: { proceed },
    }),
  );
}
