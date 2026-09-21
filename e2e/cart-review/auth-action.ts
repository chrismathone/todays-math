/**
 * `@/app/actions/auth` 대역 — 서버 동작(next-auth)이다. 로그인 안 한 하네스라 계정 칸이 안 서서
 * 불리지 않는다. 진짜를 두면 vite 가 next 서버 모듈까지 끌어와 창에서 죽는다(`__dirname`).
 */
export async function signOutAction() {
  document.body.dataset.signedOut = "true";
}
