/**
 * `next-auth/react` 대역 — 수업 화면(`TeachingView`)이 가져다 쓰는데, 이 하네스는 그 메뉴를 안 연다.
 * 진짜를 두면 vite 가 next 서버 모듈까지 끌어와 창에서 죽는다(`__dirname`).
 */
export async function signIn() {
  return undefined;
}
export async function signOut() {
  return undefined;
}
