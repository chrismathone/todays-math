/**
 * 같은 문항류에서 **서로 다른** 변형 n개를 모은다.
 *
 * 숫자만 바뀌는데 답이 같거나 글자까지 같으면 변형이 아니다.
 *
 * ## 🔴 다름의 열쇠에 **그림이 들어간다** (2026-08-28)
 *
 * 종전 열쇠는 `content + answer` 뿐이었다. 그런데 초등 도형 문형은 발문·정답이
 * 같고 **그림만 다른** 것이 정상이다:
 *
 *     「그림에서 가, 나, 다 가운데 직각삼각형은 모두 몇 개인지 쓰시오.」
 *
 * 매번 다른 삼각형 셋이 나오지만 개수를 묻는 발문과 답은 겹칠 수 있다. 지면에서는
 * **완전히 다른 문항**인데 열쇠가 그림을 안 보니 「중복」으로 버렸다. 실측으로
 * 초등 문형 14개가 이 때문에 **2가지에 묶여** 있었다(넓히면 최대 91가지).
 * 중등은 1,337유형 중 5개만 뽑히는 변형이 달라지고, 전부 `[0,1,3] → [0,1,2]`
 * 처럼 **앞 변형이 되살아나는** 방향이다 — 고침이지 회귀가 아니다.
 *
 * ⚠️ 그림이 없는 문항은 열쇠가 종전과 **똑같다**(`null` 한 값이 붙을 뿐).
 *
 * ## 🔴 공간이 좁을 때 — 기본은 던지고, 부르는 쪽이 명시하면 있는 만큼 낸다
 *
 * 기본은 던진다. 조용히 모자란 세트를 「냈다」고 하지 않는다
 * (`generateMiddleSet` 과 같은 태도).
 *
 * 그런데 **진짜로 한 문항뿐인 문형**이 있다 — 「사다리꼴의 꼭짓점은 몇 개인가?」
 * 는 씨앗이 무엇이든 답이 `4` 다. 실측 초등 문형 30개가 그렇다. 그때 던지면
 * **그 단원이 통째로 적재 거부**가 된다(실측 6개 단원). 그래서 `allowShort` 를
 * 주면 있는 만큼 내고, **몇 개를 못 채웠는지 부르는 쪽이 반드시 보고**하게 한다.
 *
 * ⚠️ 이것은 **말없는 상한**이 될 수 있는 자리다. 그래서 두 가지를 함께 둔다 —
 *    ⑴ `shortBy` 를 돌려주어 부르는 쪽이 찍게 하고,
 *    ⑵ 「모자란 문형의 목록」을 시험이 못 박는다. 변할 수 있던 문형이 못 변하게
 *       되면 그 목록이 늘어나 빨개진다(`elemFormVariantSpace.test.ts`).
 */

export type CollectResult<T> = {
  items: T[];
  /** 요구한 수를 못 채운 만큼. 0 이면 다 채웠다. */
  shortBy: number;
};

/**
 * 다름의 열쇠 — 발문·정답·**그림**. 그림이 없으면 `null` 이 붙는다.
 *
 * 🔴 **내보낸다.** 적재기가 뒤에서 한 번 더 중복을 거르는데 그 열쇠가
 * `본문+정답` 뿐이었다 — 여기서 옳게 고른 «그림만 다른» 변형을 그쪽이 다시
 * 버렸다(실측 초등 문항류 16개). 「같은 규칙을 쓰는 자리가 둘이면 한 숫자를
 * 두 곳이 쓰게 하라」(2026-08-18). 옮겨 적지 말고 이것을 불러라.
 */
export function distinctKey(item: {
  content: string;
  answer: string;
  figureSpec?: unknown;
}): string {
  const spec = item.figureSpec;
  return `${item.content}\n${item.answer}\n${
    spec === undefined || spec === null ? "null" : JSON.stringify(spec)
  }`;
}

export function collectDistinctVariants<
  T extends { content: string; answer: string },
>(
  generate: (variant: number) => T,
  n: number,
  opts: { allowShort?: boolean } = {},
): T[] {
  return collectDistinctVariantsResult(generate, n, opts).items;
}

/** 위와 같되 **못 채운 수**를 함께 돌려준다 — 부르는 쪽이 찍어야 한다. */
export function collectDistinctVariantsResult<
  T extends { content: string; answer: string },
>(
  generate: (variant: number) => T,
  n: number,
  opts: { allowShort?: boolean } = {},
): CollectResult<T> {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`변형 개수가 이상합니다: ${n}`);
  }
  const out: T[] = [];
  const seen = new Set<string>();
  let variant = 0;
  const budget = n * 30;
  while (out.length < n) {
    if (variant > budget) {
      // 🔴 하나도 못 만든 것은 「공간이 좁다」가 아니라 **생성기가 죽은 것**이다.
      //    `allowShort` 여도 그건 던진다 — 조용히 0줄을 내면 그 문형은 다음 적재에서
      //    통째로 사라지고 아무 표시도 안 난다.
      if (opts.allowShort && out.length > 0) break;
      throw new Error(
        `변형 공간이 좁아 ${n}개를 못 채웠습니다 (${out.length}까지)`,
      );
    }
    const item = generate(variant);
    variant += 1;
    const key = distinctKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return { items: out, shortBy: n - out.length };
}

// ─────────────────────── 중복 제거 (변형 단위) ───────────────────────

/**
 * **한 변형의 두 형식을 같이 버리거나 같이 남긴다.**
 *
 * 판정은 그 변형의 **단답형 글자**로 한다. 객관식 본문에는 무작위 오답이 붙어
 * 있어서, 행마다 따로 물으면 **같은 문항인데 객관식만 안 겹친다** — 그러면
 * 단답형만 버려지고 객관식이 살아남아, 이 가드가 막으려던 바로 그 모양
 * (같은 문항이 다른 번호를 받음)이 된다. 실측 초등 문항류 **35개 · 짝 없는
 * 객관식 41행**이 그렇게 생겼다.
 *
 * @param keyOf   변형 대표(단답형)에서 «다름의 열쇠»를 뽑는다.
 * @param lookup  주면 **바깥**(DB)에 이미 있는지 묻는다. 안 주면 이 목록 **안**에서 견준다.
 */
export function dedupeByVariant<
  T extends { variantKey: string; questionType: string; origin: string },
>(
  rows: readonly T[],
  keyOf: (stem: T) => string,
  lookup?: (key: string) => string | undefined,
): { kept: T[]; dropped: { stem: T; against: string }[] } {
  const stemOf = new Map<string, T>();
  for (const r of rows)
    if (r.questionType === "단답형" || !stemOf.has(r.variantKey))
      stemOf.set(r.variantKey, r);
  const seen = new Map<string, string>();
  const droppedKeys = new Set<string>();
  const dropped: { stem: T; against: string }[] = [];
  for (const [variantKey, stem] of stemOf) {
    const key = keyOf(stem);
    const prior = lookup ? lookup(key) : seen.get(key);
    if (prior !== undefined) {
      droppedKeys.add(variantKey);
      dropped.push({ stem, against: prior });
      continue;
    }
    if (!lookup) seen.set(key, stem.origin);
  }
  return { kept: rows.filter((r) => !droppedKeys.has(r.variantKey)), dropped };
}
