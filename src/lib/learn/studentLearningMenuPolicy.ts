import type { StudentOptionalMenu } from "@/contracts/studentLearningMenus.contract";

/** Optional-module paths only; exploration, authentication and shared assets keep their existing gates. */
export function studentOptionalMenuForPath(
  path: string,
): StudentOptionalMenu | null {
  const under = (base: string) => path === base || path.startsWith(`${base}/`);
  if (
    under("/learn/lectures") ||
    under("/learn/watch") ||
    under("/api/learn/lectures") ||
    path === "/api/learn/watch"
  )
    return "lectures";
  if (under("/q") || under("/learn/textbook") || under("/api/learn/textbook"))
    return "textbook";
  if (
    under("/learn/english-listening") ||
    under("/api/english/learn/listening")
  )
    return "english-listening";
  return null;
}

export function studentOptionalMenuAllowed(
  enabled: readonly StudentOptionalMenu[],
  path: string,
): boolean {
  const menu = studentOptionalMenuForPath(path);
  return menu === null || enabled.includes(menu);
}
