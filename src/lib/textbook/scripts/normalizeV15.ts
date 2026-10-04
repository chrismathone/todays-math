/** Protect complete math tokens before removing legacy keyword wrappers. */
export function normalizeV15Text(text: string): string {
  const math: string[] = [];
  const protectedText = text.replace(
    /\[\[([\s\S]*?)\]\]/g,
    (_, tex: string) => {
      math.push(tex);
      return `\u0000MATH${math.length - 1}\u0000`;
    },
  );
  const keywords = protectedText.replace(/\{\{([^{}]*)\}\}/g, "**$1**");
  return keywords.replace(
    /\u0000MATH(\d+)\u0000/g,
    (_, index: string) => `$${math[Number(index)]}$`,
  );
}
