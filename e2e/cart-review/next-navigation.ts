/** `next/navigation` 대역 — 로그인 안 한 하네스라 권한 새로고침(`useWorkspaceAccess`)이 안 돈다. */
export function useRouter() {
  return {
    replace: (path: string) => {
      document.body.dataset.destination = path;
    },
    refresh: () => {},
  };
}
/** `next-auth` 이 가져다 쓴다(로그아웃 단추 모듈) — 로그인 안 한 하네스에서는 불리지 않는다. */
export function redirect(path: string): never {
  throw new Error(`redirect:${path}`);
}
