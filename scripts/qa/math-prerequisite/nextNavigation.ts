const router = {
  replace: (url: string) => location.assign(url),
  push: (url: string) => location.assign(url),
  refresh: () => location.reload(),
  back: () => history.back(),
};
export const useRouter = () => router;
export const usePathname = () => location.pathname;
export const useSearchParams = () => new URLSearchParams(location.search);
