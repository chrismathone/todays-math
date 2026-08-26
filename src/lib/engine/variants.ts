/**
 * 같은 문항류에서 **서로 다른** 변형 n개를 모은다.
 *
 * 숫자만 바뀌는데 답이 같거나 글자까지 같으면 변형이 아니다.
 * 공간이 좁아 n을 못 채우면 던진다 — 조용히 모자란 세트를 「냈다」고 하지 않는다
 * (`generateMiddleSet` 과 같은 태도).
 */
export function collectDistinctVariants<
  T extends { content: string; answer: string },
>(generate: (variant: number) => T, n: number): T[] {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`변형 개수가 이상합니다: ${n}`);
  }
  const out: T[] = [];
  const seen = new Set<string>();
  let variant = 0;
  const budget = n * 30;
  while (out.length < n) {
    if (variant > budget) {
      throw new Error(
        `변형 공간이 좁아 ${n}개를 못 채웠습니다 (${out.length}까지)`,
      );
    }
    const item = generate(variant);
    variant += 1;
    const key = `${item.content}\n${item.answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
