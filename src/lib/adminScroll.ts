import { safeInternalReturn } from "./adminReturn";
const key = (href: string, branchId: string) => {
  const screen = safeInternalReturn(href, branchId);
  return screen ? `admin-scroll:${screen}` : null;
};
export function saveAdminScroll(href: string, branchId: string) {
  const storageKey = key(href, branchId);
  if (!storageKey) return;
  try {
    sessionStorage.setItem(storageKey, String(window.scrollY));
  } catch {
    /* Storage may be disabled. */
  }
}
export function restoreAdminScroll(href: string, branchId: string) {
  const storageKey = key(href, branchId);
  if (!storageKey) return;
  try {
    const value = sessionStorage.getItem(storageKey);
    if (value !== null && /^\d+(\.\d+)?$/.test(value))
      window.scrollTo({ top: Number(value), behavior: "instant" });
  } catch {
    /* Storage may be disabled. */
  }
}
