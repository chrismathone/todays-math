/** Published v15 design resources contain no manuscript, account data or answers. */
export const TEXTBOOK_EDITORIAL_IMAGES = [
  "cover.png",
  "u01.png",
  "u02.png",
  "u03.png",
  "u04.png",
  "u05.png",
  "u06.png",
  "learning-sprout.png",
] as const;

const publicPaths = new Set([
  ...TEXTBOOK_EDITORIAL_IMAGES.map((name) => `/textbook/editorial/${name}`),
  "/textbook/editorial/fonts/NotoSansKR-400.ttf",
  "/textbook/editorial/fonts/NotoSansKR-700.ttf",
  "/textbook/editorial/fonts/OFL.txt",
]);

export function isTextbookEditorialRead(
  method: string,
  pathname: string,
): boolean {
  return (method === "GET" || method === "HEAD") && publicPaths.has(pathname);
}
