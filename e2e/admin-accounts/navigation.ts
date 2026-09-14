export function useRouter() {
  return {
    replace: (path: string) => {
      document.body.dataset.destination = path;
    },
    refresh: () => {
      document.body.dataset.refreshed = "true";
    },
  };
}
export function redirect(path: string): never {
  throw new Error(`redirect:${path}`);
}
