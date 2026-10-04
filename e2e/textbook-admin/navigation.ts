// This static fixture has no Next router. A requested route is recorded, not followed.
export function useRouter() {
  return {
    push: (path: string) => {
      document.body.dataset.destination = path;
    },
  };
}
