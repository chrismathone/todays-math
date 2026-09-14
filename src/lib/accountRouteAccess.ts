import type {
  AccountAccess,
  WorkspaceMenu,
} from "@/contracts/accountAccess.contract";

const under = (path: string, base: string) =>
  path === base || path.startsWith(`${base}/`);
export function accountRouteAllowed(
  account: AccountAccess,
  method: string,
  path: string,
): boolean {
  if (
    !["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(
      method,
    )
  )
    return false;
  if (
    under(path, "/api/auth") ||
    path === "/login" ||
    path === "/signup" ||
    path === "/approval-pending" ||
    under(path, "/api/account")
  )
    return true;
  if (account.approvalStatus !== "approved") return false;
  if (account.isAdmin) return true;
  if (under(path, "/admin") || under(path, "/api/admin")) return false;
  if (under(path, "/dev") || under(path, "/api/dev")) return false;
  const any = (...menus: WorkspaceMenu[]) =>
    menus.some((menu) => account.menus.includes(menu));
  if (path === "/" || path === "/studio") return true; // The shell filters its hash-based panels separately.
  if (under(path, "/api/library")) return any("library", "studio", "export");
  if (
    under(path, "/api/studio/ai") ||
    under(path, "/api/studio/pdf-worker") ||
    under(path, "/api/studio/pdf-assets")
  )
    return any("studio");
  if (path === "/api/studio/overview") return any("home", "teaching");
  if (under(path, "/api/problems/transform"))
    return any("bank") && any("studio");
  if (
    under(path, "/api/studio/teaching") ||
    [
      "/classes",
      "/api/classes",
      "/api/students",
      "/api/progress",
      "/api/scores",
      "/api/eywa-sync",
    ].some((base) => under(path, base))
  )
    return any("teaching");
  if (
    [
      "/api/studio/problems",
      "/api/problems",
      "/problems",
      "/review",
      "/api/review",
    ].some((base) => under(path, base))
  )
    return any("bank");
  if (
    [
      "/tests",
      "/exam",
      "/api/tests",
      "/api/basket",
      "/api/exports",
      "/api/exam",
      "/api/predictions",
    ].some((base) => under(path, base))
  )
    return any("export");
  if (path === "/api/metrics") return any("home");
  if (path === "/api/units") return any("bank", "studio", "teaching");
  if (under(path, "/api")) return false; // Newly added resource routes must declare their menu.
  return true; // Images/fonts and established static assets are not feature endpoints.
}
